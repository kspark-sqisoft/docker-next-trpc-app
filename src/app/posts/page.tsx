import { Suspense } from "react";
import { QueryErrorBoundary } from "@/components/error-boundary/query-error-boundary";
import { PostListSkeleton } from "@/components/scaffold/post-list-skeleton";
import { TrpcDehydratedStateBoundary } from "@/components/trpc-dehydrated-state-boundary";
import { flowLog } from "@/lib/flow-log";
import { prefetchPostListInfiniteDehydratedState } from "@/server/trpc/prefetch-post-list";
import { PostListClient } from "./post-list-client";

// 빌드 시 정적 프리렌더하지 않음(서버에서 tRPC 절대 URL 필요)
export const dynamic = "force-dynamic";

export default async function PostListPage() {
  flowLog(
    "rsc-posts",
    "PostListPage(서버): post.listInfinite 프리패치 → HydrationBoundary + PostListClient",
  );
  const dehydratedState = await prefetchPostListInfiniteDehydratedState();

  return (
    <QueryErrorBoundary>
      <TrpcDehydratedStateBoundary dehydratedState={dehydratedState}>
        <Suspense fallback={<PostListSkeleton />}>
          <PostListClient />
        </Suspense>
      </TrpcDehydratedStateBoundary>
    </QueryErrorBoundary>
  );
}
