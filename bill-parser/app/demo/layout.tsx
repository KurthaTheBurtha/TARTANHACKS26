import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Demo mode banner */}
      <div className="border-b border-warning/30 bg-warning/10 px-4 py-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-sm font-semibold text-warning-700">
            DEMO MODE — Sample data for presentation
          </span>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to real app
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
