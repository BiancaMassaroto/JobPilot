"use client";

// 1. External imports
import { useRef, useState } from "react";
import { CloudUpload, Sparkles } from "lucide-react";

// 2. Internal imports
// (none)

// 3. Type definitions
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type Props = {
  extractFormAction: (formData: FormData) => void;
  isExtracting: boolean;
  extractError?: string;
};

// 4. Component
// Renders inside ProfileForm's <form> (see architecture.md's Feature 06
// decision) — its own name="resume" input is picked up automatically by the
// ancestor form's FormData on submit, no lifted state or callback needed.
// "Generate Resume from Profile" lives at the bottom of ProfileForm instead
// of here (moved during Feature 08's build, on request) — it reads whatever
// is currently saved, so it belongs near Save Profile, not above the fields
// it depends on. This card only covers the "resume in" direction now.
export function ResumeUpload({ extractFormAction, isExtracting, extractError }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptFile = (file: File | undefined) => {
    const input = fileInputRef.current;
    if (!file || !input) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      setSelectedFileName(null);
      input.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File is too large. Maximum size is 5MB.");
      setSelectedFileName(null);
      input.value = "";
      return;
    }

    setError(null);
    setSelectedFileName(file.name);
    // A drag and drop file never touches the real <input>'s FileList on its
    // own (only picking via the native dialog does) — sync it manually via
    // DataTransfer so the ancestor <form>'s FormData includes it either way.
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
  };

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Resume</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Upload an existing resume to auto-fill the profile below.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        name="resume"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />
      <div
        role="button"
        tabIndex={isExtracting ? -1 : 0}
        aria-disabled={isExtracting}
        onClick={() => {
          if (isExtracting) return;
          fileInputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (isExtracting) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          if (isExtracting) return;
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          if (isExtracting) return;
          setIsDragging(false);
          acceptFile(event.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center transition-colors ${
          isExtracting ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${
          isDragging ? "border-accent bg-accent-muted" : "border-border-muted bg-surface-secondary"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface">
          <CloudUpload aria-hidden="true" className="h-5 w-5 text-accent" />
        </span>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {selectedFileName ?? "Click to upload or drag and drop"}
          </p>
          <p className="mt-1 text-xs text-text-muted">PDF formatting only. Maximum file size 5MB.</p>
        </div>
        <span className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary">
          Select Resume
        </span>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {selectedFileName && (
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            formAction={extractFormAction}
            disabled={isExtracting}
            className="flex items-center justify-center gap-2 rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {isExtracting ? "Extracting…" : "Extract from Resume"}
          </button>
          {extractError && <p className="text-sm text-error">{extractError}</p>}
        </div>
      )}
    </section>
  );
}
