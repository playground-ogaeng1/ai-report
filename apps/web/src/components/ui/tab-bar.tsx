/** 탭 전환 버튼 줄. **순수 UI** — 활성 상태는 상위가 들고 있습니다. */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { value: T; label: string }[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex gap-1 border-b border-black/10 dark:border-white/10"
    >
      {tabs.map((tab) => {
        const selected = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              selected
                ? "border-foreground font-medium"
                : "border-transparent text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
