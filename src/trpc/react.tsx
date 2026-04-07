"use client";

/**
 * 브라우저(클라이언트 컴포넌트)에서 쓰는 **tRPC + TanStack Query** 진입점.
 * 공식 가이드의 `trpc/client.tsx` + `trpc/query-client.ts` 역할을 한 파일에 둔 형태에 가깝다.
 *
 * @see https://trpc.io/docs/client/nextjs/app-router-setup
 *
 * ## 구성 요소와 역할
 *
 * 1. **`createTRPCReact<AppRouter>()`**
 *    - 서버의 `AppRouter` **타입만** 가져와 React 훅 팩토리 `api` 를 만든다.
 *    - 가이드 최신 예는 `createTRPCContext` + `useTRPC()` + `queryOptions` 조합이지만,
 *      `api.post.byId.useSuspenseQuery` 패턴도 동일하게 지원된다.
 *
 * 2. **`QueryClient`**
 *    - TanStack Query의 **서버 상태 캐시** 본체. staleTime, gcTime, retry 등은 여기서 기본값.
 *    - tRPC 훅은 내부적으로 이 클라이언트에 쿼리 키·데이터를 저장한다.
 *
 * 3. **`api.createClient({ links: [httpBatchLink(...)] })`**
 *    - 실제 HTTP를 날리는 **tRPC 클라이언트**. `httpBatchLink`가 여러 호출을 한 요청으로 묶는다.
 *    - `transformer: superjson` 은 서버 `initTRPC` 와 반드시 짝을 맞춘다.
 *
 * 4. **`getBaseUrl()`**
 *    - 브라우저: 상대 경로 `""` → 같은 origin 의 `/api/trpc`.
 *    - 서버(RSC 등): `VERCEL_URL` / `NEXT_PUBLIC_APP_URL` 로 **절대 URL** (fetch에 필요).
 *
 * 5. **`TrpcProvider`**
 *    - `api.Provider` 에 tRPC 클라이언트 + **같은** `queryClient` 를 넘긴다.
 *    - 자식에 `QueryClientProvider` 로 동일 인스턴스를 또 감싸, 모든 훅이 한 캐시를 본다.
 *
 * 6. **`dehydrate.serializeData` / `hydrate.deserializeData`**
 *    - RSC에서 `createServerSideHelpers().dehydrate()` 한 스냅샷을 클라이언트로 넘길 때
 *      `Date` 등이 깨지지 않도록 superjson으로 직렬화한다.
 *
 * ## 마운트 위치
 * `AppProviders` (`components/providers.tsx`) 안에서 `SessionProvider` 다음에 감싼다.
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

/** tRPC 클라이언트가 쓸 링크: 배치 URL + superjson + 세션 쿠키 + (학습용) HTTP 로그 */
function trpcLinks() {
  return [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
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
          dehydrate: {
            serializeData: superjson.serialize,
          },
          hydrate: {
            deserializeData: superjson.deserialize,
          },
        },
      }),
  );
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
