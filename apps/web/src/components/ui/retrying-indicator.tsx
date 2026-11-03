/**
 * "다시 확인하는 중" 표시.
 *
 * 재시도 자체는 TanStack Query 가 합니다(QueryProvider 의 retry 설정).
 * 이 컴포넌트는 그 상태를 보여주기만 합니다.
 */
export function RetryingIndicator({ attempt }: { attempt?: number }) {
  return (
    <p className="mt-3 flex items-center gap-2 text-xs opacity-70">
      <span
        className="inline-block size-2 animate-pulse rounded-full bg-current"
        aria-hidden
      />
      자동으로 다시 확인하는 중…
      {attempt !== undefined && attempt > 0 && ` (${attempt}번째 시도)`}
    </p>
  );
}
