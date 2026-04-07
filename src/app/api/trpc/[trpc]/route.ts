/**
 * tRPC HTTP 엔드포인트 — Next.js App Router 의 **Route Handler**.
 *
 * ## 왜 `fetchRequestHandler` 인가
 * App Router는 Node의 `IncomingMessage` 대신 Web 표준 **`Request` / `Response`** 를 쓴다.
 * 그래서 Pages Router 시절 어댑터가 아니라 `@trpc/server/adapters/fetch` 의
 * **`fetchRequestHandler`** 로 `appRouter` 에 연결한다.
 * @see https://trpc.io/docs/client/nextjs/app-router-setup
 *
 * ## 한 요청의 흐름
 * 1. 브라우저(또는 서버 측 fetch)가 `GET|POST /api/trpc/...` 로 배치 요청.
 * 2. Next가 이 파일의 `GET`/`POST` 로 `Request` 를 넘김.
 * 3. `fetchRequestHandler` 가 `createContext: createTRPCContext` 로 **ctx** 생성.
 * 4. `router: appRouter` 에서 프로시저 실행 → `Response` 반환.
 * 5. (학습용) `after()` 로 터미널에 쿼리/본문 **풀이 로그** 출력.
 *
 * ## 인자 정리
 * - `endpoint: "/api/trpc"` — 클라이언트 `httpBatchLink` 의 path 와 일치해야 함.
 * - `createContext` — **동기/비동기** 모두 가능; 여기서는 세션 로드를 위해 async.
 * - `responseMeta` — 응답 헤더(Cache-Control 등). 쿠키 기반이라 공유 캐시에 싣지 않게 함.
 */
import { after } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import {
  captureTrpcServerPostLogSnapshot,
  logTrpcServerIncomingGet,
  logTrpcServerPostFromSnapshot,
} from "@/lib/trpc-server-access-log";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/root";

const handler = async (req: Request) => {
  const method = (req.method || "GET").toUpperCase();
  const postSnapshot =
    method === "POST" ? await captureTrpcServerPostLogSnapshot(req) : null;

  const res = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    responseMeta() {
      const headers = new Headers();
      headers.set("Cache-Control", "private, no-store, must-revalidate");
      headers.set("Vary", "Cookie");
      return { headers };
    },
  });

  const url = req.url;
  if (method === "GET") {
    after(() => {
      logTrpcServerIncomingGet(url);
    });
  } else if (postSnapshot) {
    const snap = postSnapshot;
    after(() => {
      logTrpcServerPostFromSnapshot(snap.headline, snap.record);
    });
  }

  return res;
};

export { handler as GET, handler as POST };
