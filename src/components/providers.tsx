"use client";

/** 클라이언트 전역: NextAuth 세션 + tRPC/React Query */
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
