"use client";

// 1. External imports
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

// 2. Internal imports
import { SignOutButton } from "@/components/auth/SignOutButton";

// 3. Type definitions
type NavLink = {
  label: string;
  href: string;
};

type Props = {
  isAuthenticated?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Find Jobs", href: "/find-jobs" },
  { label: "Profile", href: "/profile" },
];

// 4. Component
// isAuthenticated is server-computed and passed in by each page (rather than
// resolved client-side here) so there's no logged-in/out flash — every
// caller already knows the session: `/` redirects away when logged in, and
// `/dashboard` + `/profile` are gated by proxy.ts so they're only ever
// rendered logged in.
export function Navbar({ isAuthenticated = false }: Props) {
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
        {isAuthenticated ? (
          <SignOutButton className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-secondary">
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
            Log out
          </SignOutButton>
        ) : (
          <Link
            href="/dashboard"
            className="rounded-md bg-text-slate px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            Start for free
          </Link>
        )}
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
