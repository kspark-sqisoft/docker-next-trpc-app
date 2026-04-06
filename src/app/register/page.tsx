"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { registerUser } from "@/lib/auth-api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>
            계정 생성 후 같은 비밀번호로 자동 로그인됩니다.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setPending(true);
            try {
              // REST 로 사용자 행만 생성
              await registerUser({ email, password, name });
              const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
              });
              if (res?.error) {
                setErr("가입은 되었으나 로그인에 실패했습니다. 로그인 페이지에서 시도해 주세요.");
                return;
              }
              router.push("/posts");
              router.refresh();
            } catch (er) {
              setErr(er instanceof Error ? er.message : "회원가입 실패");
            } finally {
              setPending(false);
            }
          }}
        >
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 (8자 이상)</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {err ? (
              <p className="text-destructive text-sm" role="alert">
                {err}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "처리 중…" : "가입"}
            </Button>
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
