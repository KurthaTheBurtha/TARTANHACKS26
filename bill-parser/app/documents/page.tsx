"use client";

import { useState, useCallback, useEffect, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileText, 
  Search, 
  Filter,
  Eye,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  CheckCircle2
} from "lucide-react";
import type { BillData, LineItem, InsuranceInfo } from "@/lib/types";
import { DEMO_BILLS } from "@/lib/demo-data";
import { showError, showLoading } from "@/lib/toast-utils";
import toast from "react-hot-toast";
import ProgressChecklist from "@/components/progress-checklist";
import BillSkeleton from "@/components/skeletons/bill-skeleton";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_CAREMAP_BACKEND_URL ||
  "http://localhost:8000";

/** Map backend CareMap ingest response to BillData */
function caremapResponseToBillData(res: {
  bill?: {
    provider_name?: string | null;
    facility_name?: string | null;
    service_dates?: string | null;
    total_billed?: number | null;
    patient_responsibility?: number | null;
    line_items?: Array<{
      description?: string;
      cpt_hcpcs?: string | null;
      units?: number | null;
      amount_billed?: number | null;
      amount_allowed?: number | null;
      notes?: string | null;
    }>;
  };
  insurance?: {
    deductible_individual?: number | null;
    patient_responsibility?: number | null;
  };
}): BillData {
  const bill = res.bill ?? {};
  const lineItems: LineItem[] = (bill.line_items ?? []).map((item) => {
    const units = item.units ?? 1;
    const amountBilled = item.amount_billed ?? 0;
    return {
      description: item.description ?? "Line item",
      cpt_code: item.cpt_hcpcs ?? null,
      quantity: units,
      unit_price: units > 0 ? amountBilled / units : amountBilled,
      total: amountBilled,
      date: bill.service_dates ?? null,
    };
  });
  const insuranceInfo: InsuranceInfo = {
    insurance_paid:
      bill.total_billed != null && bill.patient_responsibility != null
        ? bill.total_billed - bill.patient_responsibility
        : null,
    patient_responsibility: bill.patient_responsibility ?? res.insurance?.patient_responsibility ?? null,
    deductible_applied: res.insurance?.deductible_individual ?? null,
    copay: null,
  };
  return {
    patient_name: null,
    date_of_service: bill.service_dates ?? null,
    provider_name: bill.provider_name ?? null,
    provider_address: bill.facility_name ?? null,
    total_charges: bill.total_billed ?? null,
    line_items: lineItems.length > 0 ? lineItems : [{ description: "No line items", cpt_code: null, quantity: 1, unit_price: 0, total: 0, date: null }],
    insurance_info: insuranceInfo,
  };
}

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

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

// Mock documents for display
const mockDocuments = [
  {
    id: 1,
    name: "Hospital Bill - City Medical Center",
    type: "Hospital Bill",
    date: "Jan 15, 2024",
    status: "analyzed" as const,
    totalAmount: 2450.00,
    insurancePaid: 1800.00,
    youOwe: 450.00,
  },
  {
    id: 2,
    name: "Lab Results - Quest Diagnostics",
    type: "EOB",
    date: "Jan 8, 2024",
    status: "analyzed" as const,
    totalAmount: 325.50,
    insurancePaid: 200.00,
    youOwe: 125.50,
  },
  {
    id: 3,
    name: "MRI Scan - Downtown Imaging",
    type: "Hospital Bill",
    date: "Dec 28, 2023",
    status: "processing" as const,
    totalAmount: 0,
    insurancePaid: 0,
    youOwe: 0,
  },
  {
    id: 4,
    name: "Annual Checkup - Dr. Chen",
    type: "EOB",
    date: "Dec 15, 2023",
    status: "analyzed" as const,
    totalAmount: 250.00,
    insurancePaid: 225.00,
    youOwe: 25.00,
  },
];

const statusConfig = {
  analyzed: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", label: "Analyzed" },
  processing: { icon: Clock, color: "text-secondary", bg: "bg-secondary/10", label: "Processing" },
  error: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Error" },
};

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStepsComplete, setLoadingStepsComplete] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BillData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

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
    const maxBytes = 10 * 1024 * 1024;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return `${f.name} is not a PDF. Please select a .pdf file.`;
    if (f.size > maxBytes) return `${f.name} is too large (${formatFileSize(f.size)}). Maximum size is 10MB.`;
    return null;
  }, []);

  const handleFileSelect = useCallback((selectedFile: File | null) => {
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
  }, [validateFile]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    handleFileSelect(selectedFile ?? null);
    e.target.value = "";
  }, [handleFileSelect]);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    const loadingId = showLoading("Analyzing your bill...");

    try {
      const formData = new FormData();
      formData.append("bill_pdf", file);
      formData.append(
        "user_context",
        JSON.stringify({ radius_miles: 10, specialty_keywords: ["primary care"] })
      );

      const response = await fetch(`${BACKEND_URL}/v1/caremap/ingest`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const msg =
          (data.detail && (typeof data.detail === "string" ? data.detail : data.detail?.msg ?? JSON.stringify(data.detail)))
          ?? data.error
          ?? "Failed to analyze bill";
        throw new Error(msg);
      }

      const billData = caremapResponseToBillData(data);
      startTransition(() => {
        setResult(billData);
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

  const selectedDocument = mockDocuments.find(d => d.id === selectedDocId);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl lg:text-3xl text-foreground mb-1">
              Documents
            </h1>
            <p className="text-muted-foreground">
              Upload and analyze your medical bills and EOBs
            </p>
          </div>
          <button 
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold transition-colors shadow-card"
          >
            <Upload className="w-5 h-5" />
            Upload Document
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search documents..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-foreground font-medium">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document List */}
        <div className={`${selectedDocId || result ? 'w-1/2 border-r border-border' : 'w-full'} overflow-y-auto`}>
          {/* Upload Section at top when no result */}
          {!result && !loading && (
            <div className="p-6 border-b border-border">
              {/* Drop zone */}
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
                className={`
                  relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card p-8 transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                  ${
                    error && !file
                      ? "border-destructive bg-destructive/5"
                      : isDragging
                        ? "border-secondary scale-[1.01] bg-secondary/5"
                        : "border-border hover:border-secondary hover:bg-secondary/5"
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
                />
                <Upload
                  className={`mb-4 h-12 w-12 ${
                    error && !file ? "text-destructive" : "text-secondary"
                  }`}
                  strokeWidth={1.5}
                />
                <p className="text-center text-lg font-semibold text-foreground">
                  Drop PDF here or click to upload
                </p>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  PDF files up to 10MB
                </p>
              </div>

              {/* Selected file info */}
              {file && (
                <div className="mt-4 rounded-xl border-2 border-success bg-success/5 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Demo bills */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Quick demo:</span>
                {DEMO_BILLS.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => handleLoadDemo(demo)}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    {demo.title}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <p className="text-sm font-medium text-destructive">{error}</p>
                </div>
              )}

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={!file}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-8 py-3 text-base font-semibold text-secondary-foreground shadow-card transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DollarSign className="h-5 w-5" />
                Analyze Bill
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="p-6">
              <div className="rounded-xl border border-border bg-card p-6 mb-6">
                <ProgressChecklist steps={loadingSteps} />
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  This may take 10-20 seconds
                </p>
              </div>
              <BillSkeleton />
            </div>
          )}

          {/* Document List */}
          {!loading && (
            <div className="divide-y divide-border">
              {mockDocuments.map((doc) => {
                const status = statusConfig[doc.status];
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${
                      selectedDocId === doc.id ? 'bg-muted/50' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">{doc.name}</p>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">{doc.type}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{doc.date}</span>
                          <span className={`flex items-center gap-1 ${status.color}`}>
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    {doc.status === 'analyzed' && (
                      <div className="text-right">
                        <p className="font-semibold text-foreground">${doc.youOwe.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">You owe</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Document Detail / Results Panel */}
        {(selectedDocId || result) && (
          <div className="w-1/2 overflow-y-auto p-6 bg-muted/20">
            {result ? (
              <div className="space-y-6">
                {/* Success banner */}
                <div className="flex items-center gap-2 rounded-lg border border-success/50 bg-success/10 px-4 py-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-success" />
                  <div>
                    <p className="font-medium text-success">Bill analyzed successfully</p>
                    {file && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {file.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="bg-card rounded-xl border border-border p-5 shadow-card">
                  <h3 className="font-display font-semibold text-foreground mb-4">Cost Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Charges</span>
                      <span className="font-medium text-foreground">{formatCurrency(result.total_charges)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Insurance Paid</span>
                      <span className="font-medium text-success">-{formatCurrency(result.insurance_info.insurance_paid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Applied to Deductible</span>
                      <span className="font-medium text-foreground">{formatCurrency(result.insurance_info.deductible_applied)}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between">
                      <span className="font-semibold text-foreground">Your Responsibility</span>
                      <span className="font-bold text-lg text-foreground">{formatCurrency(result.insurance_info.patient_responsibility)}</span>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                {result.line_items.length > 0 && (
                  <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                      <h3 className="font-display font-semibold text-foreground">Itemized Charges</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {result.line_items.map((item, index) => (
                        <div key={index} className="px-5 py-3 flex justify-between">
                          <div>
                            <p className="font-medium text-foreground">{item.description}</p>
                            {item.cpt_code && (
                              <p className="text-sm text-muted-foreground">CPT: {item.cpt_code}</p>
                            )}
                          </div>
                          <span className="font-medium text-foreground">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                <div className="bg-secondary/10 rounded-xl p-5 border border-secondary/20">
                  <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    AI Insights
                  </h3>
                  <ul className="space-y-2 text-sm text-foreground">
                    <li>• This visit applied ${result.insurance_info.deductible_applied?.toFixed(2) || '0.00'} to your deductible.</li>
                    <li>• Your insurance covered {result.total_charges && result.insurance_info.insurance_paid ? Math.round((result.insurance_info.insurance_paid / result.total_charges) * 100) : 0}% of this bill.</li>
                    <li>• Review itemized charges for potential billing errors.</li>
                  </ul>
                </div>

                <button
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-foreground font-medium"
                >
                  Upload Another Bill
                </button>
              </div>
            ) : selectedDocument && selectedDocument.status === 'analyzed' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-xl text-foreground">
                    Bill Breakdown
                  </h2>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-foreground text-sm font-medium">
                      <Eye className="w-4 h-4" />
                      View Original
                    </button>
                    <button className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-foreground">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="bg-card rounded-xl border border-border p-5 shadow-card">
                  <h3 className="font-display font-semibold text-foreground mb-4">Cost Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Charges</span>
                      <span className="font-medium text-foreground">${selectedDocument.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Insurance Paid</span>
                      <span className="font-medium text-success">-${selectedDocument.insurancePaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Applied to Deductible</span>
                      <span className="font-medium text-foreground">$200.00</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between">
                      <span className="font-semibold text-foreground">Your Responsibility</span>
                      <span className="font-bold text-lg text-foreground">${selectedDocument.youOwe.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h3 className="font-display font-semibold text-foreground">Itemized Charges</h3>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="px-5 py-3 flex justify-between">
                      <div>
                        <p className="font-medium text-foreground">Office Visit - Level 3</p>
                        <p className="text-sm text-muted-foreground">CPT: 99213</p>
                      </div>
                      <span className="font-medium text-foreground">$150.00</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between">
                      <div>
                        <p className="font-medium text-foreground">Laboratory - Blood Panel</p>
                        <p className="text-sm text-muted-foreground">CPT: 80053</p>
                      </div>
                      <span className="font-medium text-foreground">$200.00</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between">
                      <div>
                        <p className="font-medium text-foreground">Facility Fee</p>
                        <p className="text-sm text-muted-foreground">General hospital services</p>
                      </div>
                      <span className="font-medium text-foreground">$100.00</span>
                    </div>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="bg-secondary/10 rounded-xl p-5 border border-secondary/20">
                  <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    AI Insights
                  </h3>
                  <ul className="space-y-2 text-sm text-foreground">
                    <li>• This visit applied $200 to your deductible, leaving $1,650 remaining.</li>
                    <li>• The facility fee is higher than average. You could ask for an itemized statement.</li>
                    <li>• Your insurance covered 73% of this bill, which is typical for in-network care.</li>
                  </ul>
                </div>
              </div>
            ) : selectedDocument && selectedDocument.status === 'processing' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-secondary animate-pulse" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">Analyzing Document</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    We&apos;re extracting and analyzing the information from your document. This usually takes 1-2 minutes.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
