"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RootError({
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
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>오류</CardTitle>
          <CardDescription>
            이 구간에서 예외가 발생했습니다. (App Router{" "}
            <code className="text-foreground">error.tsx</code>)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">{error.message}</p>
        </CardContent>
        <CardFooter>
          <Button type="button" onClick={() => reset()}>
            다시 시도
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
