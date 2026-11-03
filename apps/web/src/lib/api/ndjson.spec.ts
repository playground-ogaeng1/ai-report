import { parseNdjson } from "./ndjson";

type Event = { type: string; text?: string };

/** 주어진 청크들을 그 경계 그대로 흘려보내는 스트림을 만듭니다. */
function streamOf(...chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const parts = chunks.map((chunk) =>
    typeof chunk === "string" ? encoder.encode(chunk) : chunk,
  );

  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
}

async function collect<T>(source: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const value of source) out.push(value);
  return out;
}

describe("parseNdjson", () => {
  it("한 청크 안의 여러 줄을 각각 내보낸다", async () => {
    const events = await collect<Event>(
      parseNdjson(
        streamOf('{"type":"text","text":"가"}\n{"type":"done"}\n'),
      ),
    );

    expect(events).toEqual([
      { type: "text", text: "가" },
      { type: "done" },
    ]);
  });

  it("줄이 청크 경계에 걸쳐도 합쳐서 파싱한다", async () => {
    // 네트워크는 줄 중간에서 끊기는 게 정상입니다. 여기서 깨지면
    // 사용자는 스트리밍 도중 JSON 파싱 에러를 보게 됩니다.
    const events = await collect<Event>(
      parseNdjson(
        streamOf('{"type":"text","te', 'xt":"반갈죽"}\n{"type":"do', 'ne"}\n'),
      ),
    );

    expect(events).toEqual([
      { type: "text", text: "반갈죽" },
      { type: "done" },
    ]);
  });

  it("한글이 바이트 경계에 걸쳐도 깨지지 않는다", async () => {
    const line = '{"type":"text","text":"안녕하세요"}\n';
    const bytes = new TextEncoder().encode(line);

    // "안"(3바이트) 중간에서 자릅니다.
    const cut = line.indexOf("안") + 1;
    const events = await collect<Event>(
      parseNdjson(streamOf(bytes.slice(0, cut), bytes.slice(cut))),
    );

    expect(events).toEqual([{ type: "text", text: "안녕하세요" }]);
  });

  it("마지막 줄에 개행이 없어도 내보낸다", async () => {
    const events = await collect<Event>(
      parseNdjson(streamOf('{"type":"text","text":"끝"}\n{"type":"done"}')),
    );

    expect(events).toEqual([
      { type: "text", text: "끝" },
      { type: "done" },
    ]);
  });

  it("빈 줄은 건너뛴다", async () => {
    const events = await collect<Event>(
      parseNdjson(streamOf('\n{"type":"done"}\n\n')),
    );

    expect(events).toEqual([{ type: "done" }]);
  });

  it("본문에 줄바꿈이 들어 있어도 한 줄로 다룬다", async () => {
    // NDJSON 을 쓰는 이유 자체입니다 — 마크다운 본문의 줄바꿈이
    // JSON escape 되어 프레임을 깨지 않아야 합니다.
    const text = "### 한 줄 평\n\n- 항목";
    const events = await collect<Event>(
      parseNdjson(streamOf(`${JSON.stringify({ type: "text", text })}\n`)),
    );

    expect(events).toEqual([{ type: "text", text }]);
  });

  it("빈 스트림이면 아무것도 내보내지 않는다", async () => {
    expect(await collect<Event>(parseNdjson(streamOf()))).toEqual([]);
  });
});
