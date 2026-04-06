import { Skeleton } from "@/components/ui/skeleton";

export function PostDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2 border-b pb-4">
        <Skeleton className="h-9 w-3/4 max-w-xl" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
