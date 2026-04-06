"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useState } from "react";
import { PostImageAttachments } from "@/components/posts/post-image-attachments";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actionLog, flowLog } from "@/lib/flow-log";
import { STALE_POST_DETAIL_MS } from "@/lib/query-cache";
import { api } from "@/trpc/react";

type PostFormState = { error: string | null };

export function PostEditClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [post] = api.post.byId.useSuspenseQuery(
    { id },
    { staleTime: STALE_POST_DETAIL_MS },
  );
  const utils = api.useUtils();

  const update = api.post.update.useMutation({
    onSuccess: async (p) => {
      flowLog("post-update", "mutation onSuccess", { id: p.id });
      await utils.post.listInfinite.invalidate();
      await utils.post.byId.invalidate({ id: p.id });
      router.push(`/posts/${p.id}`);
    },
    onError: (e) => {
      flowLog("post-update", "mutation onError", { message: e.message });
    },
  });

  const [imageUrls, setImageUrls] = useState<string[]>(post.imageUrls ?? []);
  const [busy, setBusy] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (
      _prev: PostFormState,
      formData: FormData,
    ): Promise<PostFormState> => {
      const title = String(formData.get("title") ?? "");
      const content = String(formData.get("content") ?? "");
      let parsedUrls: string[] = [];
      try {
        const raw = formData.get("imageUrls");
        if (raw != null && String(raw) !== "") {
          const v = JSON.parse(String(raw)) as unknown;
          if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
            return { error: "첨부 정보가 올바르지 않습니다." };
          }
          parsedUrls = v;
        }
      } catch {
        return { error: "첨부 정보가 올바르지 않습니다." };
      }
      actionLog("post-edit", "폼 제출: 글 수정", {
        id,
        titleLen: title.length,
        contentLen: content.length,
        imageCount: parsedUrls.length,
      });
      flowLog("post-edit", "post.update 진행");
      try {
        await update.mutateAsync({
          id,
          title,
          content,
          imageUrls: parsedUrls,
        });
        flowLog("post-edit", "post.update mutateAsync 완료");
        return { error: null };
      } catch (e) {
        flowLog("post-edit", "post.update 실패", {
          message: e instanceof Error ? e.message : String(e),
        });
        return {
          error: e instanceof Error ? e.message : "저장 실패",
        };
      }
    },
    { error: null },
  );

  const isAuthor = Boolean(
    session?.user?.id &&
      post.authorId &&
      session.user.id === post.authorId,
  );
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
      <form className="space-y-4" action={formAction}>
        <input
          type="hidden"
          name="imageUrls"
          value={JSON.stringify(imageUrls)}
          aria-hidden
        />
        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            name="title"
            defaultValue={post.title}
            maxLength={200}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content">내용</Label>
          <Textarea
            id="content"
            name="content"
            defaultValue={post.content}
            rows={8}
            required
          />
        </div>
        <PostImageAttachments
          imageUrls={imageUrls}
          onChange={setImageUrls}
          disabled={busy || isPending}
          onBusyChange={setBusy}
        />
        {state.error ? (
          <p className="text-destructive text-sm">{state.error}</p>
        ) : null}
        <FormSubmitButton pendingLabel="저장 중…" disabled={busy}>
          저장
        </FormSubmitButton>
      </form>
    </div>
  );
}
