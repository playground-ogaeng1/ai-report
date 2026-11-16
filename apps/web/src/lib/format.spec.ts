import { formatBytes, formatDate, formatRelativeDate } from "./format";

describe("formatBytes", () => {
  it("null 이면 null — 파일이 없는 문서(텍스트 등록)를 위한 처리", () => {
    expect(formatBytes(null)).toBeNull();
  });

  it("1KB 미만은 바이트로", () => {
    expect(formatBytes(0)).toBe("0B");
    expect(formatBytes(512)).toBe("512B");
  });

  it("1KB~1MB 는 KB 로", () => {
    expect(formatBytes(1024)).toBe("1KB");
    expect(formatBytes(1536)).toBe("2KB");
  });

  it("1MB 이상은 소수 첫째 자리까지 MB 로", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0MB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10.0MB");
  });
});

describe("formatRelativeDate", () => {
  const now = new Date("2026-11-16T12:00:00.000Z");

  /** now 기준으로 분을 거슬러 올라간 ISO 문자열 */
  function minutesAgo(minutes: number): string {
    return new Date(now.getTime() - minutes * 60_000).toISOString();
  }

  it("1분 미만은 '방금 전'", () => {
    expect(formatRelativeDate(minutesAgo(0), now)).toBe("방금 전");
    expect(formatRelativeDate(minutesAgo(0.5), now)).toBe("방금 전");
  });

  it("1시간 미만은 분으로", () => {
    expect(formatRelativeDate(minutesAgo(1), now)).toBe("1분 전");
    expect(formatRelativeDate(minutesAgo(59), now)).toBe("59분 전");
  });

  it("24시간 미만은 시간으로", () => {
    expect(formatRelativeDate(minutesAgo(60), now)).toBe("1시간 전");
    expect(formatRelativeDate(minutesAgo(60 * 23), now)).toBe("23시간 전");
  });

  it("7일 미만은 일로", () => {
    expect(formatRelativeDate(minutesAgo(60 * 24), now)).toBe("1일 전");
    expect(formatRelativeDate(minutesAgo(60 * 24 * 2), now)).toBe("2일 전");
    expect(formatRelativeDate(minutesAgo(60 * 24 * 6), now)).toBe("6일 전");
  });

  it("7일부터는 날짜로 — '37일 전' 은 세어봐야 알 수 있다", () => {
    const old = minutesAgo(60 * 24 * 7);

    expect(formatRelativeDate(old, now)).toBe(formatDate(old));
    expect(formatRelativeDate(old, now)).not.toContain("전");
  });

  it("시계가 어긋나 미래로 와도 '방금 전' 으로 막는다", () => {
    expect(formatRelativeDate(minutesAgo(-120), now)).toBe("방금 전");
  });
});
