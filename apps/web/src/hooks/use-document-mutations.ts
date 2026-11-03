"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { DocumentDetail, DocumentKind } from "@/lib/api";
import { apiRequest, apiUpload } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

/** 텍스트를 직접 붙여넣어 등록. */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      kind: DocumentKind;
      title: string;
      content: string;
    }) =>
      apiRequest<DocumentDetail>("/documents", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

/** PDF 업로드 — 서버가 텍스트를 추출해서 함께 저장합니다. */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      kind: DocumentKind;
      title: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("kind", input.kind);
      formData.append("title", input.title);
      formData.append("file", input.file);

      return apiUpload<DocumentDetail>("/documents/upload", formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

/**
 * 원본 파일 다운로드.
 *
 * 만료되는 URL 이라 캐시하면 안 되므로 쿼리가 아니라 뮤테이션으로 둡니다
 * (버튼을 눌렀을 때만 받아오면 됩니다).
 */
export function useDocumentFileUrl() {
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ url: string }>(`/documents/${id}/file`),
  });
}
