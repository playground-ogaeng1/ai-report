"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Review } from "@/lib/api";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

/** 해당 문서의 첨삭 이력 (최신순). */
export function useReviews(documentId: string) {
  return useQuery({
    queryKey: queryKeys.reviews.forDocument(documentId),
    queryFn: () => apiRequest<Review[]>(`/documents/${documentId}/reviews`),
  });
}

export function useDeleteReview(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reviews.forDocument(documentId),
      });
    },
  });
}
