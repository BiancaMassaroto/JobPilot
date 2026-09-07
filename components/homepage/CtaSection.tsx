// 1. External imports
// (none)

// 2. Internal imports
import { CtaButtons } from "@/components/homepage/CtaButtons";

// 3. Type definitions
// (none — no props)

// 4. Component
export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-8 pb-24">
      <div className="rounded-xl border border-border bg-[radial-gradient(circle_at_20%_30%,var(--color-accent-light),transparent_45%),radial-gradient(circle_at_80%_20%,var(--color-info-light),transparent_45%),radial-gradient(circle_at_70%_90%,var(--color-accent-light),transparent_50%)] bg-surface px-6 py-20 text-center">
        <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
          Your next job search can feel a lot less overwhelming
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-text-secondary">
          Set up your profile, upload your resume, and start finding matches
          in minutes.
        </p>
        <CtaButtons />
      </div>
    </section>
  );
}
