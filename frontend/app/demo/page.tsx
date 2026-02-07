"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillResults } from "@/components/bill-results";
import { DEMO_BILLS } from "@/lib/demo-data";
import { ArrowRight } from "lucide-react";

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState(DEMO_BILLS[0].id);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
          CareMap — Demo
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Click a tab to see instant analysis. No upload needed.
        </p>
      </div>

      {/* Big disclaimer */}
      <div className="mb-8 rounded-xl border-2 border-dashed border-warning/50 bg-warning/5 px-6 py-4 text-center">
        <p className="text-xl font-semibold text-warning-700">
          DEMO DATA — Not real patient information
        </p>
        <p className="mt-1 text-sm text-slate-600">
          All names, amounts, and details are fabricated for demonstration.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="mb-6 flex w-full flex-wrap justify-center gap-2 bg-slate-200/80 p-2">
          {DEMO_BILLS.map((bill) => (
            <TabsTrigger
              key={bill.id}
              value={bill.id}
              className="flex flex-col items-start gap-0.5 px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <span className="font-semibold">{bill.title}</span>
              <span className="text-xs font-normal text-slate-500">
                ${bill.billTotal.toLocaleString()} bill → ${bill.savings.toLocaleString()} savings
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {DEMO_BILLS.map((bill) => (
          <TabsContent key={bill.id} value={bill.id} className="mt-0">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
              <h2 className="mb-2 text-2xl font-bold text-slate-900">
                {bill.title}
              </h2>
              <p className="mb-6 text-slate-600">{bill.subtitle}</p>
              <BillResults billData={bill.data} />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* CTA */}
      <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-trust/30 bg-white p-6 text-center shadow-card md:p-8">
        <h2 className="text-2xl font-bold text-slate-900">
          Ready to analyze your own bill?
        </h2>
        <p className="text-base text-slate-600">
          Upload a PDF of your medical bill for AI-powered analysis.
        </p>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-trust px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-trust-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2"
        >
          Try with your own bill
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </main>
  );
}
