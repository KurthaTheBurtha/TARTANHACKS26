import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/toaster-provider";
import SkipNav from "@/components/skip-nav";
import AppLayout from "@/components/app-layout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareMap | Your Healthcare Navigator",
  description:
    "AI-powered medical bill analysis finds errors and saves you money. Navigate healthcare with clarity and confidence.",
  openGraph: {
    title: "CareMap | Your Healthcare Navigator",
    description:
      "AI-powered medical bill analysis finds errors and saves you money. Navigate healthcare with clarity and confidence.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareMap | Your Healthcare Navigator",
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
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="font-sans antialiased">
        <SkipNav />
        <AppLayout>
          {children}
        </AppLayout>
        <ToasterProvider />
      </body>
    </html>
  );
}
