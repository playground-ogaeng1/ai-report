import { LogBuffer, normalizePath } from './log-buffer.js';

type RequestInput = Parameters<LogBuffer['pushRequest']>[0];

/**
 * 반환 타입을 명시하는 이유: `Partial` 을 스프레드하면 추론 타입에
 * `undefined` 가 섞여서 호출부에서 할당 오류가 납니다.
 */
function makeRequest(overrides: Partial<RequestInput> = {}): RequestInput {
  return {
    method: 'GET',
    path: '/documents',
    status: 200,
    durationMs: 10,
    userId: 'user_1',
    userEmail: 'me@example.com',
    error: null,
    ...overrides,
  };
}

describe('normalizePath', () => {
  it('cuid 를 :id 로 바꾼다', () => {
    expect(normalizePath('/documents/cmvz76ly70000dovsfkvg2mvv')).toBe(
      '/documents/:id',
    );
  });

  it('UUID 를 :id 로 바꾼다', () => {
    expect(
      normalizePath('/interviews/b90e9bda-e0b8-462c-ab8c-1e00cae87964/messages'),
    ).toBe('/interviews/:id/messages');
  });

  it('일반 경로는 그대로 둔다', () => {
    expect(normalizePath('/documents/upload')).toBe('/documents/upload');
    expect(normalizePath('/me')).toBe('/me');
  });
});

describe('LogBuffer — 요청 기록', () => {
  it('최신순으로 돌려준다', () => {
    const buffer = new LogBuffer();
    buffer.pushRequest(makeRequest({ path: '/first' }));
    buffer.pushRequest(makeRequest({ path: '/second' }));

    expect(buffer.recentRequests(10).map((r) => r.path)).toEqual([
      '/second',
      '/first',
    ]);
  });

  it('limit 을 넘으면 최신 것만 준다', () => {
    const buffer = new LogBuffer();
    for (let i = 0; i < 5; i++) buffer.pushRequest(makeRequest({ durationMs: i }));

    expect(buffer.recentRequests(2)).toHaveLength(2);
  });

  it('상한을 넘으면 오래된 것부터 버린다 — 메모리가 무한히 늘지 않아야 한다', () => {
    const buffer = new LogBuffer();
    for (let i = 0; i < 600; i++) buffer.pushRequest(makeRequest());

    expect(buffer.counts().requests).toBeLessThanOrEqual(500);
  });

  it('긴 에러 메시지는 잘라서 담는다', () => {
    const buffer = new LogBuffer();
    buffer.pushRequest(makeRequest({ error: 'x'.repeat(5_000) }));

    const entry = buffer.recentRequests(1)[0]!;
    expect(entry.error!.length).toBeLessThan(1_000);
  });
});

describe('LogBuffer — 로그', () => {
  it('레벨로 걸러낼 수 있다', () => {
    const buffer = new LogBuffer();
    buffer.pushLog('log', '보통', 'A');
    buffer.pushLog('error', '에러', 'B');
    buffer.pushLog('log', '보통2', 'A');

    expect(buffer.recentLogs(10, 'error').map((l) => l.message)).toEqual([
      '에러',
    ]);
    expect(buffer.recentLogs(10)).toHaveLength(3);
  });

  it('상한을 넘으면 오래된 것부터 버린다', () => {
    const buffer = new LogBuffer();
    for (let i = 0; i < 1_200; i++) buffer.pushLog('log', `m${i}`, null);

    expect(buffer.counts().logs).toBeLessThanOrEqual(1_000);
  });
});

describe('LogBuffer — 엔드포인트 집계', () => {
  it('ID 가 다른 같은 엔드포인트를 하나로 묶는다', () => {
    const buffer = new LogBuffer();
    buffer.pushRequest(makeRequest({ path: '/documents/cmvzaaaaaaaaaaaaaaaaaaaa' }));
    buffer.pushRequest(makeRequest({ path: '/documents/cmvzbbbbbbbbbbbbbbbbbbbb' }));

    const stats = buffer.endpointStats();
    expect(stats).toHaveLength(1);
    expect(stats[0]!.key).toBe('GET /documents/:id');
    expect(stats[0]!.count).toBe(2);
  });

  it('에러 수와 소요시간을 집계한다', () => {
    const buffer = new LogBuffer();
    buffer.pushRequest(makeRequest({ durationMs: 10, status: 200 }));
    buffer.pushRequest(makeRequest({ durationMs: 30, status: 500 }));
    buffer.pushRequest(makeRequest({ durationMs: 20, status: 404 }));

    const stat = buffer.endpointStats()[0]!;
    expect(stat.count).toBe(3);
    expect(stat.errorCount).toBe(2); // 4xx·5xx
    expect(stat.avgMs).toBe(20);
    expect(stat.maxMs).toBe(30);
  });

  it('호출이 많은 엔드포인트가 먼저 온다', () => {
    const buffer = new LogBuffer();
    buffer.pushRequest(makeRequest({ path: '/rare' }));
    for (let i = 0; i < 3; i++) buffer.pushRequest(makeRequest({ path: '/hot' }));

    expect(buffer.endpointStats()[0]!.key).toBe('GET /hot');
  });

  it('메서드가 다르면 따로 집계한다', () => {
    const buffer = new LogBuffer();
    buffer.pushRequest(makeRequest({ method: 'GET', path: '/documents' }));
    buffer.pushRequest(makeRequest({ method: 'POST', path: '/documents' }));

    expect(buffer.endpointStats()).toHaveLength(2);
  });
});
