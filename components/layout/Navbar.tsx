"use client";

// 1. External imports
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

// 2. Internal imports
// (none)

// 3. Type definitions
type NavLink = {
  label: string;
  href: string;
};

const NAV_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Find Jobs", href: "/find-jobs" },
  { label: "Profile", href: "/profile" },
];

// 4. Component
export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="min-h-16 w-full bg-surface px-6 flex flex-wrap items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="JobPilot"
          width={106}
          height={36}
          className="h-9 w-auto"
          priority
        />
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                isActive
                  ? "text-sm font-medium text-accent"
                  : "text-sm font-medium text-text-dark hover:text-text-primary"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="rounded-md bg-text-slate px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Start for free
        </Link>
        <button
          type="button"
          className="rounded-md p-2 text-text-dark hover:bg-surface-secondary hover:text-text-primary md:hidden"
          aria-controls="mobile-navigation"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
        >
          {isMobileMenuOpen ? (
            <X aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Menu aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <nav
          id="mobile-navigation"
          className="w-full border-t border-border py-2 md:hidden"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "text-accent"
                    : "text-text-dark hover:bg-surface-secondary hover:text-text-primary"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
