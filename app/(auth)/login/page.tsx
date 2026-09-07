// 1. External imports
// (none)

// 2. Internal imports
import { LoginCard } from "@/components/auth/LoginCard";

// 3. Type definitions
// (none — no props)

// 4. Component
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <LoginCard />
    </main>
  );
}
