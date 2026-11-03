"use client";

import { useId, useState } from "react";

import { useCreateDocument } from "@/hooks/use-document-mutations";
import { describeError, type DocumentKind } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { KindSelect } from "./kind-select";

/** 텍스트를 직접 붙여넣어 등록하는 폼. */
export function DocumentTextForm() {
  const ids = useId();
  const create = useCreateDocument();

  const [kind, setKind] = useState<DocumentKind>("RESUME");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const tooShort = content.trim().length > 0 && content.trim().length < 10;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(
          { kind, title: title.trim(), content: content.trim() },
          {
            onSuccess: () => {
              setTitle("");
              setContent("");
            },
          },
        );
      }}
    >
      <KindSelect
        id={`${ids}-kind`}
        value={kind}
        onChange={setKind}
        disabled={create.isPending}
      />

      <Field label="제목" htmlFor={`${ids}-title`}>
        <Input
          id={`${ids}-title`}
          value={title}
          required
          maxLength={200}
          placeholder="예) 2026 상반기 백엔드 지원 이력서"
          disabled={create.isPending}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>

      <Field
        label="본문"
        htmlFor={`${ids}-content`}
        hint={`${content.trim().length.toLocaleString()}자 · 최소 10자`}
        error={tooShort ? "10자 이상 입력해 주세요." : undefined}
      >
        <Textarea
          id={`${ids}-content`}
          value={content}
          required
          rows={12}
          maxLength={100_000}
          placeholder="이력서나 자소서 내용을 붙여넣어 주세요."
          disabled={create.isPending}
          onChange={(event) => setContent(event.target.value)}
        />
      </Field>

      {create.isError && (
        <Alert tone="error" title="등록에 실패했습니다.">
          {describeError(create.error)}
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          loading={create.isPending}
          disabled={!title.trim() || content.trim().length < 10}
        >
          등록
        </Button>
        {create.isSuccess && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            등록했습니다.
          </span>
        )}
      </div>
    </form>
  );
}
