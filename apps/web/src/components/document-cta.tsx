"use client";

import Link from "next/link";

import { useDocuments } from "@/hooks/use-documents";
import { Alert } from "./ui/alert";

/**
 * 문서가 하나도 없을 때만 등록을 안내합니다.
 *
 * 항상 띄우면 이미 문서를 올린 사람에게 "등록된 문서가 없나요?" 라고 묻는
 * 꼴이 됩니다. 불러오는 중이거나 실패했을 때도 **아무것도 그리지 않습니다** —
 * 홈의 보조 안내라서, 틀린 말을 하느니 비어 있는 편이 낫습니다.
 * (목록을 못 불러온 사실은 /documents 에서 제대로 알립니다)
 */
export function DocumentCta() {
  const documents = useDocuments();

  if (!documents.data || documents.data.length > 0) return null;

  return (
    <Alert
      tone="info"
      title="아직 등록한 문서가 없습니다."
      action={
        <Link
          href="/documents"
          className="inline-block rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          문서 등록하기 →
        </Link>
      }
    >
      이력서나 자소서를 먼저 등록하면 그 내용을 근거로 첨삭과 면접 질문을
      만듭니다.
    </Alert>
  );
}
