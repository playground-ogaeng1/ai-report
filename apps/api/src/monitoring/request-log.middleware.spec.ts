import { logBuffer } from './log-buffer.js';
import {
  type LoggableRequest,
  type LoggableResponse,
  RequestLogMiddleware,
} from './request-log.middleware.js';

/** `finish` 를 수동으로 터뜨릴 수 있는 가짜 응답 */
function makeResponse(statusCode: number) {
  const listeners: (() => void)[] = [];

  const response: LoggableResponse = {
    statusCode,
    on: (_event, listener) => {
      listeners.push(listener);
      return response;
    },
  };

  return { response, finish: () => listeners.forEach((fn) => fn()) };
}

/** 미들웨어는 모듈 싱글턴 버퍼에 담으므로 마지막 기록을 읽어 확인합니다. */
function lastRequest() {
  return logBuffer.recentRequests(1)[0]!;
}

const USER = {
  id: 'user_1',
  email: 'me@example.com',
  name: '오경민',
  image: null,
};

describe('RequestLogMiddleware', () => {
  const middleware = new RequestLogMiddleware();

  it('next() 를 즉시 호출한다 — 응답을 지연시키면 안 된다', () => {
    const { response } = makeResponse(200);
    const next = vi.fn();

    middleware.use({ method: 'GET', originalUrl: '/me' }, response, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('응답이 끝난 뒤에 기록한다 — 그 시점에야 최종 상태를 알 수 있다', () => {
    const { response, finish } = makeResponse(201);
    const before = logBuffer.counts().requests;

    middleware.use({ method: 'POST', originalUrl: '/documents' }, response, () => {});
    // 아직 응답이 끝나지 않았으므로 기록이 없어야 합니다.
    expect(logBuffer.counts().requests).toBe(before);

    finish();

    const entry = lastRequest();
    expect(entry.method).toBe('POST');
    expect(entry.path).toBe('/documents');
    expect(entry.status).toBe(201);
  });

  it('가드가 채운 호출자 정보를 담는다', () => {
    const { response, finish } = makeResponse(200);
    const request: LoggableRequest = { method: 'GET', originalUrl: '/me' };

    middleware.use(request, response, () => {});
    // 미들웨어 → 가드 순서이므로, 미들웨어가 돈 뒤에 가드가 user 를 채웁니다.
    request.user = USER;
    finish();

    const entry = lastRequest();
    expect(entry.userId).toBe('user_1');
    expect(entry.userEmail).toBe('me@example.com');
  });

  it('인증 실패 요청도 기록한다 — 인터셉터로는 못 잡던 부분', () => {
    const { response, finish } = makeResponse(401);

    // 가드가 거절하면 user 가 채워지지 않습니다.
    middleware.use({ method: 'GET', originalUrl: '/admin/stats' }, response, () => {});
    finish();

    const entry = lastRequest();
    expect(entry.status).toBe(401);
    expect(entry.path).toBe('/admin/stats');
    expect(entry.userId).toBeNull();
    expect(entry.userEmail).toBeNull();
  });

  it('예외 필터가 얹은 메시지를 담는다', () => {
    const { response, finish } = makeResponse(404);
    const request: LoggableRequest = {
      method: 'GET',
      originalUrl: '/documents/x',
    };

    middleware.use(request, response, () => {});
    request.loggedErrorMessage = '문서를 찾을 수 없습니다.';
    finish();

    expect(lastRequest().error).toBe('문서를 찾을 수 없습니다.');
  });

  it('쿼리스트링은 떼어낸다 — 값에 개인정보가 섞일 수 있다', () => {
    const { response, finish } = makeResponse(200);

    middleware.use(
      { method: 'GET', originalUrl: '/admin/logs?level=error&limit=50' },
      response,
      () => {},
    );
    finish();

    expect(lastRequest().path).toBe('/admin/logs');
  });

  it('소요시간을 담는다', () => {
    const { response, finish } = makeResponse(200);

    middleware.use({ method: 'GET', originalUrl: '/health' }, response, () => {});
    finish();

    expect(lastRequest().durationMs).toBeGreaterThanOrEqual(0);
  });
});
