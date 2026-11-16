/**
 * 번호가 붙은 진행 순서를 한 줄로 늘어놓습니다. (01 → 02 → 03)
 *
 * 화살표는 `aria-hidden` 입니다 — 읽어주는 쪽에는 순서 있는 목록(`ol`)이라는
 * 사실만으로 충분하고, "오른쪽 화살표" 를 일일이 읽으면 방해가 됩니다.
 */
export function StepChips({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-x-2">
          {index > 0 && (
            <span
              aria-hidden
              className="text-xs text-black/40 dark:text-white/40"
            >
              →
            </span>
          )}
          <span className="inline-flex items-center gap-2 rounded-full border border-black/15 px-3 py-1 dark:border-white/20">
            <span className="font-mono text-xs text-black/50 dark:text-white/50">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-xs font-medium">{step}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
