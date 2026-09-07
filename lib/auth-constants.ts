// A "use server" file (actions/auth.ts) can only export Server Actions —
// Next.js treats every export of such a file as a callable action reference,
// so a plain constant can't live there. This is the shared source for
// actions/auth.ts and app/(auth)/callback/route.ts instead.
export const OAUTH_VERIFIER_COOKIE = "insforge_oauth_verifier";
