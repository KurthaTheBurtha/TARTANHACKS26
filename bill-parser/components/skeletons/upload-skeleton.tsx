import LoadingSkeleton from "@/components/loading-skeleton";

export default function UploadSkeleton() {
  return (
    <div className="space-y-6">
      {/* Drop zone skeleton */}
      <div className="animate-pulse rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-200" />
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="h-4 w-64 rounded bg-slate-200" />
          <div className="h-3 w-40 rounded bg-slate-200" />
        </div>
      </div>

      {/* Button skeleton */}
      <LoadingSkeleton type="card" className="h-14" />
    </div>
  );
}
