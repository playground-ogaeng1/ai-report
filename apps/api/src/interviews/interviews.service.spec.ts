import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InterviewStatus, MessageRole } from '@ppp/db';
import { InterviewsService } from './interviews.service.js';

type FakeMessage = { id: string; role: MessageRole; content: string };

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sesn_1',
    userId: 'user_1',
    documentId: null,
    title: '면접',
    status: InterviewStatus.ACTIVE,
    difficulty: 'NORMAL',
    summary: null,
    messages: [] as FakeMessage[],
    ...overrides,
  };
}

function makeService(session: unknown) {
  const prisma = {
    client: {
      interviewSession: {
        findFirst: vi.fn().mockResolvedValue(session),
        delete: vi.fn().mockResolvedValue({}),
      },
      message: {
        // id 는 Prisma 가 만들어 주므로 create 의 data 에는 없습니다.
        create: vi.fn(({ data }: { data: Omit<FakeMessage, 'id'> }) =>
          Promise.resolve({ id: 'msg_new', ...data }),
        ),
      },
    },
  };
  const claude = { getClient: vi.fn(() => ({})) };
  const documents = { findOne: vi.fn().mockResolvedValue({ id: 'doc_1' }) };
  const profiles = { ensureProfile: vi.fn() };

  const service = new InterviewsService(
    prisma as never,
    claude as never,
    documents as never,
    profiles as never,
  );

  return { service, prisma, claude, documents };
}

describe('InterviewsService.findOne', () => {
  it('남의 면접은 404 — 403 을 주면 그 ID 가 있다는 사실이 새어 나간다', async () => {
    const { service } = makeService(null);

    await expect(service.findOne('user_1', 'sesn_1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('조회는 항상 userId 조건을 함께 건다', async () => {
    const { service, prisma } = makeService(makeSession());

    await service.findOne('user_1', 'sesn_1');

    expect(prisma.client.interviewSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sesn_1', userId: 'user_1' },
      }),
    );
  });
});

describe('InterviewsService.prepareTurn', () => {
  it('종료된 면접에는 더 보낼 수 없다', async () => {
    const { service } = makeService(
      makeSession({ status: InterviewStatus.COMPLETED }),
    );

    await expect(service.prepareTurn('user_1', 'sesn_1', '답변')).rejects.toThrow(
      ConflictException,
    );
  });

  it('대화가 상한에 닿으면 총평을 받으라고 안내한다', async () => {
    const messages = Array.from({ length: 80 }, (_, index) => ({
      id: `m${index}`,
      role: index % 2 === 0 ? MessageRole.ASSISTANT : MessageRole.USER,
      content: 'x',
    }));
    const { service } = makeService(makeSession({ messages }));

    await expect(
      service.prepareTurn('user_1', 'sesn_1', '답변'),
    ).rejects.toThrow(/총평/);
  });

  it('면접관 질문 뒤에 답변 없이 호출하면 거부한다', async () => {
    // 그대로 보내면 assistant 턴이 연속되어 Messages API 가 400 을 냅니다.
    const { service } = makeService(
      makeSession({
        messages: [
          { id: 'm1', role: MessageRole.ASSISTANT, content: '질문입니다' },
        ],
      }),
    );

    await expect(service.prepareTurn('user_1', 'sesn_1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('대화가 없으면 답변 없이도 통과한다 — 첫 질문을 받는 경로', async () => {
    const { service, prisma } = makeService(makeSession());

    const { session } = await service.prepareTurn('user_1', 'sesn_1');

    expect(session.messages).toHaveLength(0);
    expect(prisma.client.message.create).not.toHaveBeenCalled();
  });

  it('마지막이 지원자 답변이면 답변 없이도 통과한다 — 실패 후 재시도 경로', async () => {
    const { service } = makeService(
      makeSession({
        messages: [{ id: 'm1', role: MessageRole.USER, content: '답변' }],
      }),
    );

    await expect(service.prepareTurn('user_1', 'sesn_1')).resolves.toBeDefined();
  });

  it('답변은 모델 호출 전에 저장한다 — 실패해도 사용자가 쓴 글이 남아야 한다', async () => {
    const { service, prisma } = makeService(
      makeSession({
        messages: [{ id: 'm1', role: MessageRole.ASSISTANT, content: '질문' }],
      }),
    );

    const { session } = await service.prepareTurn('user_1', 'sesn_1', '제 답변');

    expect(prisma.client.message.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'sesn_1',
        role: MessageRole.USER,
        content: '제 답변',
      },
    });
    // 저장한 답변이 이번 턴의 컨텍스트에 포함되어야 합니다.
    expect(session.messages.at(-1)).toMatchObject({ content: '제 답변' });
  });

  it('API 키가 없으면 스트리밍을 시작하기 전에 실패한다', async () => {
    const { service, claude } = makeService(makeSession());
    claude.getClient.mockImplementation(() => {
      throw new Error('키 없음');
    });

    await expect(service.prepareTurn('user_1', 'sesn_1')).rejects.toThrow(
      '키 없음',
    );
  });

  it('문서를 지정한 세션은 문서 소유권도 확인한다', async () => {
    const { service, documents } = makeService(
      makeSession({ documentId: 'doc_1' }),
    );

    const { document } = await service.prepareTurn('user_1', 'sesn_1');

    expect(documents.findOne).toHaveBeenCalledWith('user_1', 'doc_1');
    expect(document).toEqual({ id: 'doc_1' });
  });
});

describe('InterviewsService.prepareSummary', () => {
  it('대화가 거의 없으면 총평을 만들지 않는다', async () => {
    const { service } = makeService(
      makeSession({
        messages: [{ id: 'm1', role: MessageRole.ASSISTANT, content: '질문' }],
      }),
    );

    await expect(service.prepareSummary('user_1', 'sesn_1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('질문·답변이 한 쌍이라도 있으면 통과한다', async () => {
    const { service } = makeService(
      makeSession({
        messages: [
          { id: 'm1', role: MessageRole.ASSISTANT, content: '질문' },
          { id: 'm2', role: MessageRole.USER, content: '답변' },
        ],
      }),
    );

    await expect(
      service.prepareSummary('user_1', 'sesn_1'),
    ).resolves.toBeDefined();
  });
});
