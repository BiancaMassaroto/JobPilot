// 1. External imports
import Image from "next/image";

// 2. Internal imports
// (none)

// 3. Type definitions
// (none — no props)

// 4. Component
export function Testimonial() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-8 py-24 text-center">
      <p className="text-sm font-semibold tracking-wide text-accent">
        SUCCESS STORIES
      </p>
      <blockquote className="mx-auto mt-6 max-w-2xl text-2xl font-medium text-text-primary">
        &ldquo;I used to spend my evenings copy-pasting resumes. Now I open my
        dashboard to see interviews waiting. It feels like cheating. Had 3
        offers on the table simultaneously.&rdquo;
      </blockquote>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Image
          src="/images/user-icon.png"
          alt="Tom Wilson"
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg"
        />
        <div className="text-left">
          <p className="text-sm font-semibold text-text-primary">
            Tom Wilson
          </p>
          <p className="text-sm text-text-secondary">Junior Developer</p>
        </div>
      </div>
    </section>
  );
}
