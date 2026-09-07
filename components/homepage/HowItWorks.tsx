// 1. External imports
import Image from "next/image";

// 2. Internal imports
// (none)

// 3. Type definitions
type FeatureItem = {
  title: string;
  description: string;
  highlighted?: boolean;
};

const FEATURES: FeatureItem[] = [
  {
    title: "Understand your match score",
    description:
      "See how your profile lines up with each role before you apply. Get a clear breakdown of what fits and what's missing.",
  },
  {
    title: "AI-Powered Job Matching",
    description:
      "Stop guessing which jobs are worth applying to. JobPilot scores every role against your actual skills so you focus on the ones that matter.",
    highlighted: true,
  },
  {
    title: "Focus on the right roles",
    description:
      "Filter out low fit jobs and stay on the ones that actually matter. Spend less time sorting and more time applying.",
  },
];

// 4. Component
export function HowItWorks() {
  return (
    <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 bg-surface-secondary px-8 py-24 md:grid-cols-2">
      <div className="flex items-center justify-center rounded-xl bg-surface-tertiary p-6">
        <Image
          src="/images/agnet-log.png"
          alt="JobPilot agent activity log"
          width={1072}
          height={828}
          className="h-auto w-full max-w-md"
        />
      </div>

      <div>
        <h2 className="text-4xl font-bold text-text-primary">
          Apply With More Confidence, Every Time
        </h2>
        <div className="mt-10 border-t border-border">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className={
                feature.highlighted
                  ? "border-b border-l-2 border-b-border border-l-success-dark py-6 pl-6"
                  : "border-b border-l border-b-border border-l-border py-6 pl-6"
              }
            >
              <h3 className="text-base font-semibold text-text-primary">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
