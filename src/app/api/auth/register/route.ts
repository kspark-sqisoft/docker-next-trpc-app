/**
 * 회원가입 전용 REST: 사용자 행만 생성. 로그인은 클라이언트에서 signIn('credentials') 로 처리.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { uploadsRoot } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http-json";
import {
  createUser,
  findByEmailWithSecrets,
  toSafe,
} from "@/server/services/users";

const bodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("잘못된 요청 본문입니다.", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("입력값을 확인해 주세요.", 400);
  }
  const dto = parsed.data;

  // 동일 이메일이면 409 로 중복 가입 방지
  const existing = await findByEmailWithSecrets(dto.email);
  if (existing) {
    return jsonError("이미 사용 중인 이메일입니다.", 409);
  }

  const passwordHash = await bcrypt.hash(dto.password, 10); // 평문 비밀번호는 저장하지 않음
  const user = await createUser({
    email: dto.email,
    passwordHash,
    name: dto.name,
  });

  await ensurePlaceholderUploadDirs();

  return jsonOk({ user: toSafe(user) });
}

async function ensurePlaceholderUploadDirs() {
  try {
    const root = uploadsRoot();
    await mkdir(join(root, "profiles"), { recursive: true });
    await mkdir(join(root, "posts"), { recursive: true });
  } catch {
    /* optional */
  }
}
