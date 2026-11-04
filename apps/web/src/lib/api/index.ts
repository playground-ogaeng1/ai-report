/**
 * api 공용 타입·상수. 런타임 의존성이 없어서 브라우저/서버 양쪽에서 import 합니다.
 *
 * 실제 호출은 환경에 따라 나뉩니다:
 *   · 브라우저 (TanStack Query) → ./client
 *   · 서버 (라우트 핸들러 등)   → ./server
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type ApiErrorKind =
  /** 서버에 아예 닿지 못함 — 보통 백엔드가 아직 안 떴다는 뜻 */
  | "unreachable"
  /** 서버는 응답했지만 에러 상태 */
  | "http";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** unreachable 인 경우 0 */
  readonly status: number;

  constructor(
    message: string,
    options: { kind: ApiErrorKind; status: number; cause?: unknown },
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status;
  }

  /** 재시도해도 결과가 같은(= 클라이언트 잘못) 에러인지 */
  get isClientFault(): boolean {
    return this.kind === "http" && this.status >= 400 && this.status < 500;
  }
}

/** GET /health */
export type HealthResult =
  | { ok: true; db: "up" }
  | { ok: false; db: "down"; message: string };

/** GET /me */
export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * 관리자 여부. 메뉴를 보여줄지 판단하는 데만 씁니다 —
   * **실제 차단은 api 의 AdminGuard 가 합니다.**
   */
  admin: boolean;
};

// ── 운영 조회 (관리자 전용) ─────────────────────────────────────

export type AdminLogLevel = "log" | "warn" | "error" | "debug" | "verbose";

export const ADMIN_LOG_LEVELS: readonly AdminLogLevel[] = [
  "log",
  "warn",
  "error",
  "debug",
  "verbose",
];

/** GET /admin/requests */
export type AdminRequestEntry = {
  at: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  /**
   * 호출자. 가드를 통과한 요청만 채워집니다 —
   * **인증 실패(401)는 null** 이고, 그게 정상입니다.
   */
  userId: string | null;
  userEmail: string | null;
  error: string | null;
};

/** GET /admin/logs */
export type AdminLogEntry = {
  at: string;
  level: AdminLogLevel;
  context: string | null;
  message: string;
};

export type AdminEndpointStat = {
  key: string;
  count: number;
  errorCount: number;
  avgMs: number;
  maxMs: number;
};

/** GET /admin/stats */
export type AdminStats = {
  endpoints: AdminEndpointStat[];
  buffered: { logs: number; requests: number };
  uptimeSec: number;
};

/**
 * Prisma enum 과 같은 값들.
 *
 * web 은 `@ppp/db`(Prisma) 에 의존하지 않으므로 — 의존하면 Prisma 가 web
 * 번들로 끌려옵니다 — 문자열 유니온으로 다시 적습니다.
 * **스키마의 enum 을 바꾸면 여기도 함께 고쳐야 합니다.**
 */
export type DocumentKind = "RESUME" | "COVER_LETTER" | "PORTFOLIO";
export type DocumentSource = "TEXT" | "FILE";

export const DOCUMENT_KINDS: readonly DocumentKind[] = [
  "RESUME",
  "COVER_LETTER",
  "PORTFOLIO",
];

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  RESUME: "이력서",
  COVER_LETTER: "자소서",
  PORTFOLIO: "포트폴리오",
};

export const DOCUMENT_SOURCE_LABEL: Record<DocumentSource, string> = {
  TEXT: "직접 입력",
  FILE: "파일",
};

/** GET /documents — 본문(content) 없음 */
export type DocumentSummary = {
  id: string;
  kind: DocumentKind;
  source: DocumentSource;
  title: string;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
};

/** GET /documents/:id */
export type DocumentDetail = DocumentSummary & {
  content: string;
  filePath: string | null;
  mimeType: string | null;
};

/** 업로드 가능한 최대 크기 — api 의 MAX_PDF_BYTES 와 맞춰야 합니다. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

/** GET /documents/:id/reviews */
export type Review = {
  id: string;
  documentId: string;
  feedback: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
};

/**
 * 스트리밍 엔드포인트가 흘려보내는 NDJSON 이벤트.
 * 첨삭·면접·총평이 모두 같은 모양을 씁니다.
 *
 * `ping` 은 화면에 쓸 내용이 없는 연결 유지용입니다 — 모델이 사고하는 동안
 * 응답에 바이트가 0개 나가서 프록시가 연결을 끊는 걸 막습니다. 소비하는 쪽은
 * 그냥 무시하면 됩니다(`use-stream-text` 의 switch 에 default 가 없습니다).
 */
export type StreamTextEvent =
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "ping" };

/** GET /usage — 비용 가드 상태 */
export type UsageSnapshot = {
  windowHours: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  limitTokens: number;
  remainingTokens: number;
  exceeded: boolean;
};

// ── 면접 ──────────────────────────────────────────────────────

export type InterviewStatus = "ACTIVE" | "COMPLETED";
export type InterviewDifficulty = "EASY" | "NORMAL" | "HARD";
export type MessageRole = "USER" | "ASSISTANT";

export const INTERVIEW_DIFFICULTIES: readonly InterviewDifficulty[] = [
  "EASY",
  "NORMAL",
  "HARD",
];

export const INTERVIEW_DIFFICULTY_LABEL: Record<InterviewDifficulty, string> = {
  EASY: "쉬움",
  NORMAL: "보통",
  HARD: "어려움",
};

/** 난이도 차이는 꼬리질문 개수와 깊이입니다. */
export const INTERVIEW_DIFFICULTY_HINT: Record<InterviewDifficulty, string> = {
  EASY: "꼬리질문 0~1개. 막히면 힌트를 줍니다.",
  NORMAL: "꼬리질문 1~2개. 답변의 근거를 한 번 더 확인합니다.",
  HARD: "꼬리질문 2~3개. 모순·과장을 짚고 끝까지 파고듭니다.",
};

export type InterviewMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};

/** GET /interviews */
export type InterviewListItem = {
  id: string;
  title: string;
  status: InterviewStatus;
  difficulty: InterviewDifficulty;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** GET /interviews/:id */
export type InterviewDetail = InterviewListItem & {
  summary: string | null;
  messages: InterviewMessage[];
};

/** 에러 객체를 사용자에게 보여줄 문장으로 바꿉니다. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.kind === "unreachable"
      ? "API 서버에 연결할 수 없습니다."
      : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/** fetch 가 네트워크 레벨에서 실패했는지 판별 */
export function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  // 브라우저는 "Failed to fetch", Node(undici) 는 "fetch failed" 로 던집니다.
  if (error.name === "TypeError") return true;

  const codes = ["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", "ETIMEDOUT"];
  const cause = error.cause as { code?: string } | undefined;
  return Boolean(cause?.code && codes.includes(cause.code));
}

/** 응답 본문에서 쓸만한 에러 메시지를 뽑아냅니다. */
export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
    if (Array.isArray(body.message)) return body.message.join(", ");
  } catch {
    // JSON 이 아니면 상태 문자열로 대체
  }
  return `${response.status} ${response.statusText}`;
}
