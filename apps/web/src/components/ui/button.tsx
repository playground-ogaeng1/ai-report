import type { ComponentPropsWithRef, ReactNode } from "react";

export type ButtonVariant = "primary" | "outline" | "danger" | "ghost";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:opacity-90 disabled:opacity-40",
  outline:
    "border border-black/15 hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10",
  danger:
    "border border-red-500/40 text-red-600 hover:bg-red-500/10 disabled:opacity-40 dark:text-red-400",
  ghost: "hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10",
};

export function Button({
  variant = "outline",
  loading = false,
  children,
  className = "",
  disabled,
  ...rest
}: ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  /** 진행 중이면 비활성화하고 표시를 바꿉니다. */
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${VARIANT_CLASS[variant]} ${className}`}
    >
      {loading ? "처리 중…" : children}
    </button>
  );
}
