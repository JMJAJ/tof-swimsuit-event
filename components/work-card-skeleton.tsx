export function WorkCardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-card border border-border animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-[4/3] bg-muted" />
      
      {/* Content skeleton */}
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="flex justify-between">
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 bg-muted rounded w-8" />
          <div className="h-5 bg-muted rounded w-8" />
        </div>
      </div>
    </div>
  )
}