"use client";

import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { useReportBug } from "@/hooks/use-report-bug";
import {
  BUG_REPORT_MAX_LENGTH,
  BUG_REPORT_MIN_LENGTH,
  describeError,
} from "@/lib/api";
import { BugReportPanel } from "@/components/ui/bug-report-panel";

/**
 * 로그인 없이 볼 수 있는 화면 — 여기서는 위젯을 숨깁니다.
 * 보내도 api 가 401 을 주기 때문입니다.
 *
 * 원본은 `lib/supabase/update-session.ts` 의 `PUBLIC_PATHS` 입니다.
 * 거기서 import 하면 `next/server` 가 클라이언트 번들로 끌려오므로 다시 적습니다
 * — **한쪽을 고치면 다른 쪽도 고쳐야 합니다.**
 */
const PUBLIC_PATHS = ["/login", "/auth"];

/**
 * 모든 화면 우하단에 뜨는 버그 신고 위젯. (루트 레이아웃에 있습니다)
 *
 * 화면은 `ui/bug-report-panel` 이 그리고, 상태와 발송은 여기서 들고 있습니다.
 * 신고가 난 화면 경로는 `usePathname` 으로 함께 보냅니다.
 */
export function BugReportWidget() {
  const ids = useId();
  const pathname = usePathname();
  const report = useReportBug();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isPublic) return null;

  function close() {
    setOpen(false);
    setSent(false);
    // 다음에 열 때 지난번 에러가 남아 있지 않게 합니다.
    report.reset();
  }

  return (
    <BugReportPanel
      id={ids}
      open={open}
      message={message}
      minLength={BUG_REPORT_MIN_LENGTH}
      maxLength={BUG_REPORT_MAX_LENGTH}
      pending={report.isPending}
      sent={sent}
      error={report.isError ? describeError(report.error) : undefined}
      onOpen={() => setOpen(true)}
      onClose={close}
      onMessageChange={setMessage}
      onSubmit={() => {
        report.mutate(
          { message: message.trim(), path: pathname },
          {
            onSuccess: () => {
              // 패널은 열어둔 채로 안에서 알립니다 — 눌렀는데 그냥 닫히면
              // 보내졌는지 알 수 없습니다.
              setMessage("");
              setSent(true);
            },
          },
        );
      }}
    />
  );
}
