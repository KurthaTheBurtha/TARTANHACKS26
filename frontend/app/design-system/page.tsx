"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SavingsCard from "@/components/savings-card";
import BillLineItem from "@/components/bill-line-item";
import ProgressChecklist from "@/components/progress-checklist";
import LoadingSkeleton from "@/components/loading-skeleton";
import ErrorDisplay from "@/components/error-display";
import EmptyState from "@/components/empty-state";
import UploadSkeleton from "@/components/skeletons/upload-skeleton";

export default function DesignSystemPage() {
  return (
    <main id="main-content" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mb-2 text-4xl font-bold text-slate-900">
          Design System
        </h1>
        <p className="mb-12 text-base text-slate-600">
          Visual reference guide for CareMap components
        </p>

        <div className="space-y-16">
          {/* 1. Color swatches */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Colors
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  name: "Trust",
                  classes: [
                    "bg-trust",
                    "bg-trust-light",
                    "bg-trust-dark",
                    "bg-trust-700",
                  ],
                },
                {
                  name: "Savings",
                  classes: [
                    "bg-savings",
                    "bg-savings-light",
                    "bg-savings-dark",
                    "bg-savings-700",
                  ],
                },
                {
                  name: "Warning",
                  classes: [
                    "bg-warning",
                    "bg-warning-light",
                    "bg-warning-dark",
                    "bg-warning-700",
                  ],
                },
                {
                  name: "Danger",
                  classes: [
                    "bg-danger",
                    "bg-danger-light",
                    "bg-danger-dark",
                    "bg-danger-700",
                  ],
                },
              ].map((color) => (
                <div key={color.name}>
                  <p className="mb-3 text-sm font-semibold text-slate-900">
                    {color.name}
                  </p>
                  <div className="flex gap-2">
                    {color.classes.map((cls) => (
                      <div
                        key={cls}
                        className={`h-12 w-12 rounded-lg ${cls} ring-1 ring-slate-200`}
                        title={cls}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Typography */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Typography
            </h2>
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 md:p-8">
              <div>
                <p className="text-xs text-slate-500">text-xs</p>
                <p className="text-xs text-slate-900">
                  Tiny — labels, captions
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">text-sm</p>
                <p className="text-sm text-slate-900">
                  Small — secondary text
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">text-base</p>
                <p className="text-base text-slate-900">
                  Body — default paragraph
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">text-lg</p>
                <p className="text-lg text-slate-900">
                  Large — card titles
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">text-xl</p>
                <p className="text-xl font-semibold text-slate-900">
                  XL — section subtitles
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">text-2xl</p>
                <p className="text-2xl font-bold text-slate-900">
                  2XL — section headings
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">text-4xl</p>
                <p className="text-4xl font-bold text-slate-900">
                  4XL — page title
                </p>
              </div>
            </div>
          </section>

          {/* 3. Buttons */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Buttons
            </h2>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                className="rounded-lg bg-trust px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-trust-dark"
              >
                Primary
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                Secondary
              </button>
              <button
                type="button"
                className="rounded-lg bg-danger px-6 py-3 font-semibold text-white transition-colors hover:bg-danger-dark"
              >
                Destructive
              </button>
              <button
                type="button"
                disabled
                className="rounded-lg bg-trust px-6 py-3 font-semibold text-white opacity-50 disabled:cursor-not-allowed"
              >
                Disabled
              </button>
            </div>
          </section>

          {/* 4. SavingsCard */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              SavingsCard
            </h2>
            <div className="max-w-md">
              <SavingsCard
                amount={3247.5}
                billTotal={8421}
                errorsFound={4}
              />
            </div>
          </section>

          {/* 5. BillLineItem */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              BillLineItem
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600 sm:px-6">
                      Status
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600 sm:px-6">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600 sm:px-6">
                      Charged
                    </th>
                    <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600 sm:table-cell sm:px-6">
                      Fair Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600 sm:px-6">
                      Savings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <BillLineItem
                    description="Lab work - overcharged"
                    cptCode="80053"
                    charged={425}
                    fairPrice={42}
                    savings={383}
                    hasError={true}
                    index={0}
                  />
                  <BillLineItem
                    description="Office visit - correct"
                    cptCode="99213"
                    charged={125}
                    fairPrice={null}
                    savings={null}
                    hasError={false}
                    index={1}
                  />
                </tbody>
              </table>
            </div>
          </section>

          {/* 6. ProgressChecklist */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              ProgressChecklist
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="mb-4 text-sm font-medium text-slate-600">
                  Initial
                </p>
                <ProgressChecklist
                  steps={[
                    { label: "Step 1", complete: false },
                    { label: "Step 2", complete: false },
                    { label: "Step 3", complete: false },
                  ]}
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="mb-4 text-sm font-medium text-slate-600">
                  In progress
                </p>
                <ProgressChecklist
                  steps={[
                    { label: "Step 1", complete: true },
                    { label: "Step 2", complete: false },
                    { label: "Step 3", complete: false },
                  ]}
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="mb-4 text-sm font-medium text-slate-600">
                  Complete
                </p>
                <ProgressChecklist
                  steps={[
                    { label: "Step 1", complete: true },
                    { label: "Step 2", complete: true },
                    { label: "Step 3", complete: true },
                  ]}
                />
              </div>
            </div>
          </section>

          {/* 7. Loading skeletons */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Loading Skeletons
            </h2>
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-medium text-slate-600">Card</p>
                <LoadingSkeleton type="card" className="h-28 rounded-2xl" />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-slate-600">Table</p>
                <LoadingSkeleton type="table" />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-slate-600">Text</p>
                <LoadingSkeleton type="text" className="h-4 w-48" />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-slate-600">
                  Upload skeleton
                </p>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <UploadSkeleton />
                </div>
              </div>
            </div>
          </section>

          {/* 8. Error states */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Error States
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <ErrorDisplay
                title="Something went wrong"
                message="We couldn't analyze your bill. Please try again."
              />
              <ErrorDisplay
                title="With retry"
                message="Failed to process. Click to retry."
                onRetry={() => {}}
              />
            </div>
          </section>

          {/* 9. Empty states */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Empty States
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white">
              <EmptyState
                title="No bills yet"
                message="Upload your first medical bill to get started."
                action={
                  <button
                    type="button"
                    className="rounded-lg bg-trust px-4 py-2 text-sm font-semibold text-white hover:bg-trust-dark"
                  >
                    Upload Bill
                  </button>
                }
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
