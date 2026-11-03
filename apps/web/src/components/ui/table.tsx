import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

/** 가로로 넘치면 표만 스크롤되게 감싸줍니다 — 페이지가 흔들리지 않도록. */
export function Table({
  head,
  children,
}: {
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="border-b border-black/10 dark:border-white/15">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/10">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  className = "",
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...rest}
      className={`px-3 py-2 font-medium whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td {...rest} className={`px-3 py-2 align-top ${className}`}>
      {children}
    </td>
  );
}
