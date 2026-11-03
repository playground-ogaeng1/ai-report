"use client";

import { useUsage } from "@/hooks/use-usage";
import { describeError } from "@/lib/api";
import { Alert } from "./ui/alert";
import { Meter, type MeterTone } from "./ui/meter";

function toneFor(ratio: number): MeterTone {
  if (ratio >= 1) return "danger";
  if (ratio >= 0.8) return "warning";
  return "normal";
}

/**
 * 비용 가드 사용량.
 *
 * 한도에 걸리면 Claude 를 쓰는 기능이 429 로 막히는데, 숫자를 보여주지
 * 않으면 사용자는 왜 막혔는지 알 수 없습니다.
 */
export function UsageMeter() {
  const usage = useUsage();

  if (usage.isPending) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">
        사용량 확인 중…
      </p>
    );
  }
  if (usage.isError) {
    return (
      <Alert tone="warning" title="사용량을 불러오지 못했습니다.">
        {describeError(usage.error)}
      </Alert>
    );
  }

  const { totalTokens, limitTokens, windowHours, exceeded } = usage.data;
  const ratio = limitTokens > 0 ? totalTokens / limitTokens : 0;

  return (
    <div className="space-y-3">
      <Meter
        label={`최근 ${windowHours}시간 토큰 사용량`}
        value={totalTokens}
        max={limitTokens}
        tone={toneFor(ratio)}
        caption={`${totalTokens.toLocaleString()} / ${limitTokens.toLocaleString()} 토큰`}
      />

      {exceeded && (
        <Alert tone="warning" title="사용 한도에 도달했습니다.">
          첨삭과 모의 면접이 일시적으로 제한됩니다. 문서 등록·조회는 계속
          사용할 수 있고, 시간이 지나면 자동으로 풀립니다.
        </Alert>
      )}
    </div>
  );
}
