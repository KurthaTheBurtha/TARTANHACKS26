interface LoadingSkeletonProps {
  type: "card" | "table" | "text";
  className?: string;
}

export default function LoadingSkeleton({ type, className = "" }: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-slate-200 rounded";

  if (type === "card") {
    return (
      <div
        className={`h-32 w-full ${baseClasses} ${className}`}
        aria-hidden
      />
    );
  }

  if (type === "table") {
    return (
      <div className={`space-y-3 ${className}`} aria-hidden>
        {[0.9, 0.7, 0.85, 0.6, 0.95].map((width, i) => (
          <div
            key={i}
            className={`h-12 ${baseClasses}`}
            style={{ width: `${width * 100}%` }}
          />
        ))}
      </div>
    );
  }

  // text
  return (
    <div
      className={`h-4 w-3/4 ${baseClasses} ${className}`}
      aria-hidden
    />
  );
}
