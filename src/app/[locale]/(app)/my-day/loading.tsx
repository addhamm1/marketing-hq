import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      {[2, 2, 1, 1].map((rows, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className={rows === 2 ? "h-28 w-full rounded-xl" : "h-14 w-full rounded-xl"} />
        </div>
      ))}
    </div>
  );
}
