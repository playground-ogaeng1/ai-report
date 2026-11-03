"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  useDeleteDocument,
  useDocumentFileUrl,
} from "@/hooks/use-document-mutations";
import { useDocument } from "@/hooks/use-documents";
import {
  DOCUMENT_KIND_LABEL,
  DOCUMENT_SOURCE_LABEL,
  describeError,
} from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** 문서 상세 — 본문 보기 / 원본 내려받기 / 삭제. */
export function DocumentDetail({ id }: { id: string }) {
  const router = useRouter();
  const document = useDocument(id);
  const remove = useDeleteDocument();
  const fileUrl = useDocumentFileUrl();

  const [confirming, setConfirming] = useState(false);

  if (document.isPending) {
    return (
      <p className="py-8 text-sm text-black/50 dark:text-white/50">
        불러오는 중…
      </p>
    );
  }

  if (document.isError) {
    return (
      <Alert tone="error" title="문서를 불러오지 못했습니다.">
        {describeError(document.error)}
      </Alert>
    );
  }

  const doc = document.data;
  const size = formatBytes(doc.fileSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
        <p className="mt-2 flex flex-wrap gap-x-2 text-xs text-black/50 dark:text-white/50">
          <span>{DOCUMENT_KIND_LABEL[doc.kind]}</span>
          <span aria-hidden>·</span>
          <span>{DOCUMENT_SOURCE_LABEL[doc.source]}</span>
          {doc.fileName && (
            <>
              <span aria-hidden>·</span>
              <span>{doc.fileName}</span>
            </>
          )}
          {size && (
            <>
              <span aria-hidden>·</span>
              <span>{size}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{formatDate(doc.createdAt)}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {doc.filePath && (
          <Button
            loading={fileUrl.isPending}
            onClick={() =>
              fileUrl.mutate(doc.id, {
                onSuccess: ({ url }) => window.open(url, "_blank"),
              })
            }
          >
            원본 PDF 열기
          </Button>
        )}

        {confirming ? (
          <>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(doc.id, {
                  onSuccess: () => router.push("/documents"),
                  onError: () => setConfirming(false),
                })
              }
            >
              정말 삭제
            </Button>
            <Button
              variant="ghost"
              disabled={remove.isPending}
              onClick={() => setConfirming(false)}
            >
              취소
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            삭제
          </Button>
        )}
      </div>

      {fileUrl.isError && (
        <Alert tone="error" title="원본 파일을 열 수 없습니다.">
          {describeError(fileUrl.error)}
        </Alert>
      )}
      {remove.isError && (
        <Alert tone="error" title="삭제에 실패했습니다.">
          {describeError(remove.error)}
        </Alert>
      )}

    </div>
  );
}
