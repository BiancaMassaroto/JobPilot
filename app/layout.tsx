import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PostHogIdentify } from "@/components/auth/PostHogIdentify";

// Named --font-inter (not --font-sans) so it doesn't collide with the
// Tailwind theme token of the same name in globals.css — see the
// `@theme inline` block there for how the two are wired together.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "JobPilot",
  description:
    "JobPilot finds the jobs, researches the companies, and gives you everything you need to stand out.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background">
        <PostHogIdentify />
        {children}
      </body>
    </html>
  );
}
