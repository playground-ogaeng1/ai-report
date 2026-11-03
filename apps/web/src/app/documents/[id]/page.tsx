import Link from "next/link";

import { DocumentDetail } from "@/components/documents/document-detail";
import { ReviewWorkspace } from "@/components/reviews/review-workspace";
import { requireClaims } from "@/lib/require-auth";

export default async function DocumentDetailPage({
  params,
}: PageProps<"/documents/[id]">) {
  const [, { id }] = await Promise.all([requireClaims(), params]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <Link
        href="/documents"
        className="text-xs text-black/50 underline-offset-2 hover:underline dark:text-white/50"
      >
        ← 목록으로
      </Link>

      <div className="mt-6">
        <DocumentDetail id={id} />
      </div>

      <div className="mt-10 border-t border-black/10 pt-10 dark:border-white/10">
        <ReviewWorkspace documentId={id} />
      </div>
    </main>
  );
}
