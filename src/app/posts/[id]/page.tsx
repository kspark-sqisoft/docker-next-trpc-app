import { Suspense } from "react";
import { QueryErrorBoundary } from "@/components/error-boundary/query-error-boundary";
import { PostDetailSkeleton } from "@/components/scaffold/post-detail-skeleton";
import { flowLog } from "@/lib/flow-log";
import { PostDetailClient } from "../post-detail-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  flowLog("rsc-post-detail", "PostDetailPage(서버) 렌더", { id });
  return (
    <QueryErrorBoundary>
      <Suspense fallback={<PostDetailSkeleton />}>
        <PostDetailClient id={id} />
      </Suspense>
    </QueryErrorBoundary>
  );
}
