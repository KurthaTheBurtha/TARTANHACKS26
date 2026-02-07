import LoadingSkeleton from "@/components/loading-skeleton";

export default function BillSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Savings card skeleton */}
      <div className="mb-8">
        <LoadingSkeleton type="card" className="h-28 rounded-2xl" />
      </div>

      {/* Table section skeleton */}
      <div className="rounded-xl bg-white p-6 shadow-card md:p-8">
        <div className="mb-6 space-y-2">
          <LoadingSkeleton type="text" className="h-6 w-48" />
          <LoadingSkeleton type="text" className="h-4 w-64" />
        </div>
        <LoadingSkeleton type="table" className="mt-4" />
      </div>
    </div>
  );
}
