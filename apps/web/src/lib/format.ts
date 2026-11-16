/** 1234567 → "1.2MB" */
export function formatBytes(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** ISO 문자열 → "2026. 11. 3." */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR");
}

/** 이 기간이 넘어가면 상대 표기를 포기하고 날짜를 적습니다. */
const RELATIVE_LIMIT_DAYS = 7;

/**
 * ISO 문자열 → "2일 전" — 최근일수록 유용한 목록에 씁니다.
 *
 * 경과 시간으로 계산합니다(달력 날짜가 아니라). 7일이 넘으면 "37일 전" 처럼
 * 세어봐야 아는 숫자가 되므로 `formatDate` 로 넘깁니다.
 *
 * `now` 를 받는 이유는 테스트에서 시간을 고정하기 위해서입니다.
 */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const elapsedMs = now.getTime() - new Date(iso).getTime();

  // 서버와 브라우저의 시계가 어긋나면 미래가 될 수 있습니다.
  const minutes = Math.floor(Math.max(0, elapsedMs) / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < RELATIVE_LIMIT_DAYS) return `${days}일 전`;

  return formatDate(iso);
}

/** ISO 문자열 → "21:57:36" — 로그처럼 초 단위가 중요한 곳에 씁니다. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour12: false });
}

/** 3725 → "1시간 2분" */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분`;

  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분`;
}
