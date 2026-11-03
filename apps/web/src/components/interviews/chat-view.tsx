"use client";

import { useEffect, useRef, useState } from "react";

import { useInterviewTurn } from "@/hooks/use-interview-turn";
import { useInterview } from "@/hooks/use-interviews";
import { describeError, INTERVIEW_DIFFICULTY_LABEL } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";
import { ChatMessage } from "./chat-message";
import { InterviewSummary } from "./interview-summary";

export function ChatView({ interviewId }: { interviewId: string }) {
  const interview = useInterview(interviewId);
  const turn = useInterviewTurn(interviewId);

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const streaming = turn.status === "streaming";
  const messages = interview.data?.messages ?? [];

  // 새 말풍선이나 스트리밍 글자가 늘면 아래로 따라갑니다.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, turn.text]);

  if (interview.isPending) {
    return (
      <p className="py-8 text-sm text-black/50 dark:text-white/50">
        불러오는 중…
      </p>
    );
  }
  if (interview.isError) {
    return (
      <Alert tone="error" title="면접을 불러오지 못했습니다.">
        {describeError(interview.error)}
      </Alert>
    );
  }

  const session = interview.data;
  const completed = session.status === "COMPLETED";
  const lastIsAssistant = messages.at(-1)?.role === "ASSISTANT";

  function submit() {
    const content = draft.trim();
    if (!content || streaming) return;

    setDraft("");
    void turn.send(content);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{session.title}</h1>
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">
          난이도 {INTERVIEW_DIFFICULTY_LABEL[session.difficulty]}
          <span aria-hidden> · </span>
          {completed ? "종료됨" : "진행 중"}
          <span aria-hidden> · </span>
          질문·답변 {messages.length}건
        </p>
      </div>

      {/* 대화 */}
      <div className="space-y-3">
        {messages.length === 0 && !streaming && !completed && (
          <EmptyState
            title="아직 시작하지 않았습니다."
            description="아래 버튼을 누르면 면접관이 첫 질문을 합니다."
          />
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
          />
        ))}

        {/* 스트리밍 중인 면접관 답변 (끝나면 위 목록으로 넘어갑니다) */}
        {(streaming || turn.status === "error") && turn.text && (
          <ChatMessage role="ASSISTANT" content={turn.text} pending={streaming} />
        )}

        {streaming && !turn.text && (
          <p className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
            <span
              className="inline-block size-2 animate-pulse rounded-full bg-current"
              aria-hidden
            />
            면접관이 생각하고 있습니다…
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {turn.status === "error" && turn.error && (
        <Alert tone="error" title="면접관 응답에 실패했습니다.">
          {turn.error}
          <div className="mt-2">
            <Button onClick={() => void turn.send()}>다시 시도</Button>
          </div>
        </Alert>
      )}

      {/* 입력 영역 */}
      {!completed && (
        <div className="space-y-3 border-t border-black/10 pt-5 dark:border-white/10">
          {messages.length === 0 ? (
            <Button
              variant="primary"
              loading={streaming}
              onClick={() => void turn.send()}
            >
              면접 시작
            </Button>
          ) : (
            <>
              <Textarea
                value={draft}
                rows={4}
                maxLength={10_000}
                placeholder={
                  lastIsAssistant
                    ? "답변을 입력하세요. (Ctrl+Enter 로 전송)"
                    : "면접관의 질문을 기다리는 중입니다."
                }
                disabled={streaming}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    submit();
                  }
                }}
                className="w-full"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  loading={streaming}
                  disabled={!draft.trim()}
                  onClick={submit}
                >
                  답변 전송
                </Button>
                {streaming && (
                  <Button variant="ghost" onClick={turn.cancel}>
                    중단
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="border-t border-black/10 pt-6 dark:border-white/10">
        <InterviewSummary
          interviewId={interviewId}
          savedSummary={session.summary}
          canFinish={!completed && messages.length >= 2}
          disabled={streaming}
        />
      </div>
    </div>
  );
}
