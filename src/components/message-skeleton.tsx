import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton bubbles shown while a conversation is loading. */
export function MessageSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="ml-auto w-2/3 max-w-md space-y-2">
        <Skeleton className="h-5 w-full rounded-xl" />
        <Skeleton className="h-5 w-3/4 rounded-xl" />
      </div>
      <div className="w-3/4 max-w-lg space-y-2">
        <Skeleton className="h-5 w-full rounded-xl" />
        <Skeleton className="h-5 w-2/3 rounded-xl" />
      </div>
      <div className="ml-auto w-1/2 max-w-sm space-y-2">
        <Skeleton className="h-5 w-full rounded-xl" />
      </div>
    </div>
  );
}
