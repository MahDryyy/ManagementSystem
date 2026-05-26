import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

function StatCardSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-14 w-14 rounded-2xl" />
      </div>
    </SkeletonCard>
  );
}

function PieChartSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-9 w-72 max-w-full rounded-full" />
      </div>
      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Skeleton className="h-[180px] w-[180px] shrink-0 rounded-full" />
        <div className="w-full flex-1 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonCard>
  );
}

function StatusPerawatanSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </SkeletonCard>
  );
}

function BarChartSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-56 rounded-full" />
      </div>
      <div className="mt-6 space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

function TableSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </SkeletonCard>
  );
}

export default function DashboardPasienSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-8">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <PieChartSkeleton />
        <StatusPerawatanSkeleton />
      </div>

      <div className="mt-6">
        <BarChartSkeleton />
      </div>

      <div className="mt-6">
        <TableSkeleton />
      </div>
    </div>
  );
}

export { PieChartSkeleton, BarChartSkeleton, TableSkeleton };
