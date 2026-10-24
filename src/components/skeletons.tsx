import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton cards shown while a list of calls loads. */
export function CallsSkeleton() {
  return (
    <div className="grid items-start gap-5 md:grid-cols-2" aria-hidden>
      {[0, 1].map((index) => (
        <div key={index} className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton shown while a write-up loads. */
export function WriteupSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="space-y-3 border-b pb-6">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      {[0, 1].map((index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton rows shown while booking availability loads. */
export function SlotsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {[0, 1].map((group) => (
        <div key={group} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2].map((slot) => (
              <Skeleton key={slot} className="h-11 w-24 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
