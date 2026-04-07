"use client";

/**
 * 루트 레이아웃에서 감싸는 **클라이언트 전역 프로바이더**.
 *
 * 순서: `SessionProvider` → `TrpcProvider`(내부에 QueryClient + tRPC 클라이언트).
 * tRPC 요청에 세션 쿠키를 실으려면 `httpBatchLink` 의 `credentials: "include"` 와 이 순서가 맞으면 된다.
 *
 * @see https://trpc.io/docs/client/nextjs/app-router-setup (Mount the provider)
 */
import { SessionProvider } from "next-auth/react";
import { TrpcProvider } from "@/trpc/react";

export function AppProviders({ children }: { children: React.ReactNode }) {
  // 창 포커스 시 세션 재검증(다른 탭에서 로그아웃 등 반영)
  return (
    <SessionProvider refetchOnWindowFocus>
      <TrpcProvider>{children}</TrpcProvider>
    </SessionProvider>
  );
}
