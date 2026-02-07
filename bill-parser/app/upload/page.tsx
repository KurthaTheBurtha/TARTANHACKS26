"use client";

import { BillUpload } from "@/components/bill-upload";
import { motion } from "framer-motion";
import { ChevronRight, Shield } from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
  return (
    <main id="main-content" className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-16 px-6">
      <motion.div
        className="mx-auto max-w-4xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-12 flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/"
            className="transition-colors hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2"
          >
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-700">Bill Analyzer</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900">
            Medical Bill Analyzer
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Upload your medical bill to find errors and overcharges
          </p>
        </header>

        {/* Upload area */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <BillUpload />
        </div>

        {/* Footer disclaimer */}
        <div className="mt-8 flex items-center gap-3 rounded-lg border border-trust/30 bg-trust/5 px-6 py-4">
          <Shield className="h-5 w-5 shrink-0 text-trust" />
          <p className="text-base text-slate-600">
            Your data is processed securely and never stored
          </p>
        </div>
      </motion.div>
    </main>
  );
}
