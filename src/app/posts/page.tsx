import { Suspense } from "react";

// 빌드 시 정적 프리렌더하지 않음(서버에서 tRPC 절대 URL 필요)
export const dynamic = "force-dynamic";
import { QueryErrorBoundary } from "@/components/error-boundary/query-error-boundary";
import { PostListSkeleton } from "@/components/scaffold/post-list-skeleton";
import { PostListClient } from "./post-list-client";

export default function PostListPage() {
  // tRPC Suspense 오류 시 react-query reset 과 연동
  return (
    <QueryErrorBoundary>
      <Suspense fallback={<PostListSkeleton />}>
        <PostListClient />
      </Suspense>
    </QueryErrorBoundary>
  );
}
