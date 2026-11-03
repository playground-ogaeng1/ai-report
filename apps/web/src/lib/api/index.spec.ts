import {
  ApiError,
  describeError,
  isNetworkFailure,
  readErrorMessage,
} from "./index";

describe("ApiError", () => {
  it("4xx 는 클라이언트 잘못으로 본다 (재시도하지 않을 근거)", () => {
    const error = new ApiError("없음", { kind: "http", status: 404 });
    expect(error.isClientFault).toBe(true);
  });

  it("5xx 는 클라이언트 잘못이 아니다 (재시도 대상)", () => {
    const error = new ApiError("서버 오류", { kind: "http", status: 500 });
    expect(error.isClientFault).toBe(false);
  });

  it("연결 실패는 클라이언트 잘못이 아니다 — 백엔드 기동 중일 수 있다", () => {
    const error = new ApiError("연결 불가", { kind: "unreachable", status: 0 });
    expect(error.isClientFault).toBe(false);
  });
});

describe("describeError", () => {
  it("연결 실패는 상태 코드 대신 안내 문장을 준다", () => {
    const error = new ApiError("무시됨", { kind: "unreachable", status: 0 });
    expect(describeError(error)).toContain("연결할 수 없습니다");
  });

  it("http 에러는 서버가 준 메시지를 그대로 쓴다", () => {
    const error = new ApiError("세션이 만료되었습니다.", {
      kind: "http",
      status: 401,
    });
    expect(describeError(error)).toBe("세션이 만료되었습니다.");
  });

  it("ApiError 가 아닌 Error 도 메시지를 꺼낸다", () => {
    expect(describeError(new Error("그냥 에러"))).toBe("그냥 에러");
  });

  it("Error 가 아닌 값도 문자열로 바꾼다", () => {
    expect(describeError("문자열")).toBe("문자열");
  });
});

describe("isNetworkFailure", () => {
  it("브라우저의 TypeError(Failed to fetch)를 네트워크 실패로 본다", () => {
    const error = new TypeError("Failed to fetch");
    expect(isNetworkFailure(error)).toBe(true);
  });

  it("Node(undici) 의 cause.code 도 네트워크 실패로 본다", () => {
    const error = new Error("fetch failed", {
      cause: { code: "ECONNREFUSED" },
    });
    expect(isNetworkFailure(error)).toBe(true);
  });

  it("일반 에러는 네트워크 실패가 아니다", () => {
    expect(isNetworkFailure(new Error("아무거나"))).toBe(false);
  });

  it("Error 가 아닌 값은 네트워크 실패가 아니다", () => {
    expect(isNetworkFailure("ECONNREFUSED")).toBe(false);
  });
});

describe("readErrorMessage", () => {
  it("NestJS 의 message 문자열을 꺼낸다", async () => {
    const response = new Response(
      JSON.stringify({ message: "문서를 찾을 수 없습니다.", statusCode: 404 }),
      { status: 404 },
    );
    expect(await readErrorMessage(response)).toBe("문서를 찾을 수 없습니다.");
  });

  it("ValidationPipe 의 message 배열은 합쳐서 보여준다", async () => {
    const response = new Response(
      JSON.stringify({ message: ["title must be a string", "kind 오류"] }),
      { status: 400 },
    );
    expect(await readErrorMessage(response)).toBe(
      "title must be a string, kind 오류",
    );
  });

  it("JSON 이 아니면 상태 문자열로 대체한다", async () => {
    const response = new Response("<html>502</html>", {
      status: 502,
      statusText: "Bad Gateway",
    });
    expect(await readErrorMessage(response)).toBe("502 Bad Gateway");
  });
});
