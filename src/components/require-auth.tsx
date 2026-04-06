"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { flowLog } from "@/lib/flow-log";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    flowLog("require-auth", "세션 상태 변경", { status });
    // 클라이언트에서만 리다이렉트(깜빡임 최소화)
    if (status === "unauthenticated") {
      flowLog("require-auth", "unauthenticated → router.replace(/login)");
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-sm">
        세션 확인 중…
      </div>
    );
  }
  if (status === "unauthenticated") {
    // replace 직후 빈 화면
    return null;
  }
  return <>{children}</>;
}
