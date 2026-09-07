// 1. External imports
import { CheckCircle } from "lucide-react";

// 2. Internal imports
// (none)

// 3. Type definitions
type Props = {
  resumePdfUrl: string | null;
  resumeStorageKey: string | null;
};

// 4. Component
// Presentational only — no DB calls. `resumePdfUrl` only gates whether a
// resume exists to show; the link itself points at the app's own
// authenticated proxy route, not that raw URL directly (see below).
// Deferred since Feature 05 to whichever of Feature 07/08 first needed to
// render a resume; Feature 07 didn't, so this is that component.
export function ResumePreview({ resumePdfUrl, resumeStorageKey }: Props) {
  if (!resumePdfUrl) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
      <div className="flex items-center gap-2">
        <CheckCircle aria-hidden="true" className="h-4 w-4 text-success" />
        <p className="text-sm text-text-secondary">Resume ready</p>
      </div>
      {/* Not a direct link to resumePdfUrl — confirmed live that the raw
          InsForge storage URL 401s with "No token provided" when opened
          from the browser (it needs a real Authorization header, which a
          plain <a> navigation never attaches). This same-origin route
          proxies the download through the authenticated server client
          instead (see architecture.md's Feature 08 decision, Decision 12
          correction, and app/api/resume/download/route.ts). */}
      {resumeStorageKey ? (
        <a
          href="/api/resume/download"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-accent"
        >
          View PDF
        </a>
      ) : (
        <p className="text-sm text-text-secondary">
          Generate a new resume to restore the download link.
        </p>
      )}
    </div>
  );
}
