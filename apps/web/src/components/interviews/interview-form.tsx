"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { useDocuments } from "@/hooks/use-documents";
import { useCreateInterview } from "@/hooks/use-interviews";
import {
  DOCUMENT_KIND_LABEL,
  describeError,
  type InterviewDifficulty,
} from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { DifficultySelect } from "./difficulty-select";

/** 새 면접 시작 폼. 문서를 고르면 그 내용을 근거로 질문합니다. */
export function InterviewForm() {
  const ids = useId();
  const router = useRouter();
  const create = useCreateInterview();
  const documents = useDocuments();

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("NORMAL");
  const [documentId, setDocumentId] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(
          {
            title: title.trim(),
            difficulty,
            ...(documentId ? { documentId } : {}),
          },
          { onSuccess: (session) => router.push(`/interviews/${session.id}`) },
        );
      }}
    >
      <Field label="제목" htmlFor={`${ids}-title`}>
        <Input
          id={`${ids}-title`}
          value={title}
          required
          maxLength={200}
          placeholder="예) 백엔드 신입 1차 면접 연습"
          disabled={create.isPending}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>

      <DifficultySelect
        id={`${ids}-difficulty`}
        value={difficulty}
        onChange={setDifficulty}
        disabled={create.isPending}
      />

      <Field
        label="기반 문서"
        htmlFor={`${ids}-document`}
        hint={
          documentId
            ? "이 문서에 적힌 경험을 근거로 질문합니다."
            : "선택하지 않으면 면접관이 먼저 준비 직무를 물어봅니다."
        }
      >
        <Select
          id={`${ids}-document`}
          value={documentId}
          disabled={create.isPending || documents.isPending}
          onChange={(event) => setDocumentId(event.target.value)}
        >
          <option value="">선택 없이 진행</option>
          {documents.data?.map((document) => (
            <option key={document.id} value={document.id}>
              [{DOCUMENT_KIND_LABEL[document.kind]}] {document.title}
            </option>
          ))}
        </Select>
      </Field>

      {documents.isError && (
        <Alert tone="warning" title="문서 목록을 불러오지 못했습니다.">
          문서 없이도 면접을 시작할 수 있습니다. ({describeError(documents.error)})
        </Alert>
      )}

      {create.isError && (
        <Alert tone="error" title="면접을 시작할 수 없습니다.">
          {describeError(create.error)}
        </Alert>
      )}

      <div>
        <Button
          type="submit"
          variant="primary"
          loading={create.isPending}
          disabled={!title.trim()}
        >
          면접 만들기
        </Button>
      </div>
    </form>
  );
}
