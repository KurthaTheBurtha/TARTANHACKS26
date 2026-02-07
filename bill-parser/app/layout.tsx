import type { Metadata } from "next";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer";
import { ToasterProvider } from "@/components/toaster-provider";
import SkipNav from "@/components/skip-nav";
import { Logo } from "@/components/logo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareMap | Stop Overpaying for Healthcare",
  description:
    "AI-powered medical bill analysis finds errors and saves you money. Upload your bill for a detailed breakdown.",
  openGraph: {
    title: "CareMap | Stop Overpaying for Healthcare",
    description:
      "AI-powered medical bill analysis finds errors and saves you money. Upload your bill for a detailed breakdown.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareMap | Stop Overpaying for Healthcare",
    description:
      "AI-powered medical bill analysis finds errors and saves you money.",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <SkipNav />
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Logo height={44} />
            <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link
                href="/upload"
                className="transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2 rounded"
              >
                Bill Analyzer
              </Link>
              <Link
                href="/demo"
                className="transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2 rounded"
              >
                Demo
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <Footer />
        <ToasterProvider />
      </body>
    </html>
  );
}
