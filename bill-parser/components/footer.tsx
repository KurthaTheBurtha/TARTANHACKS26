import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-slate-900 px-6 py-12 text-white" role="contentinfo">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded">
              <Image
                src="/logo.png"
                alt="CareMap"
                width={160}
                height={48}
                className="h-12 w-auto object-contain object-left"
              />
            </Link>
            <p className="mt-2 text-sm text-slate-400">
              Stop overpaying for healthcare
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold">Features</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/upload"
                  className="text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Bill Analyzer
                </Link>
              </li>
              <li>
                <Link
                  href="/demo"
                  className="text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Demo Mode
                </Link>
              </li>
              {process.env.NODE_ENV === "development" && (
                <li>
                  <Link
                    href="/design-system"
                    className="text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    Design System
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="#"
                  className="text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Find Care
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Drug Checker
                </Link>
              </li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <h3 className="font-semibold">Important</h3>
            <p className="mt-4 text-xs text-slate-400">
              This tool provides information only. Not medical or legal advice.
              Consult professionals for medical decisions.
            </p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-8 border-t border-slate-800 pt-8">
          <p className="text-center text-sm text-slate-400">
            © 2025 CareMap. Built for TartanHacks 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
