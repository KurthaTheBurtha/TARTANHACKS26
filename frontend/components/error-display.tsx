"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface ErrorDisplayProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({
  title,
  message,
  onRetry,
}: ErrorDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center rounded-xl border border-danger/20 bg-danger/5 p-8 text-center"
    >
      <AlertCircle className="mb-4 h-16 w-16 text-danger" strokeWidth={1.5} />
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-lg bg-danger px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-danger-dark"
        >
          Try Again
        </button>
      )}
    </motion.div>
  );
}
