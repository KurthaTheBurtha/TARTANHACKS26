import Link from "next/link";
import Image from "next/image";

type LogoProps = {
  /** Height of the logo image in pixels */
  height?: number;
  /** Whether the logo links to home */
  href?: boolean;
  /** Optional class name for the wrapper */
  className?: string;
};

export function Logo({ height = 40, href = true, className = "" }: LogoProps) {
  const img = (
    <Image
      src="/logo.png"
      alt="CareMap — healthcare, location, and care nearby"
      width={height * (240 / 80)}
      height={height}
      priority
      className="h-auto w-auto object-contain"
      style={{ height: `${height}px`, width: "auto" }}
    />
  );

  if (href) {
    return (
      <Link
        href="/"
        className={`inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2 ${className}`}
        aria-label="CareMap home"
      >
        {img}
      </Link>
    );
  }

  return <span className={className}>{img}</span>;
}
