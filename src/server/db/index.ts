/** postgres-js 단일 클라이언트(개발 시 HMR 중복 연결 방지용 global 캐시) */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  queryClient?: ReturnType<typeof postgres>;
};

function createClient() {
  const url = getDatabaseUrl();
  return postgres(url, { max: 10 });
}

const client = globalForDb.queryClient ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = client;
}

export const db = drizzle(client, { schema });
