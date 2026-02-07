"use client";

import { useState, useCallback, useEffect, Suspense, startTransition } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { slideUp } from "@/lib/animations";
import { FileText, AlertCircle, CheckCircle, Upload, DollarSign, CheckCircle2 } from "lucide-react";
import type { BillData } from "@/lib/types";
import { DEMO_BILLS } from "@/lib/demo-data";
import { showError, showLoading } from "@/lib/toast-utils";
import toast from "react-hot-toast";
import ProgressChecklist from "@/components/progress-checklist";
import BillSkeleton from "@/components/skeletons/bill-skeleton";

const BillResults = dynamic(() => import("@/components/bill-results").then((m) => ({ default: m.BillResults })), {
  loading: () => <BillSkeleton />,
  ssr: false,
});

const LOADING_STEPS = [
  "Uploading document...",
  "Processing PDF...",
  "Extracting line items...",
  "Comparing to Medicare rates...",
  "Analyzing for errors...",
  "Calculating savings...",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BillUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStepsComplete, setLoadingStepsComplete] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BillData | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Simulate progress every 3 seconds while loading
  useEffect(() => {
    if (!loading) return;
    setLoadingStepsComplete(0);
    const interval = setInterval(() => {
      setLoadingStepsComplete((prev) => {
        const next = prev + 1;
        if (next >= LOADING_STEPS.length) clearInterval(interval);
        return Math.min(next, LOADING_STEPS.length);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  const validateFile = useCallback((f: File): string | null => {
    const maxBytes = 10 * 1024 * 1024; // 10MB
    const isPdf =
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return `${f.name} is not a PDF. Please select a .pdf file.`;
    }
    if (f.size > maxBytes) {
      return `${f.name} is too large (${formatFileSize(f.size)}). Maximum size is 10MB.`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (selectedFile: File | null) => {
      setError(null);
      setResult(null);
      if (!selectedFile) {
        setFile(null);
        return;
      }
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        setFile(null);
        showError(validationError);
        return;
      }
      setFile(selectedFile);
    },
    [validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      handleFileSelect(selectedFile ?? null);
      e.target.value = ""; // Reset so same file can be selected again
    },
    [handleFileSelect]
  );

  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    const loadingId = showLoading("Analyzing your bill...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-bill", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to analyze bill");
      }

      startTransition(() => {
        setResult(data as BillData);
        toast.success("Bill analyzed successfully", { id: loadingId });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze bill";
      setError(message);
      toast.error(message, { id: loadingId });
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setError(null);
    setResult(null);
  }, []);

  const handleLoadDemo = useCallback((demoBill: (typeof DEMO_BILLS)[0]) => {
    setError(null);
    setFile(null);
    toast.success(`Loaded demo: ${demoBill.title}`);
    startTransition(() => {
      setResult(demoBill.data);
    });
  }, []);

  const loadingSteps = LOADING_STEPS.map((label, i) => ({
    label,
    complete: i < loadingStepsComplete,
  }));

  return (
    <div className="space-y-6" role="region" aria-label="Bill upload and analysis">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            variants={slideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-6"
            aria-live="polite"
            aria-busy="true"
            aria-label="Analyzing your bill"
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 dark:border-slate-700 dark:bg-slate-800/30 md:p-8">
              <ProgressChecklist steps={loadingSteps} />
              <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                This may take 10-20 seconds
              </p>
            </div>
            <BillSkeleton />
          </motion.div>
        ) : result && !error ? (
          <motion.div
            key="results"
            variants={slideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 rounded-lg border border-savings/50 bg-savings/10 px-4 py-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-savings" />
              <div>
                <p className="font-medium text-savings-dark dark:text-savings">
                  Bill analyzed successfully
                </p>
                {file && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <FileText className="h-4 w-4" />
                    {file.name}
                  </p>
                )}
              </div>
            </div>

            <Suspense fallback={<BillSkeleton />}>
              <BillResults billData={result} />
            </Suspense>

            <motion.button
              type="button"
              onClick={handleReset}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Upload another medical bill"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Upload Another Bill
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            variants={slideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-6"
          >
            {/* Drop zone - button for keyboard focus, label association for file input */}
            <div
              role="button"
              tabIndex={0}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  document.getElementById("file-input")?.click();
                }
              }}
              aria-label="Upload medical bill PDF. Drop file here or press Enter to select. Accepted: PDF files up to 10MB."
              className={`
                relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-gradient-to-br from-slate-50 to-trust/5 p-8 transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2
                md:p-12
                ${
                  error && !file
                    ? "border-danger bg-danger/5"
                    : isDragging
                      ? "border-trust-dark scale-[1.02] bg-trust/5"
                      : "border-trust hover:border-trust-dark hover:scale-[1.02] hover:bg-trust/5"
                }
              `}
            >
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileInputChange}
                tabIndex={-1}
                className="sr-only"
                aria-label="Select PDF file"
              />
              <Upload
                className={`mb-4 h-16 w-16 ${
                  error && !file ? "text-danger" : "text-trust"
                }`}
                strokeWidth={1.5}
              />
              <p className="text-center text-xl font-semibold text-slate-800">
                Drop PDF here or click to upload
              </p>
              <p className="mt-1 text-center text-sm text-slate-600">
                Upload your medical bill for analysis
              </p>
              <p className="mt-1 text-center text-xs text-slate-500">
                Accepted: PDF, up to 10MB
              </p>
            </div>

            {/* Selected file info */}
            {file && (
              <div className="rounded-2xl border-2 border-savings bg-savings/5 px-6 py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-savings" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {file.name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Demo bills - quick load for presentations */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 self-center text-sm text-slate-500">
                Quick demo:
              </span>
              {DEMO_BILLS.map((demo) => (
                <motion.button
                  key={demo.id}
                  type="button"
                  onClick={() => handleLoadDemo(demo)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2"
                >
                  {demo.title} (${demo.savings.toLocaleString()} saved)
                </motion.button>
              ))}
            </div>

            {/* Analyze button */}
            <motion.button
              type="button"
              onClick={handleAnalyze}
              disabled={!file}
              aria-label={file ? `Analyze medical bill: ${file.name}` : "Select a PDF file to analyze"}
              whileHover={{ scale: file ? 1.02 : 1 }}
              whileTap={{ scale: file ? 0.98 : 1 }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-trust px-8 py-4 text-base font-semibold text-white shadow-lg transition-colors hover:bg-trust-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-trust disabled:cursor-not-allowed disabled:opacity-50 md:text-lg"
            >
              <DollarSign className="h-5 w-5" aria-hidden />
              Analyze Bill
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-3 rounded-lg border border-danger/50 bg-danger/10 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
          <p className="text-sm font-medium text-danger-dark dark:text-danger">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
