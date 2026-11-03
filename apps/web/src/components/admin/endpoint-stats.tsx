"use client";

import { useAdminStats } from "@/hooks/use-admin";
import { formatDuration } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Td, Th } from "@/components/ui/table";
import { AdminError } from "./admin-error";

export function EndpointStats() {
  const stats = useAdminStats();

  if (stats.isPending) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">불러오는 중…</p>
    );
  }
  if (stats.isError) return <AdminError error={stats.error} />;

  const { endpoints, buffered, uptimeSec } = stats.data;

  return (
    <div className="space-y-3">
      <p className="text-xs text-black/50 dark:text-white/50">
        api 가동 {formatDuration(uptimeSec)}
        <span aria-hidden> · </span>
        버퍼에 요청 {buffered.requests.toLocaleString()}건 · 로그{" "}
        {buffered.logs.toLocaleString()}줄
      </p>

      {endpoints.length === 0 ? (
        <EmptyState
          title="집계할 호출이 없습니다."
          description="api 를 재시작하면 기록이 비워집니다."
        />
      ) : (
        <Table
          head={
            <>
              <Th>엔드포인트</Th>
              <Th className="text-right">호출</Th>
              <Th className="text-right">에러</Th>
              <Th className="text-right">평균</Th>
              <Th className="text-right">최대</Th>
            </>
          }
        >
          {endpoints.map((endpoint) => (
            <tr key={endpoint.key}>
              <Td className="font-mono">{endpoint.key}</Td>
              <Td className="text-right">{endpoint.count.toLocaleString()}</Td>
              <Td
                className={`text-right ${
                  endpoint.errorCount > 0
                    ? "text-red-600 dark:text-red-400"
                    : "opacity-50"
                }`}
              >
                {endpoint.errorCount.toLocaleString()}
              </Td>
              <Td className="text-right">{endpoint.avgMs.toLocaleString()}ms</Td>
              <Td className="text-right">{endpoint.maxMs.toLocaleString()}ms</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
