/**
 * 게시글 에디터용 이미지 한 장 업로드. 공개 URL(/uploads/posts/...)만 반환하고 DB는 글 저장 시 갱신.
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { jsonError, jsonOk } from "@/lib/http-json";
import { authOptions } from "@/lib/auth-options";
import { uploadsRoot } from "@/lib/env";
import { assertImageMime } from "@/server/upload/image";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const session = (await getServerSession(
    authOptions,
  )) as Session | null;
  if (!session?.user?.id) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError("multipart 요청이 아닙니다.", 400);
  }
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return jsonError("파일이 필요합니다.", 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError("파일이 너무 큽니다. (최대 5MB)", 400);
  }
  try {
    assertImageMime(file.type, "게시글 이미지");
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "업로드 실패", 400);
  }

  const ext = extname(file.name).toLowerCase() || ".bin";
  const filename = `${randomUUID()}${ext}`;
  const dir = join(uploadsRoot(), "posts");
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(join(dir, filename), buf);

  return jsonOk({ url: `/uploads/posts/${filename}` });
}
