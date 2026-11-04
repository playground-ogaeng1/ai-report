"use client";

import { useState } from "react";

import { useDeleteDocument } from "@/hooks/use-document-mutations";
import { useDocuments } from "@/hooks/use-documents";
import { describeError } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentCard } from "./document-card";

/** 내 문서 목록. 데이터는 훅에서, 그리기는 DocumentCard 에 맡깁니다. */
export function DocumentList() {
  const documents = useDocuments();
  const remove = useDeleteDocument();

  // 실수로 지우는 걸 막기 위한 2단 확인 (모달 없이)
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (documents.isPending) {
    return (
      <p className="py-8 text-center text-sm text-black/50 dark:text-white/50">
        불러오는 중…
      </p>
    );
  }

  if (documents.isError) {
    return (
      <Alert tone="error" title="목록을 불러오지 못했습니다.">
        {describeError(documents.error)}
      </Alert>
    );
  }

  if (documents.data.length === 0) {
    return (
      <EmptyState
        title="아직 등록한 문서가 없습니다."
        description="위에서 이력서나 자소서를 등록해 보세요."
      />
    );
  }

  return (
    <div className="space-y-3">
      {remove.isError && (
        <Alert tone="error" title="삭제에 실패했습니다.">
          {describeError(remove.error)}
        </Alert>
      )}

      <ul className="divide-y divide-black/10 dark:divide-white/10">
        {documents.data.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            action={
              confirmingId === document.id ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    loading={remove.isPending}
                    onClick={() =>
                      remove.mutate(document.id, {
                        onSettled: () => setConfirmingId(null),
                      })
                    }
                  >
                    삭제
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={remove.isPending}
                    onClick={() => setConfirmingId(null)}
                  >
                    취소
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setConfirmingId(document.id)}
                >
                  삭제
                </Button>
              )
            }
          />
        ))}
      </ul>
    </div>
  );
}
