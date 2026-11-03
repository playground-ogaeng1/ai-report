import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  API_URL,
  ApiError,
  isNetworkFailure,
  readErrorMessage,
} from "./index";

/**
 * 서버(라우트 핸들러·서버 액션)에서 NestJS API 를 호출합니다.
 *
 * 화면 데이터는 브라우저의 TanStack Query 가 가져오므로, 이 함수는 서버에서만
 * 할 수 있는 일에 씁니다 — 예: 로그인 콜백에서 프로필 생성.
 *
 * 토큰을 꺼낼 때만 `getSession()` 을 씁니다. 여기서 인증 판단을 하지 않고
 * 서명 검증은 api 가 JWKS 로 수행하므로 안전합니다.
 * **인증 여부를 판단할 때는 `getClaims()` 를 쓰세요.**
 */
export async function apiRequestServer<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
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

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), {
      kind: "http",
      status: response.status,
    });
  }

  return (await response.json()) as T;
}
