"use client";

import { useState } from "react";

import { useAdminLogs } from "@/hooks/use-admin";
import { ADMIN_LOG_LEVELS, type AdminLogLevel } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { TabBar } from "@/components/ui/tab-bar";
import { AdminError } from "./admin-error";

type Filter = AdminLogLevel | "all";

const TABS: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  ...ADMIN_LOG_LEVELS.map((level) => ({ value: level, label: level })),
];

const LEVEL_CLASS: Record<AdminLogLevel, string> = {
  error: "text-red-600 dark:text-red-400",
  warn: "text-amber-600 dark:text-amber-400",
  log: "opacity-70",
  debug: "opacity-50",
  verbose: "opacity-50",
};

export function LogView() {
  const [filter, setFilter] = useState<Filter>("all");
  const logs = useAdminLogs(filter);

  return (
    <div className="space-y-3">
      <TabBar tabs={TABS} active={filter} onChange={setFilter} />

      {logs.isPending ? (
        <p className="text-sm text-black/50 dark:text-white/50">불러오는 중…</p>
      ) : logs.isError ? (
        <AdminError error={logs.error} />
      ) : logs.data.length === 0 ? (
        <EmptyState title="해당 레벨의 로그가 없습니다." />
      ) : (
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-black/10 p-3 font-mono text-xs dark:border-white/15">
          {logs.data.map((entry, index) => (
            <div
              key={`${entry.at}-${index}`}
              className="flex gap-2 py-0.5 break-all"
            >
              <span className="shrink-0 opacity-50">
                {formatTime(entry.at)}
              </span>
              <span className={`shrink-0 ${LEVEL_CLASS[entry.level]}`}>
                {entry.level.toUpperCase()}
              </span>
              {entry.context && (
                <span className="shrink-0 opacity-60">[{entry.context}]</span>
              )}
              <span className={LEVEL_CLASS[entry.level]}>{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
