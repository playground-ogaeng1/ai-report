#!/usr/bin/env node
/**
 * PreToolUse(Bash) 훅 — 되돌릴 수 없는 커맨드를 차단한다.
 *
 * 훅 규약 두 가지를 지켜야 실제로 막힌다:
 *  1. 입력은 **stdin JSON** 이다. `$CLAUDE_TOOL_INPUT` 같은 환경변수는 없다
 *     (있다고 믿고 쓰면 빈 문자열을 검사하게 되어 **전부 통과**한다)
 *  2. 차단은 **exit 2** 다. 다른 코드는 "훅이 실패했다"로 처리되고 커맨드는 그대로 실행된다.
 *     차단 이유는 **stderr** 로 보낸다 — stdout 은 Claude 에게 전달되지 않는다
 *
 * 이건 완전한 샌드박스가 아니라 **지뢰선**이다. 플래그를 기괴하게 쓰거나
 * 변수에 숨기면 통과한다. 목적은 에이전트가 무심코 치는 실수를 잡는 것이다.
 *
 * 수동 확인:
 *   echo '{"tool_input":{"command":"rm -rf ."}}' | node scripts/hooks/block-dangerous-bash.mjs; echo $?
 */

/** 각 규칙은 사유 1개 + 그 사유에 해당하는 표기 여러 개. */
const RULES = [
  {
    why: "rm -rf — 되돌릴 수 없는 삭제",
    tests: [
      /\brm\b[^|;&\n]*\s-[a-z]*(?:rf|fr)[a-z]*\b/i,
      /\brm\b[^|;&\n]*\s-[a-z]*r[a-z]*\s+-[a-z]*f/i,
      /\brm\b[^|;&\n]*--recursive\b[^|;&\n]*--force\b/i,
      /\brm\b[^|;&\n]*--force\b[^|;&\n]*--recursive\b/i,
    ],
  },
  {
    why: "git push --force — 원격의 남의 커밋을 덮어쓴다",
    tests: [/\bgit\s+push\b[^|;&\n]*\s(?:--force\b|--force-with-lease\b|-f\b)/],
  },
  {
    why: "git reset --hard — 커밋되지 않은 변경이 사라진다",
    tests: [/\bgit\s+reset\b[^|;&\n]*\s--hard\b/],
  },
  {
    why: "git clean -f — 추적되지 않는 파일이 사라진다 (.env 포함)",
    tests: [/\bgit\s+clean\b[^|;&\n]*\s-[a-z]*f/i],
  },
  {
    why: "파괴적 DDL — 테이블/스키마가 사라진다",
    tests: [/\b(?:DROP\s+(?:TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE)\b/i],
  },
  {
    // CLAUDE.md: 마이그레이션은 사용자가 로컬에서 직접 돌린다
    why: "실제 Supabase DB 를 비우거나 운영에 마이그레이션을 적용한다 — 사용자가 직접 실행한다",
    tests: [/\bprisma\s+migrate\s+reset\b/, /\bdb:deploy\b/],
  },
  {
    // CLAUDE.md: `.env` 는 건드리지 않고 `.env.example` 만 갱신한다
    why: ".env 덮어쓰기 — 실제 키가 든 파일이다. .env.example 만 고친다",
    // `.env.example` 은 갱신 대상이므로 예외다 (`.env`, `.env.local` 만 막는다)
    tests: [/>{1,2}\s*(?:[.\w/\\-]*[/\\])?\.env(?!\.example\b)/],
  },
];

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (buf += chunk));
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", () => resolve(""));
  });
}

const raw = await readStdin();

let command = "";
try {
  command = JSON.parse(raw)?.tool_input?.command ?? "";
} catch {
  // 훅이 입력을 못 읽었다고 모든 Bash 를 막아버리면 세션이 쓸 수 없게 된다.
  // 안전장치가 고장났을 때는 열어두고, 대신 디버그 로그(claude --debug)에서 보이게 둔다.
  process.exit(0);
}

const hit = RULES.find((rule) => rule.tests.some((re) => re.test(command)));

if (hit) {
  process.stderr.write(
    `BLOCKED: ${hit.why}\n` +
      `  커맨드: ${command}\n` +
      `  정말 필요하면 사용자에게 설명하고 직접 실행하도록 요청하세요.\n`,
  );
  process.exit(2);
}
