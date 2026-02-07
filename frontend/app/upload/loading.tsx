import UploadSkeleton from "@/components/skeletons/upload-skeleton";

export default function UploadLoading() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <UploadSkeleton />
    </div>
  );
}
