"use client";

import { useQuery } from "@tanstack/react-query";

import type { DocumentDetail, DocumentSummary } from "@/lib/api";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

/** 내가 등록한 문서 목록 (본문 제외). */
export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents.all,
    queryFn: () => apiRequest<DocumentSummary[]>("/documents"),
  });
}

/** 문서 1건 상세 (본문 포함). */
export function useDocument(id: string) {
  return useQuery({
    queryKey: queryKeys.documents.detail(id),
    queryFn: () => apiRequest<DocumentDetail>(`/documents/${id}`),
  });
}
