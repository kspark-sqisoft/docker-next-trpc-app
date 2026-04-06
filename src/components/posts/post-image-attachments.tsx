"use client";

/* eslint-disable @next/next/no-img-element -- 업로드 미리보기 동적 URL */
import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { uploadPostImage } from "@/lib/auth-api";
import { actionLog } from "@/lib/flow-log";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  className?: string;
  onBusyChange?: (busy: boolean) => void;
};

const MAX_IMAGES = 5; // 서버 post 라우터와 동일 상한

export function PostImageAttachments({
  imageUrls,
  onChange,
  disabled,
  className,
  onBusyChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 부모 폼에서 제출 비활성화 등에 사용
    onBusyChange?.(uploading);
  }, [uploading, onBusyChange]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 허용
    if (!file) return;
    if (imageUrls.length >= MAX_IMAGES) {
      setError(`이미지는 최대 ${MAX_IMAGES}장입니다.`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      // REST 업로드 후 공개 URL 을 본문 imageUrls 배열에 누적
      const { url } = await uploadPostImage(file);
      onChange([...imageUrls, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    actionLog("post-images", "클릭: 첨부 이미지 제거", {
      index,
      remaining: imageUrls.length - 1,
    });
    onChange(imageUrls.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading || imageUrls.length >= MAX_IMAGES}
          className="gap-1.5"
          onClick={() => {
            actionLog("post-images", "클릭: 이미지 추가(파일 대화상자)");
            inputRef.current?.click();
          }}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-3.5" aria-hidden />
          )}
          이미지 추가
        </Button>
        <span className="text-muted-foreground text-xs">
          jpeg, png, webp, gif · 최대 {MAX_IMAGES}장 · 파일당 5MB
        </span>
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      {imageUrls.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {imageUrls.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="ring-border relative overflow-hidden rounded-lg ring-1"
            >
              <img
                src={url}
                alt=""
                className="bg-muted/40 aspect-video max-h-48 w-full object-contain"
              />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 size-8 opacity-90 shadow-sm"
                disabled={disabled || uploading}
                onClick={() => removeAt(i)}
                aria-label="이미지 제거"
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
