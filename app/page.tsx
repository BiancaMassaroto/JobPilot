// 1. External imports
import { redirect } from "next/navigation";

// 2. Internal imports
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/homepage/Hero";
import { Features } from "@/components/homepage/Features";
import { HowItWorks } from "@/components/homepage/HowItWorks";
import { Testimonial } from "@/components/homepage/Testimonial";
import { CtaSection } from "@/components/homepage/CtaSection";
import { createInsforgeServer } from "@/lib/insforge-server";

// 3. Type definitions
// (none — no props)

// 4. Component
export default async function Home() {
  const insforge = await createInsforgeServer();
  const {
    data: { user },
  } = await insforge.auth.getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="pt-12">
          <Hero />
        </div>
        <Features />
        <HowItWorks />
        <Testimonial />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
