import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export function SignOutButton() {
  async function signOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-xs text-black/50 underline-offset-2 hover:underline dark:text-white/50"
      >
        로그아웃
      </button>
    </form>
  );
}
