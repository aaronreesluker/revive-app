"use client";

type SkeletonLoaderProps = {
  className?: string;
  lines?: number;
  width?: string;
};

export function SkeletonLoader({ className = "", lines = 1, width = "100%" }: SkeletonLoaderProps) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="rounded"
          style={{
            width: i === lines - 1 ? width : "100%",
            height: "1rem",
            background: "color-mix(in oklab, var(--panel), transparent 60%)",
          }}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-2">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-10 flex-1 rounded animate-pulse"
              style={{
                background: "color-mix(in oklab, var(--panel), transparent 60%)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-white/10 p-4 animate-pulse"
          style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}
        >
          <div className="h-4 w-24 mb-3 rounded" style={{ background: "color-mix(in oklab, var(--panel), transparent 60%)" }} />
          <div className="h-8 w-32 mb-2 rounded" style={{ background: "color-mix(in oklab, var(--panel), transparent 60%)" }} />
          <div className="h-3 w-40 rounded" style={{ background: "color-mix(in oklab, var(--panel), transparent 60%)" }} />
        </div>
      ))}
    </div>
  );
}


