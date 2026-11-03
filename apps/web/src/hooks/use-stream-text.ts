"use client";

import { useCallback, useRef, useState } from "react";

import { describeError, type StreamTextEvent } from "@/lib/api";
import { apiStream } from "@/lib/api/client";

export type StreamStatus = "idle" | "streaming" | "done" | "error";

/**
 * `text` / `done` / `error` 세 가지로 이루어진 NDJSON 스트림을 받아
 * 도착하는 글자를 실시간으로 쌓습니다. (첨삭·면접 턴·총평이 모두 이 모양)
 *
 * TanStack Query 의 useMutation 을 쓰지 않는 이유: 뮤테이션은 "끝났을 때의
 * 결과" 하나를 다루는 도구라서, 진행 중에 계속 바뀌는 텍스트를 담기에 맞지
 * 않습니다. 완료 후 캐시 정리는 `onDone` 에서 직접 합니다.
 *
 * `start` 는 `onDone` 이 바뀌면 함께 새로 만들어집니다. 렌더 중에 ref 를
 * 고쳐서 안정성을 흉내내지 않습니다 — 그건 동시 렌더링에서 깨지는 패턴이고,
 * `start` 는 이벤트 핸들러에서만 부르므로 effect 의존성 문제도 없습니다.
 */
export function useStreamText(onDone?: () => void) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (path: string, body?: unknown) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText("");
    setError(null);
    setStatus("streaming");

    try {
      const stream = apiStream<StreamTextEvent>(path, {
        signal: controller.signal,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });

      for await (const event of stream) {
        switch (event.type) {
          case "text":
            setText((prev) => prev + event.text);
            break;
          case "error":
            setError(event.message);
            setStatus("error");
            return;
          case "done":
            setStatus("done");
            onDone?.();
            return;
        }
      }

      // done 이벤트 없이 스트림이 끊긴 경우
      setError("응답이 중간에 끊겼습니다. 다시 시도해 주세요.");
      setStatus("error");
    } catch (cause) {
      if (controller.signal.aborted) {
        setStatus("idle");
        return;
      }
      setError(describeError(cause));
      setStatus("error");
    }
  }, [onDone]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    setText("");
    setError(null);
    setStatus("idle");
  }, []);

  return { text, status, error, start, cancel, reset };
}
