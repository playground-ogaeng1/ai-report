import type { MessageRole } from "@/lib/api";

/** 대화 한 줄. **순수 UI** — props 만 받습니다. */
export function ChatMessage({
  role,
  content,
  pending = false,
}: {
  role: MessageRole;
  content: string;
  /** 아직 받는 중이면 커서를 붙입니다. */
  pending?: boolean;
}) {
  const isUser = role === "USER";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-foreground text-background"
            : "border border-black/10 dark:border-white/15"
        }`}
      >
        <span className="sr-only">{isUser ? "지원자: " : "면접관: "}</span>
        {content}
        {pending && (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-current align-middle" />
        )}
      </div>
    </div>
  );
}
