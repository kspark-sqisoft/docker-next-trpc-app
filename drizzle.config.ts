import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url =
  process.env.DATABASE_URL ??
  (() => {
    const host = process.env.DB_HOST ?? "localhost";
    const port = process.env.DB_PORT ?? "5432";
    const user = encodeURIComponent(process.env.DB_USERNAME ?? "board");
    const pass = encodeURIComponent(process.env.DB_PASSWORD ?? "board");
    const name = process.env.DB_NAME ?? "board";
    return `postgresql://${user}:${pass}@${host}:${port}/${name}`;
  })();

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
