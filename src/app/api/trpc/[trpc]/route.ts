/**
 * tRPC HTTP 어댑터: /api/trpc 로 들어온 GET·POST 를 appRouter 로 넘긴다.
 */
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/root";

// App Router 가 넘기는 표준 Request 로 배치·스트리밍 처리
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    // 쿠키·세션 기반 배치이므로 공유 캐시에 저장되면 안 됨. 브라우저·CDN 힌트만 명시.
    responseMeta() {
      const headers = new Headers();
      headers.set("Cache-Control", "private, no-store, must-revalidate");
      headers.set("Vary", "Cookie");
      return { headers };
    },
  });

export { handler as GET, handler as POST };
