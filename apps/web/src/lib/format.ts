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
