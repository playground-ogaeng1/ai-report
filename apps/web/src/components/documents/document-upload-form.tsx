"use client";

import { useId, useRef, useState } from "react";

import { useUploadDocument } from "@/hooks/use-document-mutations";
import {
  describeError,
  type DocumentKind,
  MAX_PDF_BYTES,
} from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatBytes } from "@/lib/format";
import { KindSelect } from "./kind-select";

/** PDF 를 올려 등록하는 폼. 텍스트 추출은 서버가 합니다. */
export function DocumentUploadForm() {
  const ids = useId();
  const upload = useUploadDocument();
  const fileInput = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<DocumentKind>("RESUME");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const tooBig = file !== null && file.size > MAX_PDF_BYTES;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!file) return;

        upload.mutate(
          { kind, title: title.trim(), file },
          {
            onSuccess: () => {
              setTitle("");
              setFile(null);
              // 같은 파일을 다시 고를 수 있게 input 값을 비웁니다.
              if (fileInput.current) fileInput.current.value = "";
            },
          },
        );
      }}
    >
      <KindSelect
        id={`${ids}-kind`}
        value={kind}
        onChange={setKind}
        disabled={upload.isPending}
      />

      <Field label="제목" htmlFor={`${ids}-title`}>
        <Input
          id={`${ids}-title`}
          value={title}
          required
          maxLength={200}
          placeholder="예) 신입 백엔드 자기소개서"
          disabled={upload.isPending}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>

      <Field
        label="PDF 파일"
        htmlFor={`${ids}-file`}
        hint={`PDF 만 지원 · 최대 ${MAX_PDF_BYTES / 1024 / 1024}MB${
          file ? ` · 선택됨: ${file.name} (${formatBytes(file.size)})` : ""
        }`}
        error={tooBig ? "파일이 너무 큽니다." : undefined}
      >
        <Input
          ref={fileInput}
          id={`${ids}-file`}
          type="file"
          accept="application/pdf,.pdf"
          required
          disabled={upload.isPending}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </Field>

      {upload.isError && (
        <Alert tone="error" title="업로드에 실패했습니다.">
          {describeError(upload.error)}
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          loading={upload.isPending}
          disabled={!file || tooBig || !title.trim()}
        >
          업로드
        </Button>
        {upload.isSuccess && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            등록했습니다.
          </span>
        )}
      </div>

      <p className="text-xs text-black/50 dark:text-white/50">
        스캔 이미지로 된 PDF 는 텍스트가 없어 등록되지 않습니다. 그 경우
        내용을 직접 붙여넣어 주세요.
      </p>
    </form>
  );
}
