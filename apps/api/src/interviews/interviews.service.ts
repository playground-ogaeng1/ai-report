import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InterviewStatus,
  MessageRole,
  type Document,
  type InterviewSession,
  type Message,
} from '@ppp/db';
import type { AuthUser } from '../auth/authed-request.js';
import { ProfileService } from '../auth/profile.service.js';
import { CLAUDE_MODEL, ClaudeService } from '../claude/claude.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateInterviewDto } from './dto/interview.dto.js';
import {
  buildInterviewSystemPrompt,
  buildKickoffMessage,
  buildSummarySystemPrompt,
  KICKOFF_MESSAGE,
  pickOpeningAngle,
  QUESTION_CLOSE,
  visibleQuestionText,
} from './interview-prompt.js';

export type InterviewEvent =
  | { type: 'text'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export type InterviewListItem = Pick<
  InterviewSession,
  | 'id'
  | 'title'
  | 'status'
  | 'difficulty'
  | 'documentId'
  | 'createdAt'
  | 'updatedAt'
>;

export type InterviewDetail = InterviewSession & { messages: Message[] };

const LIST_FIELDS = {
  id: true,
  title: true,
  status: true,
  difficulty: true,
  documentId: true,
  createdAt: true,
  updatedAt: true,
};

/** 질문 1개 + 답변 1개 = 2건. 40턴이면 실제 면접보다 이미 깁니다. */
const MAX_MESSAGES = 80;

/** 면접관 턴은 짧습니다. 사고 토큰까지 감안해도 넉넉합니다. */
const TURN_MAX_TOKENS = 4000;

/**
 * 면접관이 지원자 답변까지 혼자 써 내려가는 걸 끊는 **하드 백스톱**.
 *
 * 프롬프트로도 금지하지만(`buildInterviewSystemPrompt`) 프롬프트는 확률이고
 * 정지 문자열은 확정입니다. 모델이 턴을 닫는 순간 생성이 멈추므로 뒤를
 * 이어 쓸 방법이 없습니다.
 *
 * `QUESTION_CLOSE` 가 본체입니다. 화자 표시는 **덤** 으로만 둡니다 —
 * 실제로 터진 출력은 `지원자:` 같은 라벨 없이 평문으로 답변을 이어 썼고,
 * 라벨만 막아 둔 동안에는 한 번도 발동하지 않았습니다.
 */
const TURN_STOP_SEQUENCES = [
  QUESTION_CLOSE,
  '\n지원자:',
  '\n면접관:',
  '\nA.',
  '\nA:',
];

/** 총평은 첨삭과 비슷한 분량입니다. */
const SUMMARY_MAX_TOKENS = 16000;

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claude: ClaudeService,
    private readonly documents: DocumentsService,
    private readonly profiles: ProfileService,
  ) {}

  list(userId: string): Promise<InterviewListItem[]> {
    return this.prisma.client.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: LIST_FIELDS,
    });
  }

  /** 남의 세션은 "없음" 으로 응답합니다 (403 은 존재를 알려줍니다). */
  async findOne(userId: string, id: string): Promise<InterviewDetail> {
    const session = await this.prisma.client.interviewSession.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      throw new NotFoundException('면접을 찾을 수 없습니다.');
    }
    return session;
  }

  async create(
    user: AuthUser,
    dto: CreateInterviewDto,
  ): Promise<InterviewSession> {
    await this.profiles.ensureProfile(user);

    // 문서를 지정했으면 내 것인지 확인합니다 (findOne 이 404 를 던집니다).
    if (dto.documentId) {
      await this.documents.findOne(user.id, dto.documentId);
    }

    return this.prisma.client.interviewSession.create({
      data: {
        userId: user.id,
        documentId: dto.documentId ?? null,
        title: dto.title,
        difficulty: dto.difficulty,
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const session = await this.findOne(userId, id);
    // messages 는 onDelete: Cascade 로 함께 지워집니다.
    await this.prisma.client.interviewSession.delete({
      where: { id: session.id },
    });
  }

  /**
   * 턴 생성 전 사전 점검 + 답변 저장.
   *
   * 스트리밍을 시작하면 HTTP 상태를 못 바꾸므로 여기서 모두 끝냅니다.
   * 답변은 모델 호출 **전에** 저장합니다 — 호출이 실패해도 사용자가 쓴 글이
   * 날아가지 않고, content 없이 다시 호출해 재시도할 수 있습니다.
   */
  async prepareTurn(
    userId: string,
    id: string,
    content?: string,
  ): Promise<{ session: InterviewDetail; document: Document | null }> {
    const session = await this.findOne(userId, id);

    if (session.status === InterviewStatus.COMPLETED) {
      throw new ConflictException('이미 종료된 면접입니다.');
    }
    if (session.messages.length >= MAX_MESSAGES) {
      throw new BadRequestException(
        '대화가 너무 길어졌습니다. 면접을 종료하고 총평을 받아보세요.',
      );
    }

    const last = session.messages.at(-1);
    if (!content && last?.role === MessageRole.ASSISTANT) {
      throw new BadRequestException('답변을 입력해 주세요.');
    }

    this.claude.getClient(); // 키가 없으면 여기서 503

    if (content) {
      const saved = await this.prisma.client.message.create({
        data: { sessionId: session.id, role: MessageRole.USER, content },
      });
      session.messages.push(saved);
    }

    const document = session.documentId
      ? await this.documents.findOne(userId, session.documentId)
      : null;

    return { session, document };
  }

  /** 면접관의 다음 질문을 흘려보내고, 끝나면 저장합니다. */
  async *streamTurn(
    session: InterviewDetail,
    document: Document | null,
  ): AsyncGenerator<InterviewEvent> {
    const client = this.claude.getClient();
    let full = '';

    try {
      const stream = client.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: TURN_MAX_TOKENS,
        // 지원자 답변을 혼자 이어 쓰기 시작하면 여기서 끊습니다.
        stop_sequences: TURN_STOP_SEQUENCES,
        // 시스템 프롬프트에 문서 전문이 들어가고 매 턴 다시 보내므로
        // 캐시를 걸어 둡니다. 두 번째 턴부터 입력 비용이 크게 줄어듭니다.
        system: [
          {
            type: 'text',
            text: buildInterviewSystemPrompt(session.difficulty, document),
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          // Messages API 는 첫 메시지가 user 여야 합니다. 저장된 첫 메시지는
          // 면접관(assistant)이므로 고정 문구를 맨 앞에 끼웁니다.
          //
          // 첫 턴에만 "시작 각도" 를 함께 실어 보냅니다 — Opus 5 는 temperature
          // 가 없어서, 같은 문서로 다시 면접을 보면 첫 질문이 똑같아집니다.
          {
            role: 'user',
            content:
              session.messages.length === 0
                ? buildKickoffMessage(pickOpeningAngle(document !== null))
                : KICKOFF_MESSAGE,
          },
          ...session.messages.map((message) => ({
            role:
              message.role === MessageRole.USER
                ? ('user' as const)
                : ('assistant' as const),
            content: message.content,
          })),
        ],
      });

      // 원문(태그 포함)과 이미 내려보낸 글자 수를 따로 셉니다. 태그가 델타
      // 경계에서 쪼개져 오므로 조각을 그대로 흘려보낼 수 없습니다.
      let raw = '';
      let sent = 0;

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          raw += event.delta.text;

          // 태그가 완성되기 전에는 보류되므로 길이가 제자리거나 줄 수 있습니다.
          const shown = visibleQuestionText(raw);
          if (shown.length > sent) {
            yield { type: 'text', text: shown.slice(sent) };
            sent = shown.length;
          }
        }
      }

      full = visibleQuestionText(raw).trim();

      const message = await stream.finalMessage();

      if (message.stop_reason === 'refusal') {
        yield {
          type: 'error',
          message: '모델이 응답을 거절했습니다. 답변을 바꿔 다시 시도해 주세요.',
        };
        return;
      }
      if (!full) {
        yield { type: 'error', message: '면접관 응답이 비어 있습니다.' };
        return;
      }

      await this.prisma.client.message.create({
        data: {
          sessionId: session.id,
          role: MessageRole.ASSISTANT,
          // 태그를 떼고 trim 까지 끝난 값입니다 (visibleQuestionText).
          content: full,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      });

      yield { type: 'done' };
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : String(cause);
      this.logger.error(`면접 턴 생성 실패 (session=${session.id}): ${text}`);
      yield { type: 'error', message: text };
    }
  }

  async prepareSummary(userId: string, id: string): Promise<InterviewDetail> {
    const session = await this.findOne(userId, id);

    if (session.messages.length < 2) {
      throw new BadRequestException(
        '아직 대화가 없습니다. 질문에 한 번이라도 답한 뒤 총평을 받아보세요.',
      );
    }
    this.claude.getClient();

    return session;
  }

  /** 총평을 흘려보내고, 끝나면 세션에 저장하며 상태를 COMPLETED 로 바꿉니다. */
  async *streamSummary(
    session: InterviewDetail,
  ): AsyncGenerator<InterviewEvent> {
    const client = this.claude.getClient();
    let full = '';

    try {
      const transcript = session.messages
        .map(
          (message) =>
            `${message.role === MessageRole.USER ? '지원자' : '면접관'}: ${message.content}`,
        )
        .join('\n\n');

      const stream = client.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: SUMMARY_MAX_TOKENS,
        system: buildSummarySystemPrompt(session.difficulty),
        messages: [
          {
            role: 'user',
            content: `다음은 모의 면접 전체 대화입니다. 총평을 작성해 주세요.\n\n---\n${transcript}\n---`,
          },
        ],
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          full += event.delta.text;
          yield { type: 'text', text: event.delta.text };
        }
      }

      const message = await stream.finalMessage();

      if (message.stop_reason === 'refusal') {
        yield { type: 'error', message: '모델이 총평 작성을 거절했습니다.' };
        return;
      }
      if (!full.trim()) {
        yield { type: 'error', message: '총평이 비어 있습니다.' };
        return;
      }

      await this.prisma.client.interviewSession.update({
        where: { id: session.id },
        data: { summary: full, status: InterviewStatus.COMPLETED },
      });

      yield { type: 'done' };
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : String(cause);
      this.logger.error(`총평 생성 실패 (session=${session.id}): ${text}`);
      yield { type: 'error', message: text };
    }
  }
}
