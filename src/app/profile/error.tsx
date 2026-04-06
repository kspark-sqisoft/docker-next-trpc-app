"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { actionLog } from "@/lib/flow-log";

export default function ProfileError({
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
      <h2 className="font-medium">프로필을 불러오지 못했습니다</h2>
      <p className="text-muted-foreground mt-2 text-sm">{error.message}</p>
      <Button
        className="mt-4"
        type="button"
        variant="outline"
        onClick={() => {
          actionLog("error-profile", "클릭: 다시 시도 (프로필)");
          reset();
        }}
      >
        다시 시도
      </Button>
    </div>
  );
}
