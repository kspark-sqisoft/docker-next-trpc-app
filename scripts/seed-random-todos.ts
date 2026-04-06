/**
 * DB에 랜덤 테스트 할 일을 넣습니다. 소유자는 users 테이블의 첫 번째 행입니다.
 * SEED_TODO_COUNT 로 개수 조절 (기본 10).
 *
 * Docker: docker compose -f docker-compose.dev.yml exec app npm run db:seed:todos
 * 호스트(DB만 Docker): npm run db:seed:todos
 */
import { config } from "dotenv";

config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "../src/lib/env";
import * as schema from "../src/server/db/schema";

const COUNT = Math.min(500, Math.max(1, Number(process.env.SEED_TODO_COUNT ?? "10")));

const tasks = [
  "README 검토",
  "환경 변수 점검",
  "Docker 이미지 빌드",
  "단위 테스트 추가",
  "ESLint 경고 정리",
  "의존성 업데이트 확인",
  "API 문서 보강",
  "로그인 플로우 수동 테스트",
  "DB 마이그레이션 백업",
  "에러 바운더리 동작 확인",
  "tRPC 라우터 타입 확인",
  "게시판 무한 스크롤 점검",
  "프로필 이미지 업로드 테스트",
  "시드 스크립트 실행",
  "배포 체크리스트",
];

const prefixes = ["[오늘]", "[이번 주]", "[백로그]", "[긴급]", "[테스트]"];

function randomTitle(i: number) {
  const base = tasks[Math.floor(Math.random() * tasks.length)]!;
  const pre = prefixes[Math.floor(Math.random() * prefixes.length)]!;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${pre} ${base} #${suffix} (${i + 1})`.slice(0, 500);
}

async function main() {
  const url = getDatabaseUrl();
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  const usersRows = await db.select().from(schema.users).limit(1);
  const user = usersRows[0];
  if (!user) {
    console.error("사용자가 없습니다. 먼저 회원가입으로 계정을 만든 뒤 다시 실행하세요.");
    process.exit(1);
  }

  console.log(`사용자: ${user.name} (${user.email}) → 할 일 ${COUNT}개 삽입`);

  const rows = Array.from({ length: COUNT }, (_, i) => ({
    title: randomTitle(i),
    completed: Math.random() < 0.4,
    userId: user.id,
  }));

  await db.insert(schema.todos).values(rows);

  await client.end();
  console.log("완료.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
