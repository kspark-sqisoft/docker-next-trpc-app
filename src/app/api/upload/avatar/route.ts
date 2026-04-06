/**
 * 프로필 이미지 multipart 업로드 → 디스크 저장 후 users.profile_image_url 갱신
 */
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { jsonError, jsonOk } from "@/lib/http-json";
import { authOptions } from "@/lib/auth-options";
import { uploadsRoot } from "@/lib/env";
import { assertImageMime } from "@/server/upload/image";
import { findById, setProfileImageUrl } from "@/server/services/users";

const MAX_BYTES = 2 * 1024 * 1024;

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
    return jsonError("파일이 너무 큽니다. (최대 2MB)", 400);
  }
  try {
    assertImageMime(file.type, "아바타");
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "업로드 실패", 400);
  }

  const ext = extname(file.name).toLowerCase() || ".bin";
  const filename = `${randomUUID()}${ext}`;
  const dir = join(uploadsRoot(), "profiles");
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(join(dir, filename), buf);

  const full = await findById(session.user.id);
  if (!full) {
    return jsonError("사용자를 찾을 수 없습니다.", 404);
  }
  const prev = full.profileImageUrl;
  if (prev?.startsWith("/uploads/profiles/")) {
    const prevName = prev.replace("/uploads/profiles/", "");
    if (prevName && !prevName.includes("..") && !prevName.includes("/")) {
      try {
        await unlink(join(dir, prevName));
      } catch {
        /* ignore */
      }
    }
  }

  const url = `/uploads/profiles/${filename}`;
  const next = await setProfileImageUrl(session.user.id, url);
  return jsonOk(next);
}
