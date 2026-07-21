export function Skeleton({ className = "", style = {} }) {
  return (
    <div
      className={`shimmer ${className}`}
      style={style}
    />
  );
}

export function PriceCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </div>
  );
}