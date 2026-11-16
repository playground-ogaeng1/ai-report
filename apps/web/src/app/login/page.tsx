import { redirect } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { GoogleMark } from "@/components/ui/google-mark";
import { HologramBackdrop } from "@/components/ui/hologram-backdrop";
import { StepChips } from "@/components/ui/step-chips";
import { getOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";

/** 로그인하면 무엇을 하게 되는지 — 홈의 01/02/03 카드와 같은 순서입니다. */
const STEPS = ["문서 등록", "문장별 첨삭", "꼬리질문 면접"];

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
    <>
      <HologramBackdrop />

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold text-black/60 dark:text-white/60">
          AI 인터뷰어 &amp; 자소서 멘토
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          나 혼자 하는 면접 준비
        </h1>

        <p className="mt-3 text-sm text-black/60 dark:text-white/60">
          이력서와 자소서를 등록하고, 첨삭과 모의 면접을 받아보세요.
        </p>

        {error && (
          // 메시지가 길 수 있어 알림 안쪽은 왼쪽으로 맞춥니다.
          <div className="mt-8 text-left">
            <Alert tone="error" title="로그인에 실패했습니다.">
              {error}
            </Alert>
          </div>
        )}

        <form className="mt-8" action={signInWithGoogle}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 px-4 py-3 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            <GoogleMark />
            구글로 계속하기
          </button>
        </form>

        <p className="mt-4 text-xs text-black/50 dark:text-white/50">
          구글 로그인만 지원합니다.
        </p>

        <div className="mt-10 border-t border-black/10 dark:border-white/15" />

        <div className="mt-6">
          <StepChips steps={STEPS} />
        </div>
      </main>
    </>
  );
}
