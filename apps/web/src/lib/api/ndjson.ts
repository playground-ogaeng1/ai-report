/**
 * NDJSON(한 줄에 JSON 하나) 스트림 파서.
 *
 * `apiStream` 에서 분리해 둔 이유는 **청크 경계 처리가 버그 나기 쉬운 곳**
 * 이어서입니다. 네트워크 청크는 줄 중간을 자르므로 완성된 줄만 꺼내고
 * 나머지는 버퍼에 남겨야 합니다. fetch 없이 단독으로 테스트할 수 있게
 * ReadableStream 만 받습니다.
 */
export async function* parseNdjson<T>(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // stream: true — 멀티바이트 문자(한글)가 청크 경계에 걸쳐도 안전합니다.
      buffer += decoder.decode(value, { stream: true });

      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) yield JSON.parse(line) as T;
        newline = buffer.indexOf("\n");
      }
    }

    // 마지막 줄에 개행이 없을 수 있습니다.
    const tail = buffer.trim();
    if (tail) yield JSON.parse(tail) as T;
  } finally {
    reader.releaseLock();
  }
}
