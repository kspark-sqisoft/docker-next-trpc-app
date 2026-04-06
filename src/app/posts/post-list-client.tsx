"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/scaffold/page-shell";
import { cn } from "@/lib/utils";
import {
  GC_TIME_INFINITE_MS,
  STALE_POST_LIST_MS,
} from "@/lib/query-cache";
import { api } from "@/trpc/react";

// 서버 listInfinite 한 번에 가져올 행 수(커서 페이지 크기)
const PAGE_SIZE = 20;

export function PostListClient() {
  // NextAuth 세션 상태(로그인 시 글쓰기 버튼 표시)
  const { status } = useSession();
  // 스크롤 감지용 맨 아래 표식 DOM
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 첫 페이지는 Suspense가 기다림, 이후는 fetchNextPage로 페이지 누적
  const [data, query] = api.post.listInfinite.useSuspenseInfiniteQuery(
    { limit: PAGE_SIZE },
    {
      staleTime: STALE_POST_LIST_MS,
      gcTime: GC_TIME_INFINITE_MS,
      // 다음 요청에 넣을 커서; 없으면 TanStack Query가 더 불러오지 않음
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );

  // 다음 페이지 fetch·더 있음 여부·추가 로딩 중 플래그
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  // pages 배열을 한 줄 목록으로 펼침(화면에는 전체 누적 글)
  const items = data.pages.flatMap((p) => p.items);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    // 뷰포트와 겹치면 콜백 호출 → 무한 스크롤 트리거
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!hasNextPage || isFetchingNextPage) return;
        void fetchNextPage();
      },
      // root=null 은 브라우저 창 기준, rootMargin 으로 바닥 도달 전에 미리 로드
      { root: null, rootMargin: "200px", threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <PageShell
      title="게시판"
      description="공개 목록 · 스크롤 시 이전 글을 불러옵니다 · 글쓰기는 로그인 후 가능합니다"
      actions={
        // 로그인된 경우에만 글쓰기 링크 노출
        status === "authenticated" ? (
          <Link href="/posts/new" className={cn(buttonVariants())}>
            글쓰기
          </Link>
        ) : null
      }
    >
      {/* 첫 페이지까지 비어 있으면 안내 문구 */}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">첫 글을 작성해 보세요.</p>
      ) : null}

      <ul className="space-y-3">
        {/* 누적된 모든 페이지 행을 순서대로 렌더 */}
        {items.map((p) => (
          <li key={p.id}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  <Link
                    href={`/posts/${p.id}`}
                    className="hover:text-primary underline-offset-4 hover:underline"
                  >
                    {p.title}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {p.authorName ?? "익명"} ·{" "}
                  {new Date(p.createdAt).toLocaleString("ko-KR")}
                </CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>

      {/* 감시 대상: 여기가 보이면 다음 페이지 요청 */}
      <div ref={sentinelRef} className="h-4 w-full shrink-0" aria-hidden />

      {/* 추가 페이지 네트워크 요청 중 */}
      {isFetchingNextPage ? (
        <p className="text-muted-foreground mt-4 text-center text-sm">
          불러오는 중…
        </p>
      ) : null}

      {/* nextCursor 없음 = 서버에 더 이상 구간 없음 */}
      {!hasNextPage && items.length > 0 ? (
        <p className="text-muted-foreground mt-4 text-center text-sm">
          모든 글을 불러왔습니다.
        </p>
      ) : null}
    </PageShell>
  );
}
