"use client";

import {
  ChevronDown,
  ChevronLeft,
  Loader2,
  ScanFace,
  UploadCloud,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EnrollmentResultList } from "@/components/enroll/EnrollmentResult";
import { FaceAngleUploader } from "@/components/enroll/FaceAngleUploader";
import { GuidedFaceCapture } from "@/components/enroll/GuidedFaceCapture";
import { InlineError } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { enrollPerson } from "@/lib/api/persons";
import { getErrorMessage } from "@/lib/utils";
import type { EnrollmentResponse } from "@/types";

interface AngleFiles {
  front: File | null;
  left_45: File | null;
  right_45: File | null;
}

function renameFile(file: File, name: string): File {
  return new File([file], name, { type: file.type || "image/jpeg" });
}

export default function EnrollPersonPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [personCode, setPersonCode] = useState("");
  const [name, setName] = useState("");
  const [files, setFiles] = useState<AngleFiles>({
    front: null,
    left_45: null,
    right_45: null,
  });

  const [guidedOpen, setGuidedOpen] = useState(false);
  const [manualExpanded, setManualExpanded] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<EnrollmentResponse | null>(null);

  const hasAtLeastOneImage = Boolean(
    files.front || files.left_45 || files.right_45
  );

  const submitEnrollment = async (filesToSubmit: AngleFiles) => {
    if (submitting) return;
    setFormError(null);

    if (!personCode.trim() || !name.trim()) {
      setFormError("Person code and full name are required.");
      return;
    }
    const hasImage =
      filesToSubmit.front || filesToSubmit.left_45 || filesToSubmit.right_45;
    if (!hasImage) {
      setFormError("Capture or upload at least one face image before submitting.");
      return;
    }

    const uploadFiles: File[] = [];
    if (filesToSubmit.front)
      uploadFiles.push(renameFile(filesToSubmit.front, "front.jpg"));
    if (filesToSubmit.left_45)
      uploadFiles.push(renameFile(filesToSubmit.left_45, "left_45.jpg"));
    if (filesToSubmit.right_45)
      uploadFiles.push(renameFile(filesToSubmit.right_45, "right_45.jpg"));

    setSubmitting(true);
    try {
      const response = await enrollPerson({
        personCode: personCode.trim(),
        name: name.trim(),
        files: uploadFiles,
      });
      setResult(response);
      showToast({
        variant: response.success_count > 0 ? "success" : "info",
        title: "Enrollment submitted",
        description: `${response.success_count} of ${response.results.length} image(s) processed successfully.`,
      });
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to enroll person."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submitEnrollment(files);
  };

  const handleStartGuidedCapture = () => {
    setFormError(null);
    if (!personCode.trim() || !name.trim()) {
      setFormError("Enter the person code and full name before starting face capture.");
      return;
    }
    setGuidedOpen(true);
  };

  const handleGuidedEnroll = (captured: {
    front: File;
    left_45: File;
    right_45: File;
  }) => {
    setFiles(captured);
    submitEnrollment(captured);
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Enrollment Result"
          description={`Results for ${result.person.name} (${result.person.person_code})`}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {result.success_count} / {result.results.length} images
                processed successfully
              </p>
              <p className="text-xs text-slate-500">
                {result.person.embedding_count} embedding(s) enrolled for
                this person
              </p>
            </div>
          </div>

          <EnrollmentResultList results={result.results} />

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/people"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to People
            </Link>
            <button
              type="button"
              onClick={() => router.push(`/people/${result.person.id}`)}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View Person
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Enroll Person"
        description="Register a new person and capture face images for recognition."
        breadcrumb={
          <Link
            href="/people"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            People
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Basic Information
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="person_code"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Person Code
              </label>
              <input
                id="person_code"
                type="text"
                value={personCode}
                onChange={(event) => setPersonCode(event.target.value)}
                placeholder="EMP001"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Rahul Kumar"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Face Images
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Let the camera guide you through three poses, or upload photos
            manually.
          </p>

          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-6 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <ScanFace className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Guided Face Capture
              </p>
              <p className="mt-0.5 max-w-sm text-xs text-slate-500">
                The camera automatically captures Front, Left 45°, and Right
                45° photos as you follow the on-screen guidance — no manual
                shutter button.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartGuidedCapture}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <ScanFace className="h-4 w-4" />
              Start Face Capture
            </button>

            {hasAtLeastOneImage && (
              <p className="text-xs font-medium text-emerald-600">
                {
                  [files.front, files.left_45, files.right_45].filter(Boolean)
                    .length
                }{" "}
                of 3 photos ready — reviewed below.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setManualExpanded((v) => !v)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {manualExpanded
              ? "Hide manual upload"
              : "Prefer to upload photos manually?"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${manualExpanded ? "rotate-180" : ""}`}
            />
          </button>

          {(manualExpanded || hasAtLeastOneImage) && (
            <div className="mt-4 grid grid-cols-1 gap-5 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <FaceAngleUploader
                label="Front"
                hint="Facing the camera directly"
                file={files.front}
                onChange={(file) => setFiles((f) => ({ ...f, front: file }))}
              />
              <FaceAngleUploader
                label="Left 45°"
                hint="Head turned left, 45 degrees"
                file={files.left_45}
                onChange={(file) => setFiles((f) => ({ ...f, left_45: file }))}
              />
              <FaceAngleUploader
                label="Right 45°"
                hint="Head turned right, 45 degrees"
                file={files.right_45}
                onChange={(file) => setFiles((f) => ({ ...f, right_45: file }))}
              />
            </div>
          )}
        </section>

        {formError && <InlineError message={formError} />}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/people"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enrolling...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Enroll Person
              </>
            )}
          </button>
        </div>
      </form>

      {guidedOpen && (
        <GuidedFaceCapture
          submitting={submitting}
          submitError={formError}
          onEnroll={handleGuidedEnroll}
          onClose={() => setGuidedOpen(false)}
          onFallbackToUpload={() => {
            setGuidedOpen(false);
            setManualExpanded(true);
          }}
        />
      )}
    </div>
  );
}
