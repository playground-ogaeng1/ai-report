"use client";

import { useHealth } from "@/hooks/use-health";
import { useProfile } from "@/hooks/use-profile";
import { API_URL, ApiError, describeError } from "@/lib/api";
import { Alert } from "./ui/alert";
import { RetryingIndicator } from "./ui/retrying-indicator";
import {
  StatusItem,
  StatusList,
  type StatusTone,
} from "./ui/status-list";

/**
 * api·DB·인증 경로가 살아있는지 보여줍니다.
 *
 * 데이터는 훅에서 가져오고, 그리는 일은 ui/ 컴포넌트에 맡깁니다.
 */
export function ConnectionStatus() {
  const health = useHealth();
  const profile = useProfile();

  const healthStatus: { tone: StatusTone; value: string } = health.isPending
    ? { tone: "pending", value: "확인 중…" }
    : health.isError
      ? { tone: "error", value: describeError(health.error) }
      : health.data.ok
        ? { tone: "ok", value: "정상" }
        : { tone: "warning", value: "DB 연결 실패" };

  const profileStatus: { tone: StatusTone; value: string } = profile.isPending
    ? { tone: "pending", value: "확인 중…" }
    : profile.isError
      ? { tone: "error", value: describeError(profile.error) }
      : { tone: "ok", value: "토큰 검증됨" };

  const unreachable =
    health.error instanceof ApiError && health.error.kind === "unreachable";
  const booting = health.isPending && health.failureCount > 0;

  const dbDown = health.data?.ok === false ? health.data.message : null;
  const authFailed =
    profile.error instanceof ApiError && profile.error.kind === "http";

  return (
    <div className="space-y-4">
      <StatusList>
        <StatusItem
          label="api + DB"
          hint="GET /health"
          tone={healthStatus.tone}
          value={healthStatus.value}
        />
        <StatusItem
          label="JWT 검증 + 프로필"
          hint="GET /me"
          tone={profileStatus.tone}
          value={profileStatus.value}
        />
      </StatusList>

      {(unreachable || booting) && (
        <Alert tone="info" title="백엔드(:3001)가 아직 준비되지 않았습니다.">
          <p>
            NestJS 는 첫 TypeScript 컴파일 때문에 기동에 5~15초 걸립니다.
            터미널에 <code>apps/api dev: 🚀 API ready</code> 줄이 보이면 준비
            완료입니다. <strong>DB 설정 문제가 아닙니다.</strong>
          </p>
          <RetryingIndicator attempt={health.failureCount} />
          <details className="mt-3 opacity-70">
            <summary className="cursor-pointer">
              30초 넘게 이 화면이면 눌러보세요
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                터미널에서 <code>pnpm diagnose</code> 실행 — 포트/DB 상태를 한
                번에 확인합니다
              </li>
              <li>
                백엔드만 따로 실행해 에러 확인: <code>pnpm dev:api</code>
              </li>
              <li>
                <code>apps/web/.env.local</code> 의{" "}
                <code>NEXT_PUBLIC_API_URL</code> 이 {API_URL} 인지 확인
              </li>
            </ol>
          </details>
        </Alert>
      )}

      {dbDown && (
        <Alert tone="warning" title="api 는 떴지만 DB 연결에 실패했습니다.">
          <p className="font-mono">{dbDown}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              <code>pnpm diagnose</code> 로 DB 연결 상태 확인 (가장 빠릅니다)
            </li>
            <li>
              루트 <code>.env</code> 의 <code>DATABASE_URL</code> /{" "}
              <code>DIRECT_URL</code> 값 확인
            </li>
            <li>
              <code>pnpm db:migrate</code> 로 테이블을 만들었는지 확인
            </li>
          </ol>
        </Alert>
      )}

      {authFailed && (
        <Alert tone="warning" title="api 가 토큰을 받아들이지 않았습니다.">
          <p className="font-mono">{describeError(profile.error)}</p>
          <p className="mt-2">
            <code>apps/api/.env</code> 의 <code>SUPABASE_URL</code> 이 올바른지
            확인하세요.
          </p>
        </Alert>
      )}
    </div>
  );
}
