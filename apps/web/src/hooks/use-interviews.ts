"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  InterviewDetail,
  InterviewDifficulty,
  InterviewListItem,
} from "@/lib/api";
import { apiRequest } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

export function useInterviews() {
  return useQuery({
    queryKey: queryKeys.interviews.all,
    queryFn: () => apiRequest<InterviewListItem[]>("/interviews"),
  });
}

export function useInterview(id: string) {
  return useQuery({
    queryKey: queryKeys.interviews.detail(id),
    queryFn: () => apiRequest<InterviewDetail>(`/interviews/${id}`),
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      title: string;
      difficulty: InterviewDifficulty;
      documentId?: string;
    }) =>
      apiRequest<InterviewListItem>("/interviews", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.interviews.all,
      });
    },
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/interviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.interviews.all,
      });
    },
  });
}
