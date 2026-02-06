import Link from "next/link";
import { ArrowRight, Search, FileSpreadsheet, FileText, Upload, Zap, ClipboardCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-blue-950/30 dark:via-gray-950 dark:to-green-950/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.1),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-24 sm:px-6 sm:pt-24 sm:pb-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              Stop Overpaying for{" "}
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Healthcare
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl">
              AI-powered medical bill analysis finds errors and saves you money
            </p>
            <div className="mt-10">
              <Link
                href="/upload"
                className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
              >
                Analyze Your Bill
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="relative py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-800/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
                <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Find Overcharges
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                AI compares charges to fair pricing and flags suspicious amounts
              </p>
            </div>

            <div className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-800/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/50">
                <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Detailed Breakdown
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                See every line item explained with CPT codes and fair market values
              </p>
            </div>

            <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-gray-700">
              <span className="absolute right-4 top-4 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Coming soon
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <FileText className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Appeal Letters
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Generate professional appeal letters to dispute incorrect charges
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-200 bg-gray-50 py-20 dark:border-gray-800 dark:bg-gray-900/30 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600 dark:text-gray-400">
            Three simple steps to understand your medical bill
          </p>

          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Step 1
              </p>
              <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                Upload your bill
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Drop your PDF medical bill—we support statements from any provider
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                <Zap className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                Step 2
              </p>
              <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                AI analyzes in seconds
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Our AI extracts every charge, code, and detail from your document
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                <ClipboardCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Step 3
              </p>
              <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                Get savings report
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Review line items, insurance breakdown, and spot potential overcharges
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            <strong>Disclaimer:</strong> This tool is for informational purposes only and
            does not constitute medical or legal advice. Results are generated by AI and
            should be verified by a qualified professional. We do not guarantee accuracy
            or savings. Always consult your healthcare provider or billing department for
            official determinations.
          </p>
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} Medical Bill Analyzer. Your data is processed
            securely and not stored.
          </p>
        </div>
      </footer>
    </div>
  );
}
