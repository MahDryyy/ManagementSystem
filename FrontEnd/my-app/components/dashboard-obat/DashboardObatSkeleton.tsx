import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

function StatCardSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-14 w-14 rounded-2xl" />
      </div>
    </SkeletonCard>
  );
}

function ChartSkeleton() {
  return (
    <SkeletonCard>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />
      <Skeleton className="mt-6 h-[240px] w-full rounded-xl" />
    </SkeletonCard>
  );
}

function PieSkeleton() {
  return (
    <SkeletonCard>
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-2 h-4 w-36" />
      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Skeleton className="h-[180px] w-[180px] shrink-0 rounded-full" />
        <div className="w-full flex-1 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonCard>
  );
}

function ActivitySkeleton() {
  return (
    <SkeletonCard>
      <Skeleton className="h-5 w-52" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </SkeletonCard>
  );
}

export default function DashboardObatSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-8">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <PieSkeleton />
      </div>

      <div className="mt-6">
        <ActivitySkeleton />
      </div>
    </div>
  );
}
