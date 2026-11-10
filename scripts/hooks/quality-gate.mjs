#!/usr/bin/env node
/**
 * Stop 훅 — 턴이 끝날 때 lint·typecheck 를 돌리고, 깨졌으면 Claude 를 멈추지 않는다.
 *
 * 훅 규약:
 *  1. 멈춤을 막는(= 결과를 Claude 에게 돌려주는) 종료 코드는 **2** 뿐이다.
 *     pnpm 은 실패 시 1 로 끝나므로 그대로 쓰면 **아무 일도 일어나지 않는다**
 *  2. Claude 가 읽는 메시지는 **stderr** 다. `2>&1` 로 stderr 를 stdout 에 접으면
 *     차단 메시지가 빈 문자열이 된다
 *  3. stdin JSON 의 `stop_hook_active` 가 true 면 이미 이 훅 때문에 한 번 더 돌고 있는
 *     상태다. 여기서 또 막으면 **무한 루프**가 된다
 *
 * `test` 와 `build` 는 일부러 넣지 않았다. 둘은 느리고(모노레포 풀빌드) CI 가 이미
 * 돌린다. 매 턴 돌려야 하는 건 빠르게 깨지는 쪽(lint·typecheck)이다.
 */

import { spawnSync } from "node:child_process";

const CHECKS = ["lint", "typecheck"];

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (buf += chunk));
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", () => resolve(""));
  });
}

let payload = {};
try {
  payload = JSON.parse(await readStdin()) ?? {};
} catch {
  payload = {};
}

// 이 훅이 이미 Claude 를 한 번 되돌린 상태면 그냥 보내준다.
if (payload.stop_hook_active) process.exit(0);

for (const script of CHECKS) {
  // pnpm 은 Windows 에서 .cmd 심으로 설치되므로 shell 경유가 필요하다.
  const r = spawnSync("pnpm", [script], {
    shell: true,
    encoding: "utf8",
    cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  });

  if (r.status !== 0) {
    const detail = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
    process.stderr.write(
      `\`pnpm ${script}\` 가 실패했습니다. 고치고 나서 끝내세요.\n\n${detail}\n`,
    );
    process.exit(2);
  }
}
