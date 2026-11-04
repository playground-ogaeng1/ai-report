import type { ReactNode } from "react";

import { Alert } from "./alert";
import { Button } from "./button";
import { Field } from "./field";
import { Textarea } from "./input";

/** 확성기 아이콘 — 나팔 + 손잡이. */
function MegaphoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-6 w-6"
    >
      {/* 나팔 */}
      <path d="m3 11 18-5v12L3 14v-3z" />
      {/* 손잡이 */}
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * 버그 신고 위젯. props 만 받고 훅·페칭을 모릅니다 —
 * 상태와 발송은 `components/bug-report-widget.tsx` 가 들고 있습니다.
 *
 * 챗봇 위젯처럼 우하단에 떠 있지만 **배경을 덮지 않습니다**(모달이 아님). 화면을 보면서
 * 적을 수 있어야 버그를 설명하기 쉽기 때문입니다. 그래서 바깥 클릭으로는
 * 닫지 않고, 동그란 버튼이나 Escape 로만 닫습니다.
 */
export function BugReportPanel({
  id,
  open,
  message,
  minLength,
  maxLength,
  pending = false,
  sent = false,
  error,
  onOpen,
  onClose,
  onMessageChange,
  onSubmit,
}: {
  /** 라벨·패널을 잇는 id. 호출부에서 useId 로 만들어 넘깁니다. */
  id: string;
  open: boolean;
  message: string;
  minLength: number;
  maxLength: number;
  pending?: boolean;
  /** 발송 완료 — 패널을 닫지 않고 안에서 알려줍니다. */
  sent?: boolean;
  error?: ReactNode;
  onOpen: () => void;
  onClose: () => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const length = message.trim().length;
  const tooShort = length > 0 && length < minLength;

  return (
    <div
      className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !pending) onClose();
      }}
    >
      {open && (
        <div
          id={`${id}-panel`}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${id}-title`}
          className="w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-black/10 bg-background p-5 shadow-2xl dark:border-white/15"
        >
          <h2 id={`${id}-title`} className="text-sm font-semibold">
            버그 신고
          </h2>

          {sent ? (
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                보냈습니다. 감사합니다!
              </p>
              <Button type="button" className="self-end" onClick={onClose}>
                닫기
              </Button>
            </div>
          ) : (
            <form
              className="mt-3 flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              <Field
                label={
                  <span className="text-xs font-normal text-black/50 dark:text-white/50">
                    이용에 불편한 점이 있다면 알려주세요
                  </span>
                }
                htmlFor={`${id}-message`}
                hint={`${length.toLocaleString()}자 · 최소 ${minLength}자`}
                error={tooShort ? `${minLength}자 이상 입력해 주세요.` : undefined}
              >
                <Textarea
                  id={`${id}-message`}
                  value={message}
                  required
                  autoFocus
                  rows={5}
                  maxLength={maxLength}
                  placeholder="예) 자소서 상세에서 첨삭 버튼을 눌렀는데 아무 반응이 없습니다."
                  disabled={pending}
                  onChange={(event) => onMessageChange(event.target.value)}
                />
              </Field>

              {error && (
                <Alert tone="error" title="보내지 못했습니다.">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="primary"
                className="self-end"
                loading={pending}
                disabled={length < minLength}
              >
                보내기
              </Button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={open ? onClose : onOpen}
        disabled={pending}
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        aria-label={open ? "버그 신고 닫기" : "버그 신고"}
        title={open ? "닫기" : "버그 신고"}
        className="flex h-14 w-14 items-center justify-center self-end rounded-full bg-foreground text-background shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {open ? <CloseIcon /> : <MegaphoneIcon />}
      </button>
    </div>
  );
}
