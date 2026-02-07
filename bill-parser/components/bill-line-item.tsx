"use client";

import { motion, type Variants } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

interface BillLineItemProps {
  description: string;
  cptCode: string | null;
  charged: number;
  fairPrice: number | null;
  savings: number | null;
  hasError: boolean;
  index: number;
  variants?: Variants;
}

export default function BillLineItem({
  description,
  cptCode,
  charged,
  fairPrice,
  savings,
  hasError,
  index,
  variants,
}: BillLineItemProps) {
  return (
    <motion.tr
      variants={variants}
      initial={variants ? "initial" : { opacity: 0, y: 8 }}
      animate={variants ? "animate" : { opacity: 1, y: 0 }}
      transition={
        variants
          ? undefined
          : { duration: 0.3, delay: index * 0.05, ease: "easeOut" }
      }
      className={`
        border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50
        dark:border-slate-800 dark:hover:bg-slate-800/50
        ${hasError ? "bg-warning/5" : ""}
      `}
    >
      <td className={`px-4 py-4 sm:px-6 ${hasError ? "border-l-4 border-l-warning" : ""}`}>
        {hasError ? (
          <AlertCircle className="h-5 w-5 text-danger" aria-hidden />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-savings" aria-hidden />
        )}
      </td>
      <td className="px-4 py-4 sm:px-6">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {description}
          </p>
          {cptCode && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              CPT {cptCode}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-4 font-mono text-right text-slate-900 dark:text-slate-100 sm:px-6">
        {formatCurrency(charged)}
      </td>
      <td className="hidden px-4 py-4 font-mono text-right text-slate-600 dark:text-slate-400 sm:table-cell sm:px-6">
        {fairPrice != null ? formatCurrency(fairPrice) : "—"}
      </td>
      <td className="px-4 py-4 font-mono text-right sm:px-6">
        {savings != null && savings > 0 ? (
          <span className="text-savings font-medium">
            {formatCurrency(savings)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </motion.tr>
  );
}
