"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useState } from "react";
import { PostImageAttachments } from "@/components/posts/post-image-attachments";
import { RequireAuth } from "@/components/require-auth";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actionLog, flowLog } from "@/lib/flow-log";
import { api } from "@/trpc/react";

type PostFormState = { error: string | null };

export default function PostNewPage() {
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
      flowLog("post-create", "mutation onSuccess", { id: post.id });
      await utils.post.listInfinite.invalidate();
      router.push(`/posts/${post.id}`);
    },
    onError: (e) => {
      flowLog("post-create", "mutation onError", { message: e.message });
    },
  });

  const [imageUrls, setImageUrls] = useState<string[]>([]);
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
      actionLog("post-new", "폼 제출: 글 등록", {
        titleLen: title.length,
        contentLen: content.length,
        imageCount: parsedUrls.length,
      });
      flowLog("post-new", "post.create 진행");
      try {
        await create.mutateAsync({
          title,
          content,
          imageUrls: parsedUrls.length > 0 ? parsedUrls : undefined,
        });
        flowLog("post-new", "post.create mutateAsync 완료(라우팅은 onSuccess)");
        return { error: null };
      } catch (e) {
        flowLog("post-new", "post.create 실패", {
          message: e instanceof Error ? e.message : String(e),
        });
        return {
          error: e instanceof Error ? e.message : "저장 실패",
        };
      }
    },
    { error: null },
  );

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
      <form className="space-y-4" action={formAction}>
        <input
          type="hidden"
          name="imageUrls"
          value={JSON.stringify(imageUrls)}
          aria-hidden
        />
        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" maxLength={200} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content">내용</Label>
          <Textarea id="content" name="content" rows={8} required />
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
          등록
        </FormSubmitButton>
      </form>
    </div>
  );
}
