import Link from "next/link";

export default function SkipNav() {
  return (
    <Link
      href="#main-content"
      className="fixed left-4 -top-14 z-[100] rounded-lg bg-slate-900 px-4 py-3 text-white shadow-lg transition-[top] duration-300 focus:top-4 focus:outline-none focus:ring-2 focus:ring-trust focus:ring-offset-2"
    >
      Skip to main content
    </Link>
  );
}
