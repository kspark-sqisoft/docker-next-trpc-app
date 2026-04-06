import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { QueryErrorBoundary } from "@/components/error-boundary/query-error-boundary";
import { PostDetailSkeleton } from "@/components/scaffold/post-detail-skeleton";
import { PostDetailClient } from "../post-detail-client";

type Props = { params: Promise<{ id: string }> };

export default async function PostDetailPage({ params }: Props) {
  // App Router 동적 세그먼트는 Promise params (Next 15+)
  const { id } = await params;
  return (
    <QueryErrorBoundary>
      <Suspense fallback={<PostDetailSkeleton />}>
        <PostDetailClient id={id} />
      </Suspense>
    </QueryErrorBoundary>
  );
}
