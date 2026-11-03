import { formatBytes } from "./format";

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
