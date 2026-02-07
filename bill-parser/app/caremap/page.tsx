"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, FileText, Shield, AlertCircle } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_CAREMAP_BACKEND_URL || "http://localhost:8000";

interface CaremapLineItem {
  description: string;
  cpt_hcpcs?: string | null;
  units?: number | null;
  amount_billed?: number | null;
  amount_allowed?: number | null;
  notes?: string | null;
}

interface NavigationResult {
  name: string;
  npi?: string | null;
  address: string;
  phone?: string | null;
  distance_miles?: number | null;
  lat: number;
  lng: number;
  network_status: "in_network" | "out_of_network" | "unknown";
  source: string;
}

interface CaremapResponse {
  bill: {
    provider_name?: string | null;
    facility_name?: string | null;
    service_dates?: string | null;
    total_billed?: number | null;
    patient_responsibility?: number | null;
    line_items: CaremapLineItem[];
  };
  insurance: {
    deductible_individual?: number | null;
    oop_max_individual?: number | null;
    disclaimers: string[];
  };
  guidance: {
    summary_plain_english: string;
    next_steps: string[];
  };
  navigation: {
    query_used: string;
    results: NavigationResult[];
  };
  errors: { component: string; message: string; recoverable: boolean }[];
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);
}

export default function CaremapPage() {
  const [billFile, setBillFile] = useState<File | null>(null);
  const [sobFile, setSobFile] = useState<File | null>(null);
  const [zipCode, setZipCode] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaremapResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!billFile) {
      setError("Please select a bill PDF.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("bill_pdf", billFile);
      if (sobFile) form.append("sob_pdf", sobFile);
      form.append(
        "user_context",
        JSON.stringify({
          zip_code: zipCode || undefined,
          radius_miles: 10,
          specialty_keywords: specialty ? specialty.split(",").map((s) => s.trim()).filter(Boolean) : ["primary care"],
        })
      );
      const res = await fetch(`${BACKEND_URL}/v1/caremap/ingest`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Request failed: ${res.status}`);
      }
      const data: CaremapResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-16 px-6">
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-900 hover:underline">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-700">CareMap — Full flow</span>
        </nav>

        <header className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900">CareMap — Bill + Benefits + Navigation</h1>
          <p className="mt-2 text-lg text-slate-600">
            Upload a medical bill (and optional summary of benefits) to get a plain-English breakdown, insurance guidance, and nearby in-network options.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700">Bill or EOB PDF (required)</label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setBillFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-trust/10 file:px-4 file:py-2 file:text-trust"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Summary of benefits PDF (optional)</label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setSobFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">ZIP code (optional)</label>
              <input
                type="text"
                placeholder="15213"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-trust focus:ring-1 focus:ring-trust"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Specialty keywords (optional, comma-separated)</label>
              <input
                type="text"
                placeholder="primary care, cardiology"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-trust focus:ring-1 focus:ring-trust"
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-trust px-6 py-3 font-medium text-white shadow-sm hover:bg-trust/90 disabled:opacity-60"
          >
            {loading ? "Processing…" : "Get breakdown + navigation"}
          </button>
        </form>

        {result && (
          <div className="mt-12 space-y-10">
            {/* Bill breakdown */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-slate-500" />
                Bill breakdown
              </h2>
              {result.bill.provider_name && (
                <p className="text-sm text-slate-600">Provider: {result.bill.provider_name}</p>
              )}
              {result.bill.service_dates && (
                <p className="text-sm text-slate-600">Service dates: {result.bill.service_dates}</p>
              )}
              <ul className="mt-4 space-y-2">
                {result.bill.line_items.map((item, i) => (
                  <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-2">
                    <span className="font-medium text-slate-900">{item.description}</span>
                    <span className="text-slate-600">
                      {item.cpt_hcpcs && <code className="mr-2 text-xs">{item.cpt_hcpcs}</code>}
                      {formatCurrency(item.amount_billed ?? undefined)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-medium text-slate-900">
                Patient responsibility: {formatCurrency(result.bill.patient_responsibility ?? undefined)}
              </p>
            </section>

            {/* Insurance chips */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Shield className="h-5 w-5 text-slate-500" />
                Insurance summary
              </h2>
              <div className="flex flex-wrap gap-2">
                {result.insurance.deductible_individual != null && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                    Deductible (individual): {formatCurrency(result.insurance.deductible_individual)}
                  </span>
                )}
                {result.insurance.oop_max_individual != null && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                    OOP max: {formatCurrency(result.insurance.oop_max_individual)}
                  </span>
                )}
                {result.insurance.disclaimers.map((d, i) => (
                  <span key={i} className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800">
                    {d}
                  </span>
                ))}
              </div>
            </section>

            {/* Guidance */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-slate-900">Plain-English summary</h2>
              <p className="text-slate-700">{result.guidance.summary_plain_english}</p>
              {result.guidance.next_steps.length > 0 && (
                <>
                  <h3 className="mt-4 font-medium text-slate-900">Next steps</h3>
                  <ul className="mt-2 list-inside list-disc text-slate-700">
                    {result.guidance.next_steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {/* Navigation results */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <MapPin className="h-5 w-5 text-slate-500" />
                Nearby in-network options
              </h2>
              <p className="text-sm text-slate-600">Query: {result.navigation.query_used}</p>
              <ul className="mt-4 space-y-4">
                {result.navigation.results.map((r, i) => (
                  <li key={i} className="rounded-lg border border-slate-100 p-4">
                    <p className="font-medium text-slate-900">{r.name}</p>
                    {r.address && <p className="text-sm text-slate-600">{r.address}</p>}
                    {r.phone && <p className="text-sm text-slate-600">{r.phone}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.distance_miles != null && (
                        <span className="text-xs text-slate-500">{r.distance_miles.toFixed(1)} mi</span>
                      )}
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          r.network_status === "in_network"
                            ? "bg-green-100 text-green-800"
                            : r.network_status === "out_of_network"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.network_status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400">lat/lng: {r.lat.toFixed(4)}, {r.lng.toFixed(4)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-medium">Partial results (some components used mock data):</p>
                <ul className="mt-1 list-inside list-disc">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e.component}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center gap-3 rounded-lg border border-trust/30 bg-trust/5 px-6 py-4">
          <Shield className="h-5 w-5 shrink-0 text-trust" />
          <p className="text-base text-slate-600">Data is sent to the CareMap backend; no PII is stored in logs.</p>
        </div>
      </div>
    </main>
  );
}
