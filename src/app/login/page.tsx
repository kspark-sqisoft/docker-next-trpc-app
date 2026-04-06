"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useActionState } from "react";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actionLog, flowLog } from "@/lib/flow-log";

type LoginFormState = { error: string | null };

export default function LoginPage() {
  const router = useRouter();

  const [state, formAction] = useActionState(
    async (
      _prev: LoginFormState,
      formData: FormData,
    ): Promise<LoginFormState> => {
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      actionLog("auth-login", "폼 제출: 로그인", {
        email,
        passwordLen: password.length,
      });
      flowLog("auth-login", "signIn(credentials) 진행");
      try {
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (res?.error) {
          flowLog("auth-login", "signIn 실패(자격 증명)", { error: res.error });
          return {
            error: "이메일 또는 비밀번호가 올바르지 않습니다.",
          };
        }
        flowLog("auth-login", "signIn 성공 → router.push(/posts) + refresh");
        router.push("/posts");
        router.refresh();
        return { error: null };
      } catch {
        flowLog("auth-login", "signIn 예외");
        return { error: "로그인에 실패했습니다." };
      }
    },
    { error: null },
  );

  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>
            NextAuth.js Credentials + JWT 세션 쿠키로 인증합니다.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2 mb-4">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {state.error ? (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <FormSubmitButton
              pendingLabel="처리 중…"
              className="w-full sm:w-auto"
            >
              로그인
            </FormSubmitButton>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ variant: "link" }),
                "w-full sm:w-auto",
              )}
            >
              계정이 없으신가요?
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
