import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Document, Review } from '@ppp/db';
import { CLAUDE_MODEL, ClaudeService } from '../claude/claude.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from './review-prompt.js';

/** 스트리밍 중 클라이언트로 내려보내는 이벤트 (NDJSON 한 줄씩) */
export type ReviewEvent =
  | { type: 'text'; text: string }
  | { type: 'done'; reviewId: string }
  | { type: 'error'; message: string };

/**
 * 생각(thinking)까지 담을 여유를 둡니다. Claude Opus 5 는 사고가 기본으로
 * 켜져 있고 max_tokens 가 **사고 + 응답 합계** 를 제한하기 때문에,
 * 응답 길이만 보고 잡으면 답이 중간에 끊깁니다.
 */
const MAX_TOKENS = 16000;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claude: ClaudeService,
    private readonly documents: DocumentsService,
  ) {}

  /**
   * 해당 문서의 첨삭 이력.
   *
   * feedback 을 그대로 싣습니다 — 문서 1건당 첨삭은 많아도 몇 건이고,
   * 목록에서 바로 펼쳐 보여주려면 추가 요청 없이 받는 게 단순합니다.
   */
  listForDocument(userId: string, documentId: string): Promise<Review[]> {
    return this.prisma.client.review.findMany({
      where: { userId, documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    // 남의 첨삭은 "없음" 으로 응답합니다 (403 은 존재를 알려줍니다).
    const review = await this.prisma.client.review.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException('첨삭을 찾을 수 없습니다.');
    }
    await this.prisma.client.review.delete({ where: { id: review.id } });
  }

  /**
   * 스트리밍 전 사전 점검.
   *
   * 응답 본문을 흘려보내기 **시작하면** HTTP 상태 코드를 더 이상 바꿀 수
   * 없습니다. 그래서 소유권 확인과 API 키 확인은 여기서 먼저 하고,
   * 실패하면 평범한 404/503 으로 끝냅니다.
   */
  async prepare(userId: string, documentId: string): Promise<Document> {
    const document = await this.documents.findOne(userId, documentId);
    this.claude.getClient(); // 키가 없으면 여기서 503

    return document;
  }

  /** 첨삭을 생성하면서 조각을 흘려보내고, 끝나면 저장합니다. */
  async *stream(
    userId: string,
    document: Document,
  ): AsyncGenerator<ReviewEvent> {
    const client = this.claude.getClient();
    let full = '';

    try {
      const stream = client.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: buildReviewSystemPrompt(document.kind),
        messages: [{ role: 'user', content: buildReviewUserPrompt(document) }],
      });

      for await (const event of stream) {
        // thinking_delta 는 흘려보내지 않습니다 — 사용자에게 보여줄 내용이 아닙니다.
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          full += event.delta.text;
          yield { type: 'text', text: event.delta.text };
        }
      }

      const message = await stream.finalMessage();

      // 안전 분류기가 거절하면 content 가 비거나 잘립니다. 먼저 확인합니다.
      if (message.stop_reason === 'refusal') {
        yield {
          type: 'error',
          message:
            '모델이 이 문서에 대한 응답을 거절했습니다. 내용을 확인하고 다시 시도해 주세요.',
        };
        return;
      }

      if (!full.trim()) {
        yield { type: 'error', message: '첨삭 내용이 비어 있습니다.' };
        return;
      }

      const review = await this.prisma.client.review.create({
        data: {
          userId,
          documentId: document.id,
          feedback: full,
          model: CLAUDE_MODEL,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      });

      yield { type: 'done', reviewId: review.id };
    } catch (cause) {
      // 이미 헤더를 보냈으므로 HTTP 에러로 바꿀 수 없습니다. 이벤트로 알립니다.
      const message = cause instanceof Error ? cause.message : String(cause);
      this.logger.error(`첨삭 생성 실패 (document=${document.id}): ${message}`);
      yield { type: 'error', message };
    }
  }
}
