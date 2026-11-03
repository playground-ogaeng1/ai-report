import type { ComponentPropsWithRef } from "react";

/** 입력 요소들의 공통 스타일. 한곳에서 관리해야 생김새가 안 갈립니다. */
const BASE =
  "rounded-lg border border-black/15 px-3 py-2 text-sm outline-none transition focus:border-black/40 disabled:opacity-50 dark:border-white/20 dark:focus:border-white/50";

// React 19 부터 ref 는 함수 컴포넌트의 일반 prop 이라
// ComponentPropsWithRef 를 써야 호출부에서 ref 를 넘길 수 있습니다.
export function Input({
  className = "",
  ...rest
}: ComponentPropsWithRef<"input">) {
  return <input {...rest} className={`${BASE} bg-transparent ${className}`} />;
}

export function Textarea({
  className = "",
  ...rest
}: ComponentPropsWithRef<"textarea">) {
  return (
    <textarea
      {...rest}
      className={`${BASE} resize-y bg-transparent ${className}`}
    />
  );
}

/**
 * select 만 배경을 투명이 아니라 `bg-background` 로 둡니다.
 * 브라우저가 드롭다운 목록의 배경을 select 의 computed background 에서
 * 가져오는 경우가 있어, 투명이면 목록이 흰 바탕으로 그려집니다.
 */
export function Select({
  className = "",
  ...rest
}: ComponentPropsWithRef<"select">) {
  return <select {...rest} className={`${BASE} bg-background ${className}`} />;
}
