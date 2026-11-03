/**
 * 스트리밍에 필요한 응답 객체의 최소 형태.
 * express 타입에 의존하지 않도록 쓰는 것만 선언합니다
 * (auth/authed-request.ts 와 같은 방식).
 */
export interface StreamingResponse {
  setHeader(name: string, value: string): void;
  write(chunk: string): boolean;
  end(): void;
  flushHeaders?(): void;
}

/**
 * 이벤트를 NDJSON(한 줄에 JSON 하나)으로 흘려보냅니다.
 *
 * SSE 대신 NDJSON 을 쓰는 이유: 본문(마크다운)에 줄바꿈이 많은데 SSE 는
 * 줄바꿈을 프레임 구분자로 씁니다. JSON 한 줄이면 줄바꿈이 자동으로
 * escape 되고 클라이언트 파싱도 단순합니다.
 *
 * ⚠️ 이 함수를 호출하면 헤더가 전송되므로 **그 뒤로는 HTTP 상태 코드를
 * 바꿀 수 없습니다.** 404/503 처럼 상태로 알려야 하는 실패는 호출 전에
 * 끝내고, 이후 발생한 오류는 이벤트로 내려보내세요.
 */
export async function streamNdjson<T>(
  res: StreamingResponse,
  events: AsyncIterable<T>,
): Promise<void> {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  // no-transform: 프록시가 버퍼링해서 스트리밍이 끊기는 걸 막습니다.
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  for await (const event of events) {
    res.write(`${JSON.stringify(event)}\n`);
  }
  res.end();
}
