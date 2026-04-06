"use client";

/* eslint-disable @next/next/no-img-element -- 게시글 첨부 동적 URL */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STALE_POST_DETAIL_MS } from "@/lib/query-cache";
import { api } from "@/trpc/react";

export function PostDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  // 단건 조회: Suspense가 데이터 준비될 때까지 상위 fallback 표시
  const [post] = api.post.byId.useSuspenseQuery(
    { id },
    { staleTime: STALE_POST_DETAIL_MS },
  );
  const utils = api.useUtils();

  const del = api.post.delete.useMutation({
    onSuccess: async () => {
      // 목록 무한쿼리 캐시 무효화 후 게시판으로 이동
      await utils.post.listInfinite.invalidate();
      router.push("/posts");
    },
  });

  // 세션 사용자와 글 작성자 id 가 같을 때만 수정·삭제 UI
  const isAuthor = Boolean(
    session?.user?.id &&
      post.authorId &&
      session.user.id === post.authorId,
  );

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          href="/posts"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2",
          )}
        >
          ← 목록
        </Link>
        {/* 로그인 + 작성자일 때만 편집·삭제 */}
        {status === "authenticated" && isAuthor ? (
          <div className="flex gap-2">
            <Link
              href={`/posts/${post.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              수정
            </Link>
            <Button
              variant="destructive"
              size="sm"
              disabled={del.isPending}
              onClick={() => {
                if (confirm("이 글을 삭제할까요?")) {
                  del.mutate({ id: post.id });
                }
              }}
            >
              {del.isPending ? "삭제 중…" : "삭제"}
            </Button>
          </div>
        ) : null}
      </div>
      <header className="space-y-1 border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
        <p className="text-muted-foreground text-sm">
          {post.authorName ?? "익명"} ·{" "}
          {new Date(post.createdAt).toLocaleString("ko-KR")}
        </p>
      </header>
      <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap">
        {post.content}
      </div>
      {post.imageUrls.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {post.imageUrls.map((url) => (
            <li
              key={url}
              className="ring-border overflow-hidden rounded-lg ring-1"
            >
              <img
                src={url}
                alt=""
                className="bg-muted/30 max-h-80 w-full object-contain"
              />
            </li>
          ))}
        </ul>
      ) : null}
      {del.error ? (
        <p className="text-destructive text-sm">{del.error.message}</p>
      ) : null}
    </article>
  );
}
