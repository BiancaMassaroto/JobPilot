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
    title: "Find jobs that actually fit",
    description:
      "Search by title and location or paste a job link. Get matched roles you can quickly scan.",
    highlighted: true,
  },
  {
    title: "Know the Company Before You Apply",
    description:
      "Stop guessing what a company is about. JobPilot browses their site and gives you everything you need to apply with confidence.",
  },
  {
    title: "Keep track of every application",
    description:
      "Keep a clear view of every job you've found, tailored. Your activity and progress all stay in one simple place.",
  },
];

// 4. Component
export function Features() {
  return (
    <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-8 py-24 md:grid-cols-2">
      <div>
        <h2 className="text-4xl font-bold text-text-primary">
          Manage Your Job Search With Ease
        </h2>
        <div className="mt-10 border-t border-border">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className={
                feature.highlighted
                  ? "border-b border-l-2 border-b-border border-l-accent-dark py-6 pl-6"
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

      <div className="flex items-center justify-center rounded-xl bg-surface-tertiary p-6">
        <Image
          src="/images/jobs-lists.png"
          alt="Jobs matched by JobPilot"
          width={1182}
          height={889}
          className="h-auto w-full max-w-lg"
        />
      </div>
    </section>
  );
}
