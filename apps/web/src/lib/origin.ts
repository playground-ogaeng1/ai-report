import "server-only";

import { headers } from "next/headers";

/**
 * 현재 요청의 origin (예: http://localhost:3000).
 *
 * OAuth 콜백 주소를 만들 때 씁니다. 하드코딩하면 배포 환경에서 깨지므로
 * 요청 헤더에서 읽습니다.
 */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";

  return `${proto}://${host}`;
}
