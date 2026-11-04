import type { AuthUser } from '../auth/authed-request.js';

export type BugReportMail = {
  subject: string;
  body: string;
};

/** 꼬리말 한 줄에 들어가는 값에서 줄바꿈을 걷어냅니다. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * KST 로 적습니다 — 관리자가 읽는 메일입니다.
 *
 * 한국은 서머타임이 없어 +09:00 고정이므로 오프셋을 더해서 씁니다.
 * (`toLocaleString` 은 런타임 ICU 버전에 따라 모양이 달라집니다)
 */
function formatKst(at: Date): string {
  const kst = new Date(at.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.toISOString().slice(0, 19).replace('T', ' ')} (KST)`;
}

/**
 * 버그 신고 메일 내용을 만듭니다.
 *
 * 신고자 정보는 **`AuthUser`(= 검증된 JWT 클레임)에서만** 가져옵니다.
 * 클라이언트가 보낸 이메일을 쓰면 아무나 사칭할 수 있습니다.
 *
 * 발송과 분리된 순수 함수입니다 — 내용 검증이 네트워크를 타지 않게.
 */
export function composeBugReportMail(
  user: AuthUser,
  report: { message: string; path?: string },
  at: Date,
): BugReportMail {
  const reporter = user.email ?? '(이메일 없음)';

  const footer = [
    `신고자: ${reporter} (${user.id})`,
    `화면: ${report.path ? singleLine(report.path) : '(알 수 없음)'}`,
    `시각: ${formatKst(at)}`,
  ].join('\n');

  return {
    subject: `[버그 신고] ${reporter}`,
    body: `${report.message.trim()}\n\n---\n${footer}\n`,
  };
}
