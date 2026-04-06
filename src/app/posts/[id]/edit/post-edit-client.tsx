"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { PostImageAttachments } from "@/components/posts/post-image-attachments";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

export function PostEditClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [post] = api.post.byId.useSuspenseQuery({ id });
  const utils = api.useUtils();

  const update = api.post.update.useMutation({
    onSuccess: async (p) => {
      await utils.post.listInfinite.invalidate();
      // 상세 캐시도 갱신해 이전 본문이 남지 않게 함
      await utils.post.byId.invalidate({ id: p.id });
      router.push(`/posts/${p.id}`);
    },
  });

  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [imageUrls, setImageUrls] = useState<string[]>(post.imageUrls ?? []);
  const [busy, setBusy] = useState(false);

  const isAuthor = Boolean(
    session?.user?.id &&
      post.authorId &&
      session.user.id === post.authorId,
  );
  // 작성자가 아니면 폼 대신 안내만
  if (!isAuthor) {
    return (
      <p className="text-muted-foreground text-sm">
        본인이 작성한 글만 수정할 수 있습니다.{" "}
        <Link href={`/posts/${id}`} className="text-primary underline">
          상세로
        </Link>
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <Link
          href={`/posts/${id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-2 -ml-2",
          )}
        >
          ← 상세
        </Link>
        <h1 className="text-2xl font-semibold">글 수정</h1>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({
            id,
            title,
            content,
            imageUrls,
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content">내용</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            required
          />
        </div>
        <PostImageAttachments
          imageUrls={imageUrls}
          onChange={setImageUrls}
          disabled={update.isPending || busy}
          onBusyChange={setBusy}
        />
        {update.error ? (
          <p className="text-destructive text-sm">{update.error.message}</p>
        ) : null}
        <Button type="submit" disabled={update.isPending || busy}>
          {update.isPending ? "저장 중…" : "저장"}
        </Button>
      </form>
    </div>
  );
}
