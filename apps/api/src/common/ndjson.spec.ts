import { streamNdjson, type StreamingResponse } from './ndjson.js';

/**
 * res 의 최소 구현. express 를 띄우지 않고 쓰여진 줄만 모아 봅니다.
 */
function fakeRes() {
  const headers: Record<string, string> = {};
  const chunks: string[] = [];
  let ended = false;
  let flushed = false;

  const res: StreamingResponse & {
    headers: Record<string, string>;
    chunks: string[];
    isEnded: () => boolean;
    isFlushed: () => boolean;
  } = {
    headers,
    chunks,
    isEnded: () => ended,
    isFlushed: () => flushed,
    setHeader(name, value) {
      headers[name] = value;
    },
    write(chunk) {
      if (ended) throw new Error('end() 뒤에 write 가 호출되었습니다');
      chunks.push(chunk);
      return true;
    },
    end() {
      ended = true;
    },
    flushHeaders() {
      flushed = true;
    },
  };

  return res;
}

const pings = (chunks: string[]) =>
  chunks.filter((line) => line.includes('"ping"'));

describe('streamNdjson', () => {
  it('이벤트를 한 줄에 하나씩 쓰고 스트림을 닫는다', async () => {
    const res = fakeRes();

    await streamNdjson(res, (async function* () {
      yield { type: 'text', text: '첫' };
      yield { type: 'done', reviewId: 'r1' };
    })());

    expect(res.chunks).toEqual([
      '{"type":"text","text":"첫"}\n',
      '{"type":"done","reviewId":"r1"}\n',
    ]);
    expect(res.isEnded()).toBe(true);
  });

  it('버퍼링을 막는 헤더를 먼저 보낸다', async () => {
    const res = fakeRes();

    await streamNdjson(res, (async function* () {})());

    expect(res.headers).toEqual({
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    });
    expect(res.isFlushed()).toBe(true);
  });

  it('본문에 줄바꿈이 있어도 한 줄로 유지된다 (SSE 가 아닌 이유)', async () => {
    const res = fakeRes();

    await streamNdjson(res, (async function* () {
      yield { type: 'text', text: '첫 줄\n둘째 줄' };
    })());

    expect(res.chunks).toHaveLength(1);
    expect(res.chunks[0]?.endsWith('\n')).toBe(true);
    // 본문의 줄바꿈은 escape 되어 프레임을 깨지 않습니다.
    expect(res.chunks[0]).toContain('\\n');
  });

  describe('keepalive', () => {
    beforeEach(() => void vi.useFakeTimers());
    afterEach(() => void vi.useRealTimers());

    it('이벤트가 없는 동안 ping 을 보내 연결을 살려 둔다', async () => {
      const res = fakeRes();
      let release!: () => void;
      const silence = new Promise<void>((resolve) => {
        release = resolve;
      });

      const streaming = streamNdjson(res, (async function* () {
        // 모델이 사고하는 구간 — 내려보낼 텍스트가 없습니다.
        await silence;
        yield { type: 'text', text: '드디어' };
      })());

      await vi.advanceTimersByTimeAsync(31_000);
      expect(pings(res.chunks)).toHaveLength(2);

      release();
      await streaming;

      expect(res.chunks.at(-1)).toBe('{"type":"text","text":"드디어"}\n');
    });

    it('스트림이 끝나면 ping 을 멈춘다', async () => {
      const res = fakeRes();

      await streamNdjson(res, (async function* () {
        yield { type: 'done' };
      })());

      const after = res.chunks.length;
      // 타이머가 남아 있으면 end() 뒤의 write 로 fakeRes 가 던집니다.
      await vi.advanceTimersByTimeAsync(60_000);

      expect(res.chunks).toHaveLength(after);
    });

    it('생성기가 던져도 타이머를 정리하고 스트림을 닫는다', async () => {
      const res = fakeRes();

      await expect(
        streamNdjson(res, (async function* () {
          yield { type: 'text', text: '일부' };
          throw new Error('모델 호출 실패');
        })()),
      ).rejects.toThrow('모델 호출 실패');

      expect(res.isEnded()).toBe(true);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(pings(res.chunks)).toHaveLength(0);
    });
  });
});
