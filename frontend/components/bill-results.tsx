"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, DollarSign, Shield, Copy, Download } from "lucide-react";
import type { BillData, LineItem } from "@/lib/types";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import SavingsCard from "@/components/savings-card";
import BillLineItem from "@/components/bill-line-item";
import toast from "react-hot-toast";

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatValue<T>(value: T | null): string {
  if (value == null || value === "") return "—";
  return String(value);
}

function formatCurrencyPlain(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);
}

/** Build a simple appeal letter from bill data for dispute/copy/download */
function buildAppealLetter(data: BillData): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const provider = data.provider_name || "Provider";
  const address = data.provider_address ? `\n${data.provider_address}` : "";
  const dateOfService = data.date_of_service || "[Date of service]";
  const totalCharges = formatCurrencyPlain(data.total_charges);
  const patientResp = formatCurrencyPlain(data.insurance_info?.patient_responsibility);
  const lineItemsText = (data.line_items ?? [])
    .map(
      (item, i) =>
        `  ${i + 1}. ${item.description}${item.cpt_code ? ` (${item.cpt_code})` : ""} – ${formatCurrencyPlain(item.total)}`
    )
    .join("\n");

  return `Billing Dispute / Appeal Letter
${today}

${provider}${address}

Re: Billing dispute – Date of service: ${dateOfService}

To Whom It May Concern,

I am writing to formally dispute the charges on my medical bill for services rendered on ${dateOfService}. I request a detailed review and an itemized breakdown of the charges listed below.

BILL SUMMARY
• Total charges: ${totalCharges}
• Amount I am being asked to pay: ${patientResp}

LINE ITEMS IN QUESTION
${lineItemsText}

I am requesting:
1. A full itemized statement for the above services.
2. Verification that the charges align with my insurance plan’s allowed amounts and that my patient responsibility was calculated correctly.
3. A written response within 30 days regarding this dispute.

Please contact me at your earliest convenience to resolve this matter. I have kept copies of all relevant documents for my records.

Sincerely,

[Your name]
[Your phone number]
[Your address or member ID if applicable]
`;
}

interface BillResultsProps {
  billData: BillData;
}

export function BillResults({ billData }: BillResultsProps) {
  const {
    patient_name,
    date_of_service,
    provider_name,
    provider_address,
    total_charges,
    line_items,
    insurance_info,
  } = billData;

  const [appealLetter, setAppealLetter] = useState<string | null>(null);
  const [showLetter, setShowLetter] = useState(false);

  const handleGenerateAppealLetter = useCallback(() => {
    const letter = buildAppealLetter(billData);
    setAppealLetter(letter);
    setShowLetter(true);
    toast.success("Appeal letter generated");
  }, [billData]);

  const handleCopyLetter = useCallback(() => {
    if (!appealLetter) return;
    navigator.clipboard.writeText(appealLetter).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Could not copy")
    );
  }, [appealLetter]);

  const handleDownloadLetter = useCallback(() => {
    if (!appealLetter) return;
    const blob = new Blob([appealLetter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appeal-letter-${provider_name?.replace(/\s+/g, "-") ?? "bill"}-${date_of_service ?? "dispute"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download started");
  }, [appealLetter, provider_name, date_of_service]);

  const billTotal = total_charges ?? 0;
  const totalSavings = billData.total_savings ?? 0;
  const errorsFound = billData.errors_found ?? 0;

  return (
    <motion.div
      className="mx-auto max-w-6xl space-y-6"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Savings card - prominent at top */}
      <div className="mb-8">
        <SavingsCard
          amount={totalSavings}
          billTotal={billTotal}
          errorsFound={errorsFound}
        />
      </div>

      {/* Patient & provider info card */}
      <div className="rounded-xl bg-white p-6 shadow-card md:p-8">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Bill Details
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Patient
            </p>
            <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {formatValue(patient_name)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Date of Service
            </p>
            <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {formatValue(date_of_service)}
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Provider
            </p>
            <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {formatValue(provider_name)}
            </p>
            {provider_address && (
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                {provider_address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Total charges */}
      <div className="rounded-xl bg-white p-6 shadow-card md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Total Charges
            </h2>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(total_charges)}
          </p>
        </div>
      </div>

      {/* Line items table */}
      {line_items.length > 0 && (
        <div className="rounded-xl bg-white p-6 shadow-card md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Line Item Breakdown
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Items highlighted have been overcharged
            </p>
          </div>
          <div className="-mx-6 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-left text-sm" role="table" aria-label="Line item breakdown">
              <caption className="sr-only">
                Medical bill line items with status, description, charged amount, fair price, and savings
              </caption>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 sm:px-6">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 sm:px-6">
                    Description
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 sm:px-6">
                    Charged
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 sm:table-cell sm:px-6">
                    Fair Price
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 sm:px-6">
                    Savings
                  </th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {line_items.map((item: LineItem, index: number) => (
                  <BillLineItem
                    key={index}
                    description={item.description}
                    cptCode={item.cpt_code}
                    charged={item.total}
                    fairPrice={item.fair_price ?? null}
                    savings={item.savings ?? null}
                    hasError={item.has_error ?? false}
                    index={index}
                    variants={staggerItem}
                  />
                ))}
              </motion.tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insurance information card */}
      <div className="rounded-xl bg-white p-6 shadow-card md:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Insurance Information
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsuranceItem
            label="Insurance Paid"
            value={insurance_info.insurance_paid}
          />
          <InsuranceItem
            label="Patient Responsibility"
            value={insurance_info.patient_responsibility}
          />
          <InsuranceItem
            label="Deductible Applied"
            value={insurance_info.deductible_applied}
          />
          <InsuranceItem label="Copay" value={insurance_info.copay} />
        </div>
      </div>

      {/* Generate Appeal Letter button */}
      <div className="space-y-4 pt-4">
        <motion.button
          type="button"
          aria-label="Generate appeal letter for billing disputes"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerateAppealLetter}
          className="flex items-center justify-center gap-2 rounded-lg bg-trust px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-trust-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-trust"
        >
          <FileText className="h-5 w-5" aria-hidden />
          Generate Appeal Letter
        </motion.button>

        {showLetter && appealLetter && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Your appeal letter</span>
              <button
                type="button"
                onClick={handleCopyLetter}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500"
              >
                <Copy className="h-4 w-4" aria-hidden />
                Copy
              </button>
              <button
                type="button"
                onClick={handleDownloadLetter}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500"
              >
                <Download className="h-4 w-4" aria-hidden />
                Download .txt
              </button>
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
              {appealLetter}
            </pre>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function InsuranceItem({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
        {formatCurrency(value)}
      </p>
    </div>
  );
}
