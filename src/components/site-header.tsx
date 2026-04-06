"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { User } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 좌측 고정 네비 항목
const nav = [
  { href: "/posts", label: "게시판" },
  { href: "/profile", label: "프로필" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
        <nav className="flex items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                // 현재 경로와 일치하면 강조
                pathname === item.href && "bg-accent text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {/* 세션 훅 초기 하이드레이션 */}
          {status === "loading" ? (
            <span className="text-muted-foreground text-sm">…</span>
          ) : session?.user ? (
            <>
              <Link
                href="/profile"
                aria-label={`프로필 (${session.user.name ?? "사용자"})`}
                className="text-muted-foreground hover:text-foreground flex min-w-0 max-w-56 items-center gap-2 rounded-md py-1 text-sm transition-colors"
              >
                <span className="bg-muted relative size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                  {/* 세션의 picture(JWT) → 프로필 이미지 URL */}
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt=""
                      width={32}
                      height={32}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center">
                      <User
                        className="text-muted-foreground size-4"
                        aria-hidden
                      />
                    </span>
                  )}
                </span>
                <span className="hidden truncate sm:inline">
                  {session.user.name}
                </span>
              </Link>
              {/* NextAuth 세션 종료 후 게시판으로 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut({ callbackUrl: "/posts" })}
              >
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                로그인
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
