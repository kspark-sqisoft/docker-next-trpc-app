"use client";

/* eslint-disable @next/next/no-img-element -- 사용자 업로드 동적 URL */
import { Suspense, useActionState, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { inferRouterOutputs } from "@trpc/server";
import { QueryErrorBoundary } from "@/components/error-boundary/query-error-boundary";
import { RequireAuth } from "@/components/require-auth";
import { ProfileSkeleton } from "@/components/scaffold/profile-skeleton";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { uploadAvatar } from "@/lib/auth-api";
import { actionLog, flowLog } from "@/lib/flow-log";
import type { AppRouter } from "@/server/trpc/root";
import { STALE_AUTH_ME_MS } from "@/lib/query-cache";
import { api } from "@/trpc/react";

type AuthMe = inferRouterOutputs<AppRouter>["auth"]["me"];

export default function ProfilePage() {
  return (
    <RequireAuth>
      {/* 프로필 tRPC 실패 시 경계에서 복구 */}
      <QueryErrorBoundary>
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileInner />
        </Suspense>
      </QueryErrorBoundary>
    </RequireAuth>
  );
}

function ProfileNameForm({
  initialName,
  updateNameMut,
}: {
  initialName: string;
  updateNameMut: {
    mutateAsync: (input: { name: string }) => Promise<AuthMe>;
  };
}) {
  const [nameErr, formAction] = useActionState(
    async (
      _prev: string | null,
      formData: FormData,
    ): Promise<string | null> => {
      const name = String(formData.get("name") ?? "").trim();
      actionLog("profile-name", "폼 제출: 표시 이름 저장", {
        nameLen: name.length,
      });
      flowLog("profile-name", "updateName 진행");
      try {
        await updateNameMut.mutateAsync({ name });
        flowLog("profile-name", "updateName 성공");
        return null;
      } catch (er) {
        flowLog("profile-name", "updateName 실패", {
          message: er instanceof Error ? er.message : String(er),
        });
        return er instanceof Error ? er.message : "저장 실패";
      }
    },
    null,
  );

  return (
    <form className="space-y-3" action={formAction}>
      <div className="space-y-2">
        <Label htmlFor="name">표시 이름</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initialName}
          maxLength={100}
          required
        />
      </div>
      {nameErr ? (
        <p className="text-destructive text-sm">{nameErr}</p>
      ) : null}
      <FormSubmitButton size="sm" pendingLabel="저장 중…">
        이름 저장
      </FormSubmitButton>
    </form>
  );
}

function ProfileInner() {
  const { update } = useSession();
  const utils = api.useUtils();
  const [me] = api.auth.me.useSuspenseQuery(undefined, {
    staleTime: STALE_AUTH_ME_MS,
  });
  const updateNameMut = api.auth.updateName.useMutation({
    onSuccess: async (user) => {
      flowLog("profile-name", "mutation onSuccess → invalidate auth.me + session.update");
      await utils.auth.me.invalidate();
      // JWT 세션 클레임을 DB 와 맞춰 헤더 등 즉시 반영
      await update({
        name: user.name,
        image: user.profileImageUrl ?? undefined,
      });
    },
  });

  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // updatedAt 이 바뀌면 이름 폼을 초기값으로 리셋
  const nameFormKey = `${me.id}-${
    me.updatedAt instanceof Date
      ? me.updatedAt.toISOString()
      : String(me.updatedAt)
  }`;

  useEffect(() => {
    flowLog("profile", "auth.me 준비됨(Suspense 이후)", {
      userId: me.id,
      email: me.email,
    });
  }, [me.id, me.email]);

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">프로필</h1>
        <p className="text-muted-foreground text-sm">
          NextAuth 세션 + tRPC <code className="text-foreground">auth.me</code>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{me.name}</CardTitle>
          <CardDescription>{me.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-muted relative size-20 overflow-hidden rounded-full ring-2 ring-border">
              {me.profileImageUrl ? (
                <img
                  src={me.profileImageUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-muted-foreground flex size-full items-center justify-center text-xs">
                  no img
                </span>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  setAvatarErr(null);
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  void (async () => {
                    flowLog("profile-avatar", "uploadAvatar 시작", {
                      file: f.name,
                      size: f.size,
                    });
                    try {
                      const u = await uploadAvatar(f);
                      flowLog("profile-avatar", "uploadAvatar 성공 → invalidate + session.update");
                      await utils.auth.me.invalidate();
                      await update({
                        name: u.name,
                        image: u.profileImageUrl ?? undefined,
                      });
                    } catch (er) {
                      flowLog("profile-avatar", "uploadAvatar 실패", {
                        message: er instanceof Error ? er.message : String(er),
                      });
                      setAvatarErr(
                        er instanceof Error
                          ? er.message
                          : "이미지 업로드에 실패했습니다.",
                      );
                    }
                  })();
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  actionLog("profile-avatar", "클릭: 아바타 파일 선택 창 열기");
                  fileRef.current?.click();
                }}
              >
                아바타 업로드
              </Button>
              <p className="text-muted-foreground text-xs">
                jpeg/png/webp/gif, 최대 2MB ·{" "}
                <code className="text-foreground">POST /api/upload/avatar</code>
              </p>
            </div>
          </div>
          {avatarErr ? (
            <p className="text-destructive text-sm" role="alert">
              {avatarErr}
            </p>
          ) : null}

          <Separator />

          <ProfileNameForm
            key={nameFormKey}
            initialName={me.name}
            updateNameMut={updateNameMut}
          />
        </CardContent>
      </Card>
    </div>
  );
}
