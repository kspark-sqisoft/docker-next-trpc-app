"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PostDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-6">
      <h2 className="font-medium">글을 불러오지 못했습니다</h2>
      <p className="text-muted-foreground mt-2 text-sm">{error.message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={reset}>
          다시 시도
        </Button>
        <Link href="/posts" className={cn(buttonVariants({ variant: "ghost" }))}>
          목록으로
        </Link>
      </div>
    </div>
  );
}
