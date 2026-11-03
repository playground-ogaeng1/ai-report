import Link from "next/link";
import type { ReactNode } from "react";

import {
  DOCUMENT_KIND_LABEL,
  DOCUMENT_SOURCE_LABEL,
  type DocumentSummary,
} from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/format";

/**
 * 문서 1건 카드. **순수 UI** — 훅도 페칭도 쓰지 않고 props 만 받습니다.
 * 삭제 같은 동작은 `action` 슬롯으로 상위 데이터 컴포넌트가 끼워 넣습니다.
 */
export function DocumentCard({
  document,
  action,
}: {
  document: DocumentSummary;
  action?: ReactNode;
}) {
  const size = formatBytes(document.fileSize);

  return (
    <li className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <Link
          href={`/documents/${document.id}`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {document.title}
        </Link>
        <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-black/50 dark:text-white/50">
          <span>{DOCUMENT_KIND_LABEL[document.kind]}</span>
          <span aria-hidden>·</span>
          <span>{DOCUMENT_SOURCE_LABEL[document.source]}</span>
          {document.fileName && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{document.fileName}</span>
            </>
          )}
          {size && (
            <>
              <span aria-hidden>·</span>
              <span>{size}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{formatDate(document.createdAt)}</span>
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </li>
  );
}
