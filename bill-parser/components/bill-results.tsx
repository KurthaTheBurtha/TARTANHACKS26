"use client";

import { FileText, DollarSign, Building2, Shield } from "lucide-react";
import type { BillData, LineItem } from "@/lib/types";

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

interface BillResultsProps {
  billData: BillData;
}

export function BillResults({ billData }: BillResultsProps) {
  const { patient_name, date_of_service, provider_name, provider_address, total_charges, line_items, insurance_info } = billData;

  return (
    <div className="space-y-6">
      {/* Patient & provider info card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Bill Details
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Patient
            </p>
            <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
              {formatValue(patient_name)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Date of Service
            </p>
            <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
              {formatValue(date_of_service)}
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Provider
            </p>
            <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
              {formatValue(provider_name)}
            </p>
            {provider_address && (
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                {provider_address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Total charges */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Total Charges
            </h2>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(total_charges)}
          </p>
        </div>
      </div>

      {/* Line items table */}
      {line_items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Line Items
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <th className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Description
                  </th>
                  <th className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    CPT Code
                  </th>
                  <th className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">
                    Qty
                  </th>
                  <th className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">
                    Unit Price
                  </th>
                  <th className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {line_items.map((item: LineItem, index: number) => (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 last:border-0 dark:border-gray-700/50 ${
                      index % 2 === 0
                        ? "bg-white dark:bg-gray-900/50"
                        : "bg-gray-50/50 dark:bg-gray-800/30"
                    }`}
                  >
                    <td className="px-5 py-3 text-gray-900 dark:text-gray-100">
                      {formatValue(item.description)}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {formatValue(item.cpt_code)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">
                      {item.quantity}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insurance information card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Insurance Information
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsuranceItem label="Insurance Paid" value={insurance_info.insurance_paid} />
          <InsuranceItem label="Patient Responsibility" value={insurance_info.patient_responsibility} />
          <InsuranceItem label="Deductible Applied" value={insurance_info.deductible_applied} />
          <InsuranceItem label="Copay" value={insurance_info.copay} />
        </div>
      </div>
    </div>
  );
}

function InsuranceItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
        {formatCurrency(value)}
      </p>
    </div>
  );
}
