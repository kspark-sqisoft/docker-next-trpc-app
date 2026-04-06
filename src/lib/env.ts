/**
 * 런타임 환경 변수 파싱·캐시. Drizzle/업로드 경로가 여기서 통일된다.
 */
import path from "node:path";
import { z } from "zod";

const schema = z.object({
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().default("board"),
  DB_PASSWORD: z.string().default("board"),
  DB_NAME: z.string().default("board"),
  UPLOADS_DIR: z.string().optional(),
});

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  cached = schema.parse(process.env);
  return cached;
}

export function getDatabaseUrl(): string {
  const e = getEnv();
  const user = encodeURIComponent(e.DB_USERNAME);
  const pass = encodeURIComponent(e.DB_PASSWORD);
  return `postgresql://${user}:${pass}@${e.DB_HOST}:${e.DB_PORT}/${e.DB_NAME}`;
}

export function uploadsRoot(): string {
  const dir = getEnv().UPLOADS_DIR;
  if (dir) return dir;
  return path.join(process.cwd(), "uploads");
}
