/**
 * 업로드 디렉터리 정적 서빙: profiles/* · posts/* 만 허용(경로 탈출 방지).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { uploadsRoot } from "@/lib/env";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await ctx.params;
  if (!segments?.length) {
    return new Response("Not found", { status: 404 });
  }
  const rel = segments.join("/");
  if (!rel || rel.includes("..") || rel.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }
  const allowedPrefixes = ["profiles/", "posts/"];
  if (!allowedPrefixes.some((p) => rel.startsWith(p))) {
    return new Response("Not found", { status: 404 });
  }

  const root = uploadsRoot();
  const abs = join(root, rel);
  const normalizedRoot = join(root);
  if (!abs.startsWith(normalizedRoot)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buf = await readFile(abs);
    const ext = extOf(rel);
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new Response(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
