import { BillUpload } from "@/components/bill-upload";
import Link from "next/link";

export default function UploadPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-12 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          ← Back to home
        </Link>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
            Medical Bill Analyzer
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
            Upload your medical bill to find errors and overcharges
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 sm:p-8">
          <BillUpload />
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Your data is processed securely and not stored
        </p>
      </div>
    </div>
  );
}
