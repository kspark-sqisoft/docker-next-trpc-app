"use client";

/**
 * 브라우저: TanStack Query + tRPC React 훅(api.post.list.useSuspenseQuery 등).
 * URL·쿠키(superjson) 설정이 서버 렌더링 시에도 동작하도록 getBaseUrl 을 둔다.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import superjson from "superjson";
import type { AppRouter } from "@/server/trpc/root";

export const api = createTRPCReact<AppRouter>();

/** 브라우저는 상대 경로, 서버(RSC 등)는 절대 URL 필요 */
function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
}

function trpcLinks() {
  return [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      // NextAuth 세션 쿠키를 tRPC 요청에 실어 보냄
      fetch(url, opts) {
        return fetch(url, { ...opts, credentials: "include" });
      },
    }),
  ];
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 이 시간 동안은 자동 재요청 전까지 신선한 데이터로 간주
            staleTime: 30_000,
          },
        },
      }),
  );
  // 링크·배치 설정은 마운트 시 한 번만 생성
  const [trpcClient] = useState(() =>
    api.createClient({
      links: trpcLinks(),
    }),
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}
