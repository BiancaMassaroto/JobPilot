// Shared agent-error logging helper — assumed to exist by code-standards.md's
// Agent Code example and by architecture.md's Company Research pattern, made
// explicit at Feature 10's cross check (Decision 9a). Every agent-code
// failure branch calls this before returning, so nothing agent-side ever
// throws raw into a route handler.

// 1. External imports
// (none)

// 2. Internal imports
import { createInsforgeServer } from "@/lib/insforge-server";

// 3. Type definitions
// (none)

// 4. Component (n/a — pure helper module)

// `userId` is required because agent_logs.user_id is NOT NULL and the caller
// already has it from its own auth check. `runId` is also required (never
// nullable): every call site in this feature already has a real agent_runs row
// by the time it logs; Decision 9c's one run-less case bypasses this helper
// entirely instead of being passed a placeholder.
export async function logAgentError(
  userId: string,
  runId: string,
  jobId: string | null,
  message: string,
  error: unknown,
): Promise<void> {
  try {
    const insforge = await createInsforgeServer();
    const { error: insertError } = await insforge.database.from("agent_logs").insert({
      run_id: runId,
      user_id: userId,
      job_id: jobId,
      level: "error",
      message: `${message}: ${String(error)}`,
    });
    if (insertError) {
      console.error("[lib/agent-logs]", insertError);
    }
  } catch (loggingError) {
    // A logging failure must never itself throw and mask the original error.
    console.error("[lib/agent-logs]", loggingError);
  }
}
