"use client";

/**
 * 브라우저: TanStack Query + tRPC React 훅(api.post.list.useSuspenseQuery 등).
 * URL·쿠키(superjson) 설정이 서버 렌더링 시에도 동작하도록 getBaseUrl 을 둔다.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useEffect, useState } from "react";
import superjson from "superjson";
import {
  logHttpFetchFailure,
  logHttpRequest,
  logHttpResponse,
  nextHttpLogId,
} from "@/lib/http-request-log";
import { flowLog } from "@/lib/flow-log";
import {
  GC_TIME_DEFAULT_MS,
  queryRetry,
  STALE_DEFAULT_MS,
} from "@/lib/query-cache";
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
      // NextAuth 세션 쿠키를 tRPC 요청에 실어 보냄 + 요청/응답·status 로그
      async fetch(url, opts) {
        const id = nextHttpLogId();
        const merged: RequestInit = { ...opts, credentials: "include" };
        logHttpRequest("trpc-http", id, {
          url: String(url),
          method: (merged.method as string) ?? "POST",
          init: merged,
        });
        try {
          const res = await fetch(url, merged);
          const bodyText = await res.clone().text();
          logHttpResponse("trpc-http", id, {
            url: String(url),
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            bodyText,
          });
          return res;
        } catch (e) {
          logHttpFetchFailure(
            "trpc-http",
            id,
            e instanceof Error ? e.message : String(e),
          );
          throw e;
        }
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
            staleTime: STALE_DEFAULT_MS,
            gcTime: GC_TIME_DEFAULT_MS,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: queryRetry,
          },
          mutations: {
            retry: false,
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

  useEffect(() => {
    flowLog("trpc-provider", "TrpcProvider 마운트", {
      baseUrl:
        typeof window !== "undefined"
          ? "(브라우저: 상대 경로 /api/trpc)"
          : getBaseUrl(),
    });
  }, []);

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}
