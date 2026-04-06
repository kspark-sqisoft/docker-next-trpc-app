import { Suspense } from "react";
import { QueryErrorBoundary } from "@/components/error-boundary/query-error-boundary";
import { PostEditSkeleton } from "@/components/scaffold/post-edit-skeleton";
import { RequireAuth } from "@/components/require-auth";
import { flowLog } from "@/lib/flow-log";
import { PostEditClient } from "./post-edit-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PostEditPage({ params }: Props) {
  const { id } = await params;
  flowLog("rsc-post-edit", "PostEditPage(서버) 렌더", { id });
  return (
    <RequireAuth>
      <QueryErrorBoundary>
        <Suspense fallback={<PostEditSkeleton />}>
          {/* id 가 바뀌면 폼 state 초기화 */}
          <PostEditClient key={id} id={id} />
        </Suspense>
      </QueryErrorBoundary>
    </RequireAuth>
  );
}
