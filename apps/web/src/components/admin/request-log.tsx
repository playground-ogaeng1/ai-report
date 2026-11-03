"use client";

import { useAdminRequests } from "@/hooks/use-admin";
import { formatTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Td, Th } from "@/components/ui/table";
import { AdminError } from "./admin-error";

function statusClass(status: number): string {
  if (status >= 500) return "text-red-600 dark:text-red-400";
  if (status >= 400) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

/** 느린 요청을 눈에 띄게 — 스트리밍은 수초가 정상이라 기준을 높게 둡니다. */
function durationClass(ms: number): string {
  if (ms >= 10_000) return "text-amber-600 dark:text-amber-400";
  return "";
}

export function RequestLog() {
  const requests = useAdminRequests();

  if (requests.isPending) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">불러오는 중…</p>
    );
  }
  if (requests.isError) return <AdminError error={requests.error} />;

  if (requests.data.length === 0) {
    return <EmptyState title="아직 기록된 호출이 없습니다." />;
  }

  return (
    <Table
      head={
        <>
          <Th>시각</Th>
          <Th>호출자</Th>
          <Th>메서드</Th>
          <Th>경로</Th>
          <Th className="text-right">상태</Th>
          <Th className="text-right">소요</Th>
        </>
      }
    >
      {requests.data.map((entry, index) => (
        <tr key={`${entry.at}-${index}`}>
          <Td className="font-mono whitespace-nowrap opacity-60">
            {formatTime(entry.at)}
          </Td>
          <Td className="break-all">
            {entry.userEmail ? (
              entry.userEmail
            ) : (
              // 인증을 통과하지 못한 요청 — 누구인지 증명되지 않았습니다.
              <span className="opacity-40" title="인증되지 않은 요청">
                익명
              </span>
            )}
          </Td>
          <Td className="font-mono">{entry.method}</Td>
          <Td className="font-mono break-all">
            {entry.path}
            {entry.error && (
              <span className="mt-0.5 block text-red-600 dark:text-red-400">
                {entry.error}
              </span>
            )}
          </Td>
          <Td className={`text-right font-mono ${statusClass(entry.status)}`}>
            {entry.status}
          </Td>
          <Td
            className={`text-right font-mono whitespace-nowrap ${durationClass(entry.durationMs)}`}
          >
            {entry.durationMs.toLocaleString()}ms
          </Td>
        </tr>
      ))}
    </Table>
  );
}
