"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { PostImageAttachments } from "@/components/posts/post-image-attachments";
import { RequireAuth } from "@/components/require-auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

export default function PostNewPage() {
  // 비로그인이면 /login 으로 보내는 래퍼
  return (
    <RequireAuth>
      <PostNewForm />
    </RequireAuth>
  );
}

function PostNewForm() {
  const router = useRouter();
  const { status } = useSession();
  const utils = api.useUtils();
  const create = api.post.create.useMutation({
    onSuccess: async (post) => {
      // 새 글이 목록에 반영되도록 무한쿼리 갱신
      await utils.post.listInfinite.invalidate();
      router.push(`/posts/${post.id}`);
    },
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  // 이미지 업로드 중에는 제출 버튼도 막기 위한 플래그
  const [busy, setBusy] = useState(false);

  // RequireAuth 이후에도 클라이언트 세션 동기화 전 잠깐 비어 있을 수 있음
  if (status !== "authenticated") {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <Link
          href="/posts"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-2 -ml-2",
          )}
        >
          ← 목록
        </Link>
        <h1 className="text-2xl font-semibold">새 글</h1>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          // tRPC 뮤테이션: 서버에서 세션으로 작성자 확정
          create.mutate({ title, content, imageUrls });
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
          disabled={create.isPending || busy}
          onBusyChange={setBusy}
        />
        {create.error ? (
          <p className="text-destructive text-sm">{create.error.message}</p>
        ) : null}
        <Button type="submit" disabled={create.isPending || busy}>
          {create.isPending ? "저장 중…" : "등록"}
        </Button>
      </form>
    </div>
  );
}
