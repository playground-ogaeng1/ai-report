import { redirect } from "next/navigation";

import { getOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";

/** 오픈 리다이렉트 방지 — 같은 사이트의 경로만 허용합니다. */
function safePath(value: string | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const redirectTo = safePath(next);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect(redirectTo);

  async function signInWithGoogle() {
    "use server";

    const supabase = await createClient();
    const origin = await getOrigin();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
    // 구글 동의 화면으로 보냅니다.
    redirect(data.url);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">
        AI 인터뷰어 &amp; 자소서 멘토
      </h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        이력서와 자소서를 등록하고, 첨삭과 모의 면접을 받아보세요.
      </p>

      {error && (
        <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
          로그인에 실패했습니다: {error}
        </p>
      )}

      <form className="mt-8" action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full rounded-lg border border-black/15 px-4 py-3 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          구글로 계속하기
        </button>
      </form>

      <p className="mt-6 text-xs text-black/50 dark:text-white/50">
        구글 로그인만 지원합니다.
      </p>
    </main>
  );
}
