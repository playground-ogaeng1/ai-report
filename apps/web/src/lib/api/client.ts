import { createClient } from "@/lib/supabase/client";
import {
  API_URL,
  ApiError,
  isNetworkFailure,
  readErrorMessage,
} from "./index";
import { parseNdjson } from "./ndjson";

/** 매 호출마다 새로 꺼냅니다 — Supabase 가 만료 전에 갱신하므로 캐시하면 안 됩니다. */
async function getAccessToken(): Promise<string | undefined> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch (cause) {
    if (isNetworkFailure(cause)) {
      throw new ApiError("API 서버에 연결할 수 없습니다.", {
        kind: "unreachable",
        status: 0,
        cause,
      });
    }
    throw cause;
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), {
      kind: "http",
      status: response.status,
    });
  }

  // 204 No Content (예: DELETE) 는 본문이 없어서 json() 이 터집니다.
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * 브라우저에서 NestJS API 를 호출합니다. TanStack Query 의 queryFn/mutationFn 용.
 *
 * 성공하면 파싱된 본문을, 실패하면 `ApiError` 를 **던집니다** — Query 가
 * error/isError 로 다룰 수 있게 하기 위해서입니다.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getAccessToken();

  const response = await send(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return parse<T>(response);
}

/**
 * NDJSON 스트림을 한 줄씩 파싱해서 내보냅니다. (첨삭 생성 등)
 *
 * 스트림이 **시작된 뒤** 생기는 오류는 HTTP 상태로 올 수 없으므로
 * `{type:"error"}` 이벤트로 내려옵니다 — 호출부에서 처리하세요.
 * 시작 전 실패(404/503 등)는 평범하게 `ApiError` 로 던집니다.
 */
export async function* apiStream<T>(
  path: string,
  init?: RequestInit,
): AsyncGenerator<T> {
  const token = await getAccessToken();

  const response = await send(path, {
    method: "POST",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), {
      kind: "http",
      status: response.status,
    });
  }
  if (!response.body) {
    throw new ApiError("응답 본문이 없습니다.", { kind: "http", status: 0 });
  }

  yield* parseNdjson<T>(response.body);
}

/**
 * 파일 업로드(multipart/form-data) 전용.
 *
 * `Content-Type` 을 직접 지정하면 안 됩니다 — boundary 가 빠져서 서버가
 * 본문을 파싱하지 못합니다. fetch 가 FormData 를 보고 알아서 넣게 둡니다.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = await getAccessToken();

  const response = await send(path, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  return parse<T>(response);
}
