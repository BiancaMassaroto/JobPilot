// 1. External imports
import { NextResponse } from "next/server";

// 2. Internal imports
import { createInsforgeServer } from "@/lib/insforge-server";

// 3. Type definitions

// Confirmed live: opening the raw stored URL directly in the browser
// (`<a href={resume_pdf_url}>`) returns a 401 "No token provided" from
// InsForge's storage API — that endpoint requires a real Authorization
// bearer token, which a plain browser navigation never attaches, unlike a
// same-origin fetch through the SDK (this route). This is a stronger
// guarantee than the "unguessable path" obscurity model architecture.md's
// Storage section originally described, not a weaker one — see the Feature
// 08 decision's Decision 12 correction, added the same day this was found
// (2026-09-07, on the engineer's first real click-through of the feature).
//
// This route originally re-derived the storage key by parsing it back out
// of resume_pdf_url — that turned out unreliable (a live click-through hit
// a genuine STORAGE_NOT_FOUND from InsForge, not just this route's own
// guard). Fixed by saving the SDK's own `key` field from the upload
// response directly (`profiles.resume_storage_key`, added live via a
// migration during this same build) instead of reconstructing it — the
// vendor's own documented pattern ("save BOTH url and key to database"),
// which this feature should have followed from the start.

// 4. Component (Route Handler)
export const runtime = "nodejs";

// Proxies the authenticated user's own resume PDF through the server —
// this is the "server-side ownership check" the resumes bucket needs
// (architecture.md's Storage isolation gap decision): the query is scoped
// to the caller's own profiles row, so this route can only ever serve the
// resume the caller's own account produced, whichever of upload or
// generate wrote it (Decision 10).
export async function GET() {
  try {
    const insforge = await createInsforgeServer();
    const {
      data: { user },
    } = await insforge.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: profileRow, error: profileError } = await insforge.database
      .from("profiles")
      .select("resume_storage_key")
      .eq("id", user.id)
      .maybeSingle<{ resume_storage_key: string | null }>();

    if (profileError) {
      console.error("[api/resume/download]", profileError);
      return NextResponse.json({ success: false, error: "Failed to load your resume" }, { status: 500 });
    }

    const key = profileRow?.resume_storage_key;
    if (!key) {
      // Either no resume yet, or a resume saved before resume_storage_key
      // existed (this feature's first, buggier pass) — either way, there's
      // no reliable key to look up. Generating or uploading again populates
      // it going forward.
      return NextResponse.json({ success: false, error: "No resume found" }, { status: 404 });
    }

    const { data: blob, error: downloadError } = await insforge.storage.from("resumes").download(key);
    if (downloadError || !blob) {
      console.error("[api/resume/download]", downloadError, { key });
      return NextResponse.json({ success: false, error: "Failed to load your resume" }, { status: 500 });
    }

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="resume.pdf"',
      },
    });
  } catch (error) {
    console.error("[api/resume/download]", error);
    return NextResponse.json({ success: false, error: "Failed to load your resume" }, { status: 500 });
  }
}
