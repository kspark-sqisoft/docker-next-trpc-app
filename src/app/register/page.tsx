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
import { registerUser } from "@/lib/auth-api";

type RegisterFormState = { error: string | null };

export default function RegisterPage() {
  const router = useRouter();

  const [state, formAction] = useActionState(
    async (
      _prev: RegisterFormState,
      formData: FormData,
    ): Promise<RegisterFormState> => {
      const name = String(formData.get("name") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      actionLog("auth-register", "폼 제출: 회원가입", {
        email,
        name,
        passwordLen: password.length,
      });
      flowLog("auth-register", "registerUser → signIn 진행");
      try {
        await registerUser({ email, password, name });
        flowLog("auth-register", "registerUser 완료 → signIn");
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (res?.error) {
          flowLog("auth-register", "가입 후 signIn 실패", { error: res.error });
          return {
            error:
              "가입은 되었으나 로그인에 실패했습니다. 로그인 페이지에서 시도해 주세요.",
          };
        }
        flowLog("auth-register", "가입+로그인 성공 → /posts");
        router.push("/posts");
        router.refresh();
        return { error: null };
      } catch (er) {
        flowLog("auth-register", "회원가입 흐름 예외", {
          message: er instanceof Error ? er.message : String(er),
        });
        return {
          error: er instanceof Error ? er.message : "회원가입 실패",
        };
      }
    },
    { error: null },
  );

  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>
            계정 생성 후 같은 비밀번호로 자동 로그인됩니다.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 (8자 이상)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
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
              가입
            </FormSubmitButton>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "link" }),
                "w-full sm:w-auto",
              )}
            >
              이미 계정이 있나요?
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
