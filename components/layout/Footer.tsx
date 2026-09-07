// 1. External imports
import Link from "next/link";
import Image from "next/image";

// 2. Internal imports
// (none)

// 3. Type definitions
type FooterLink = {
  label: string;
  href: string;
};

const FOOTER_LINKS: FooterLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Condition", href: "/terms" },
];

// 4. Component
export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-surface px-6 py-6">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-4 md:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="JobPilot"
            width={106}
            height={36}
            className="h-9 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-8">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text-dark hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
