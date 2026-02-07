import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer";
import { ToasterProvider } from "@/components/toaster-provider";
import SkipNav from "@/components/skip-nav";

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
  title: "Medical Bill Analyzer | Stop Overpaying for Healthcare",
  description:
    "AI-powered medical bill analysis finds errors and saves you money. Upload your bill for a detailed breakdown.",
  openGraph: {
    title: "Medical Bill Analyzer | Stop Overpaying for Healthcare",
    description:
      "AI-powered medical bill analysis finds errors and saves you money. Upload your bill for a detailed breakdown.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Medical Bill Analyzer | Stop Overpaying for Healthcare",
    description:
      "AI-powered medical bill analysis finds errors and saves you money.",
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
        {children}
        <Footer />
        <ToasterProvider />
      </body>
    </html>
  );
}
