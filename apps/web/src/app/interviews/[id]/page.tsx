import Link from "next/link";

import { ChatView } from "@/components/interviews/chat-view";
import { requireClaims } from "@/lib/require-auth";

export default async function InterviewDetailPage({
  params,
}: PageProps<"/interviews/[id]">) {
  const [, { id }] = await Promise.all([requireClaims(), params]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Link
        href="/interviews"
        className="text-xs text-black/50 underline-offset-2 hover:underline dark:text-white/50"
      >
        ← 목록으로
      </Link>

      <div className="mt-6">
        <ChatView interviewId={id} />
      </div>
    </main>
  );
}
