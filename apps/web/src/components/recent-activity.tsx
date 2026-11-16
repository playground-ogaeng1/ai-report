"use client";

import { useDocuments } from "@/hooks/use-documents";
import { useInterviews } from "@/hooks/use-interviews";
import {
  DOCUMENT_KIND_LABEL,
  INTERVIEW_DIFFICULTY_LABEL,
  type DocumentSummary,
  type InterviewListItem,
} from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import { ActivityRow } from "./ui/activity-row";

/** 섹션이 길어지지 않게 종류별로 이만큼만 보여줍니다. */
const PER_KIND = 2;

/** 최근에 손댄 순서. 목록 API 의 정렬에 기대지 않고 여기서 다시 세웁니다. */
function byRecent<T extends { updatedAt: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function interviewMeta(interview: InterviewListItem): string[] {
  return [
    "진행 중",
    `난이도 ${INTERVIEW_DIFFICULTY_LABEL[interview.difficulty]}`,
    formatRelativeDate(interview.updatedAt),
  ];
}

function documentMeta(document: DocumentSummary): string[] {
  return [
    DOCUMENT_KIND_LABEL[document.kind],
    formatRelativeDate(document.updatedAt),
  ];
}

/**
 * 돌아왔을 때 이어서 할 거리.
 *
 * **끝나지 않은 면접**을 먼저 보여주고, 그다음 최근 문서를 놓습니다.
 * 종료된 면접은 이어서 할 게 없으므로 뺍니다.
 *
 * 불러오는 중·실패·둘 다 비었으면 **아무것도 그리지 않습니다** — 홈의 보조
 * 영역이라, 자리를 비워 두는 편이 빈 상자나 에러를 띄우는 것보다 낫습니다.
 * (목록을 못 불러온 사실은 각 목록 화면에서 제대로 알립니다)
 */
export function RecentActivity() {
  const interviews = useInterviews();
  const documents = useDocuments();

  const ongoing = byRecent(
    (interviews.data ?? []).filter((item) => item.status === "ACTIVE"),
  ).slice(0, PER_KIND);

  const recentDocuments = byRecent(documents.data ?? []).slice(0, PER_KIND);

  if (ongoing.length === 0 && recentDocuments.length === 0) return null;

  return (
    <section className="mt-12 border-t border-black/10 pt-8 dark:border-white/15">
      <h2 className="mb-4 text-lg font-semibold">이어서 하기</h2>

      <div className="space-y-3">
        {ongoing.map((interview) => (
          <ActivityRow
            key={interview.id}
            href={`/interviews/${interview.id}`}
            title={interview.title}
            meta={interviewMeta(interview)}
          />
        ))}

        {recentDocuments.map((document) => (
          <ActivityRow
            key={document.id}
            href={`/documents/${document.id}`}
            title={document.title}
            meta={documentMeta(document)}
          />
        ))}
      </div>
    </section>
  );
}
