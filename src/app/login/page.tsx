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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>
            NextAuth.js Credentials + JWT 세션 쿠키로 인증합니다.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setPending(true);
            try {
              // NextAuth Credentials → JWT 세션 쿠키 설정
              const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
              });
              if (res?.error) {
                setErr("이메일 또는 비밀번호가 올바르지 않습니다.");
                return;
              }
              router.push("/posts");
              // 서버 컴포넌트 트리가 새 세션을 읽도록 갱신
              router.refresh();
            } catch {
              setErr("로그인에 실패했습니다.");
            } finally {
              setPending(false);
            }
          }}
        >
          <CardContent className="space-y-4">
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
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              {pending ? "처리 중…" : "로그인"}
            </Button>
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
