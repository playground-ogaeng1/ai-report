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
 * 아무 이벤트도 없는 동안 연결을 살려 두기 위해 ping 을 보내는 간격.
 * Render 의 SSE 가이드가 권하는 30초보다 짧게 둡니다.
 */
const KEEPALIVE_MS = 15_000;

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

  // 모델이 "사고" 하는 동안에는 내려보낼 텍스트가 없습니다 — reviews/interviews
  // 서비스가 thinking_delta 를 의도적으로 흘려보내지 않기 때문입니다. 첫 글자가
  // 나오기까지 응답에 바이트가 0개 나가는데, 그 침묵이 길어지면 중간 프록시가
  // 유휴 연결로 보고 끊습니다. 주기적으로 한 줄 보내 그걸 막습니다.
  //
  // 클라이언트는 손댈 필요가 없습니다 — use-stream-text 의 switch 에 default 가
  // 없어서 모르는 타입은 그냥 무시됩니다.
  const keepalive = setInterval(() => {
    res.write('{"type":"ping"}\n');
  }, KEEPALIVE_MS);

  try {
    for await (const event of events) {
      res.write(`${JSON.stringify(event)}\n`);
    }
  } finally {
    // 순서가 중요합니다 — end() 뒤에 write 가 호출되면 터집니다.
    clearInterval(keepalive);
    res.end();
  }
}
