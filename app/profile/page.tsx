// 1. External imports
import { redirect } from "next/navigation";

// 2. Internal imports
import { Navbar } from "@/components/layout/Navbar";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { createInsforgeServer } from "@/lib/insforge-server";
import { calculateProfileCompletion } from "@/lib/profile-completion";
import { fromProfileRow, type ProfileRow } from "@/lib/profile-transform";

// 3. Type definitions
// (none)

// 4. Component
export default async function ProfilePage() {
  const insforge = await createInsforgeServer();
  const {
    data: { user },
  } = await insforge.auth.getCurrentUser();

  // proxy.ts already guards this route — this is a defensive fallback, not
  // the primary gate.
  if (!user) {
    redirect("/login");
  }

  const { data: profileRow, error: profileError } = await insforge.database
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    console.error("[profile/page]", profileError);
    throw new Error("Failed to load profile");
  }

  const initialProfile = fromProfileRow(profileRow, user.email);
  const completion = calculateProfileCompletion(initialProfile);

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-8">
        {completion.missingFields.length > 0 && (
          <CompletionIndicator
            completionPercentage={completion.percentage}
            missingFields={completion.missingFields}
          />
        )}
        <ProfileForm initialProfile={initialProfile} />
      </main>
    </>
  );
}
