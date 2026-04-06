/**
 * DB에 랜덤 테스트 게시글을 넣습니다. 작성자는 users 테이블의 첫 번째 행입니다.
 * SEED_POST_COUNT 로 개수 조절 (기본 20).
 *
 * Docker: docker compose -f docker-compose.dev.yml exec app npm run db:seed:posts
 * 호스트(DB만 Docker): npm run db:seed:posts
 */
import { config } from "dotenv";

config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "../src/lib/env";
import * as schema from "../src/server/db/schema";

const COUNT = Math.min(500, Math.max(1, Number(process.env.SEED_POST_COUNT ?? "20")));

const subjects = [
  "Docker",
  "Next.js",
  "tRPC",
  "Drizzle",
  "Postgres",
  "HMR",
  "NextAuth",
  "업로드",
  "게시판",
  "타입스크립트",
];
const verbs = ["정리", "살펴보기", "실험", "메모", "이슈", "팁", "노트", "질문"];

function randomTitle(i: number) {
  const a = subjects[Math.floor(Math.random() * subjects.length)]!;
  const b = verbs[Math.floor(Math.random() * verbs.length)]!;
  const suffix = Math.random().toString(36).slice(2, 8);
  return `[테스트 ${i + 1}] ${a} ${b} #${suffix}`;
}

function randomContent() {
  const lines: string[] = [];
  const n = 2 + Math.floor(Math.random() * 4);
  for (let j = 0; j < n; j++) {
    lines.push(
      `문단 ${j + 1}: 샘플 본문입니다. seed 시각 ${new Date().toISOString()}, 난수 ${(Math.random() * 1e9).toFixed(0)}.`,
    );
  }
  return lines.join("\n\n");
}

async function main() {
  const url = getDatabaseUrl();
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  const usersRows = await db.select().from(schema.users).limit(1);
  const author = usersRows[0];
  if (!author) {
    console.error("사용자가 없습니다. 먼저 회원가입으로 계정을 만든 뒤 다시 실행하세요.");
    process.exit(1);
  }

  console.log(`작성자: ${author.name} (${author.email}) → 글 ${COUNT}개 삽입`);

  for (let i = 0; i < COUNT; i++) {
    await db.insert(schema.posts).values({
      title: randomTitle(i).slice(0, 200),
      content: randomContent(),
      authorId: author.id,
      imageUrls: [],
    });
  }

  await client.end();
  console.log("완료.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
