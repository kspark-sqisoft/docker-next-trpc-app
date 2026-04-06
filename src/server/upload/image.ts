export const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function assertImageMime(mimetype: string, label: string) {
  if (!IMAGE_MIME.has(mimetype)) {
    throw new Error(
      `${label}: 이미지(jpeg, png, webp, gif)만 업로드할 수 있습니다.`,
    );
  }
}
