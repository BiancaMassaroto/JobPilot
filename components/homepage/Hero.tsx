// 1. External imports
import Image from "next/image";

// 2. Internal imports
import { CtaButtons } from "@/components/homepage/CtaButtons";

// 3. Type definitions
// (none — no props)

// 4. Component
export function Hero() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-8">
      <div className="relative overflow-hidden rounded-xl border border-border bg-[radial-gradient(circle_at_15%_25%,var(--color-accent-light),transparent_45%),radial-gradient(circle_at_85%_15%,var(--color-info-light),transparent_45%),radial-gradient(circle_at_75%_95%,var(--color-accent-light),transparent_50%)] bg-surface px-6 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-text-primary md:text-6xl">
          Job hunting is hard.
          <br />
          Your tools shouldn&apos;t be.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-text-secondary">
          Stop applying blind. JobPilot finds the jobs, researches the
          companies, and gives you everything you need to stand out.
        </p>
        <CtaButtons />
      </div>

      <div className="mt-8 flex justify-center">
        <Image
          src="/images/dashboard-demo.png"
          alt="JobPilot dashboard preview"
          width={1600}
          height={807}
          className="w-full max-w-4xl h-auto"
          priority
        />
      </div>
    </section>
  );
}
