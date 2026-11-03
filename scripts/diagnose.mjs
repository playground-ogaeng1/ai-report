/**
 * pnpm diagnose — 개발 환경 자가 진단
 *
 * 읽기 전용입니다. DB 에는 SELECT 만 수행하며 아무것도 수정하지 않습니다.
 * 사용: 루트에서 `pnpm diagnose`
 *
 * 주의: `doctor` 라는 이름은 pnpm 내장 명령어와 충돌해 스크립트가 실행되지 않습니다.
 */
import { createConnection } from "node:net";
import { lookup } from "node:dns/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config } from "dotenv";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const OK = "✅";
const BAD = "❌";
const SKIP = "⬜";
const WARN = "⚠️ ";

let failures = 0;
let step = 0;

function line(mark, label, detail = "") {
  step += 1;
  if (mark === BAD) failures += 1;
  console.log(`${String(step).padStart(2)}. ${mark} ${label.padEnd(26)}${detail}`);
}

function hint(text) {
  console.log(`        → ${text}`);
}

console.log("\n  ppp 개발 환경 진단\n  " + "─".repeat(58));

// ── ① .env 로드 ────────────────────────────────────────────────
const envPath = resolve(ROOT, ".env");
if (!existsSync(envPath)) {
  line(BAD, ".env 파일", "없음");
  hint(".env.example 을 .env 로 복사한 뒤 Supabase 값을 넣으세요.");
  process.exit(1);
}
config({ path: envPath, quiet: true });

const { DATABASE_URL, DIRECT_URL } = process.env;
const missing = [
  !DATABASE_URL && "DATABASE_URL",
  !DIRECT_URL && "DIRECT_URL",
].filter(Boolean);

if (missing.length > 0) {
  line(BAD, ".env 변수", `${missing.join(", ")} 누락`);
  hint("SETUP.md 의 'Step 7. Supabase 연결' 을 참고하세요.");
  process.exit(1);
}
line(OK, ".env 변수", "DATABASE_URL / DIRECT_URL 발견");

// ── ② URL 형식 ────────────────────────────────────────────────
const parsed = {};
let urlsValid = true;

for (const [name, raw] of [
  ["DATABASE_URL", DATABASE_URL],
  ["DIRECT_URL", DIRECT_URL],
]) {
  if (/\[(PROJECT-REF|PASSWORD|POOLER-HOST)\]/.test(raw)) {
    line(BAD, `${name} 형식`, "플레이스홀더가 그대로 남아 있습니다");
    hint("Supabase 대시보드 [Connect] → ORMs → Prisma 에서 값을 복사하세요.");
    urlsValid = false;
    continue;
  }
  try {
    const u = new URL(raw);
    parsed[name] = u;
    line(OK, `${name} 형식`, `${u.hostname}:${u.port} (user ${u.username})`);
  } catch (error) {
    line(BAD, `${name} 형식`, `URL 파싱 실패 — ${error.message}`);
    urlsValid = false;
  }
}

if (urlsValid) {
  const run = parsed.DATABASE_URL;
  const mig = parsed.DIRECT_URL;
  if (run?.port === "6543" && !run.searchParams.has("pgbouncer")) {
    line(WARN, "pgbouncer 파라미터", "DATABASE_URL 에 ?pgbouncer=true 가 없습니다");
    hint("트랜잭션 풀러(6543)에서는 붙이는 것이 안전합니다.");
  }
  if (mig?.port === "6543") {
    line(WARN, "DIRECT_URL 포트", "6543 입니다 (마이그레이션은 5432 권장)");
  }
}

// ── ③ DNS ────────────────────────────────────────────────────
const host = parsed.DATABASE_URL?.hostname;
if (host) {
  try {
    const { address } = await lookup(host);
    line(OK, "DNS 해석", `${host} → ${address}`);
  } catch (error) {
    line(BAD, "DNS 해석", `${host} — ${error.code ?? error.message}`);
    hint("호스트 이름을 대시보드에서 다시 복사하세요. 리전명으로 조합하면 틀립니다.");
  }
}

// ── ④ DB 접속 (두 URL 모두) ───────────────────────────────────
const dist = resolve(ROOT, "packages/db/dist/index.js");
let tableRows = null;

if (!existsSync(dist)) {
  line(SKIP, "DB 접속", "@ppp/db 빌드 산출물이 없습니다");
  hint("먼저 `pnpm db:build` 를 실행하세요.");
} else {
  const { createPrismaClient } = await import(pathToFileURL(dist).href);

  for (const [name, raw] of [
    ["DATABASE_URL", DATABASE_URL],
    ["DIRECT_URL", DIRECT_URL],
  ]) {
    if (!parsed[name]) {
      line(SKIP, `DB 접속 (${name})`, "URL 이 유효하지 않아 건너뜀");
      continue;
    }
    const started = Date.now();
    let client;
    try {
      client = createPrismaClient(raw);
      await client.$queryRaw`SELECT 1`;
      line(OK, `DB 접속 (:${parsed[name].port})`, `${Date.now() - started}ms`);

      if (name === "DATABASE_URL") {
        try {
          // users 는 Auth.js + 모든 도메인 테이블의 기준점이라 대표로 확인합니다.
          tableRows = await client.user.count();
        } catch {
          tableRows = -1;
        }
      }
    } catch (error) {
      const msg = String(error?.message ?? error).split("\n").filter(Boolean).slice(-1)[0];
      line(BAD, `DB 접속 (:${parsed[name].port})`, msg);
      hint("비밀번호 특수문자는 URL 인코딩이 필요할 수 있습니다 (@ → %40, # → %23).");
    } finally {
      try {
        await client?.$disconnect();
      } catch {}
    }
  }

  // ── ⑤ users 테이블 ─────────────────────────────────────────
  if (tableRows === null) {
    line(SKIP, "users 테이블", "DB 접속 실패로 확인 불가");
  } else if (tableRows < 0) {
    line(BAD, "users 테이블", "없음");
    hint(
      "`pnpm db:migrate` 로 테이블을 만드세요. 스키마를 고친 직후라면 `pnpm db:build` 도 필요합니다.",
    );
  } else {
    line(OK, "users 테이블", `존재 (${tableRows} rows)`);
  }
}

// ── ⑥ 포트 / dev 서버 ────────────────────────────────────────
function probePort(port) {
  return new Promise((done) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (listening) => {
      socket.destroy();
      done(listening);
    };
    socket.setTimeout(1500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

const webUp = await probePort(3000);
const apiUp = await probePort(3001);

line(
  webUp ? OK : SKIP,
  "web (:3000)",
  webUp ? "실행중" : "미실행 — `pnpm dev` 로 시작하세요",
);
line(
  apiUp ? OK : SKIP,
  "api (:3001)",
  apiUp ? "실행중" : "미실행 — `pnpm dev` 로 시작하세요",
);

// ── ⑦ /health ────────────────────────────────────────────────
if (apiUp) {
  try {
    const res = await fetch("http://localhost:3001/health", {
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.json();
    line(body.ok ? OK : BAD, "GET /health", JSON.stringify(body));
  } catch (error) {
    line(BAD, "GET /health", error.message);
  }
}

// ── 결과 ─────────────────────────────────────────────────────
console.log("  " + "─".repeat(58));
if (failures === 0) {
  console.log(
    webUp && apiUp
      ? "  정상입니다. http://localhost:3000 을 열어보세요.\n"
      : "  설정은 정상입니다. `pnpm dev` 로 서버를 띄우세요.\n",
  );
} else {
  console.log(`  ${failures}건 문제가 있습니다. 위 → 안내와 SETUP.md 를 보세요.\n`);
}
process.exit(failures === 0 ? 0 : 1);
