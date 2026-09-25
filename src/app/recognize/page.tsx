"use client";

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  UserX,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AttendanceCamera } from "@/components/attendance/AttendanceCamera";
import { BoundingBoxOverlay } from "@/components/recognize/BoundingBoxOverlay";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePersons } from "@/hooks/usePersons";
import { recognizeFace } from "@/lib/api/recognition";
import { getRecognitionThreshold } from "@/lib/settings";
import { getErrorMessage } from "@/lib/utils";
import type { RecognizeResponse } from "@/types";

type Stage = "idle" | "camera" | "recognizing" | "result" | "error";

interface SessionEntry {
  id: string;
  name: string;
  personCode: string | null;
  time: Date;
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700";

export default function TakeAttendancePage() {
  const { persons } = usePersons();
  const personById = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons]
  );

  const [stage, setStage] = useState<Stage>("idle");
  const [captureFile, setCaptureFile] = useState<File | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [result, setResult] = useState<RecognizeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [session, setSession] = useState<SessionEntry[]>([]);

  const previewUrl = useMemo(
    () => (captureFile ? URL.createObjectURL(captureFile) : null),
    [captureFile]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /** Start Camera / Take Next Attendance / Try Again — clears the last capture. */
  const startCamera = () => {
    setCaptureFile(null);
    setCapturedAt(null);
    setResult(null);
    setErrorMessage(null);
    setStage("camera");
  };

  const cancelCamera = useCallback(() => setStage("idle"), []);

  // Called by AttendanceCamera right after it auto-captures and stops the
  // stream: send the frame straight to the existing recognition endpoint
  // using the admin-configured threshold.
  const handleCapture = useCallback(
    async (file: File) => {
      const now = new Date();
      setCaptureFile(file);
      setCapturedAt(now);
      setStage("recognizing");
      try {
        const response = await recognizeFace({
          file,
          threshold: getRecognitionThreshold(),
        });
        setResult(response);
        setStage("result");

        const [face] = response.faces;
        if (!response.gallery_empty && response.faces.length === 1 && face.is_known) {
          const person =
            face.person_id != null ? personById.get(face.person_id) : undefined;
          setSession((prev) =>
            [
              {
                id: makeId(),
                name: person?.name ?? face.label,
                personCode: face.person_code ?? person?.person_code ?? null,
                time: now,
              },
              ...prev,
            ].slice(0, 10)
          );
        }
      } catch (err) {
        setResult(null);
        setErrorMessage(
          getErrorMessage(err, "Failed to recognize the face. Please try again.")
        );
        setStage("error");
      }
    },
    [personById]
  );

  const faces = result?.faces ?? [];
  const galleryEmpty = result?.gallery_empty === true;
  const singleFace = !galleryEmpty && faces.length === 1 ? faces[0] : null;
  const recognizedPerson =
    singleFace?.is_known && singleFace.person_id != null
      ? personById.get(singleFace.person_id)
      : undefined;

  return (
    <div>
      <PageHeader
        title="Take Attendance"
        description="Identify enrolled people and record attendance using the camera."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: start / live camera / captured frame */}
        <div className="lg:col-span-3">
          <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {stage === "idle" && (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Camera className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Ready to take attendance
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Start the camera, then have one person look straight at
                    it. The photo is captured automatically.
                  </p>
                </div>
                <button type="button" onClick={startCamera} className={PRIMARY_BUTTON}>
                  <Camera className="h-4 w-4" />
                  Start Camera
                </button>
              </div>
            )}

            {stage === "camera" && (
              <AttendanceCamera
                onCapture={handleCapture}
                onCancel={cancelCamera}
              />
            )}

            {stage !== "idle" && stage !== "camera" && previewUrl && (
              <>
                {stage === "result" && faces.length > 0 ? (
                  <BoundingBoxOverlay imageUrl={previewUrl} faces={faces} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Captured attendance photo"
                    className="mx-auto max-h-[480px] w-full rounded-lg object-contain"
                  />
                )}
              </>
            )}

            {stage === "recognizing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow">
                  <CheckCircle2 className="h-4 w-4" />
                  Captured
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Identifying person...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: attendance result + session log */}
        <div className="space-y-6 lg:col-span-2">
          {stage === "error" && errorMessage && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <InlineError message={errorMessage} />
              <button type="button" onClick={startCamera} className={`mt-4 w-full ${PRIMARY_BUTTON}`}>
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          )}

          {stage === "result" && galleryEmpty && (
            <EmptyState
              icon={Users}
              title="No enrolled people"
              description="Enroll people before taking attendance."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/people"
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Go to People
                  </Link>
                  <Link
                    href="/people/enroll"
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Enroll Person
                  </Link>
                </div>
              }
            />
          )}

          {stage === "result" && !galleryEmpty && faces.length === 0 && (
            <ResultCard
              icon={AlertCircle}
              title="No face detected"
              description="The server could not find a face in the photo. Please try again."
              actionLabel="Try Again"
              onAction={startCamera}
            />
          )}

          {stage === "result" && !galleryEmpty && faces.length > 1 && (
            <ResultCard
              icon={Users}
              title="Multiple faces detected"
              description="Attendance was not recorded. Please make sure only one person is in the frame."
              actionLabel="Try Again"
              onAction={startCamera}
            />
          )}

          {stage === "result" && singleFace && !singleFace.is_known && (
            <ResultCard
              icon={UserX}
              title="Person Not Recognized"
              description="No enrolled person matched this face."
              actionLabel="Try Again"
              onAction={startCamera}
            />
          )}

          {stage === "result" && singleFace?.is_known && (
            <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Person Recognized
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {recognizedPerson?.name ?? singleFace.label}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <dt className="text-xs text-slate-400">Person Code</dt>
                  <dd className="font-mono text-sm font-semibold text-slate-900">
                    {singleFace.person_code ?? recognizedPerson?.person_code ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Time</dt>
                  <dd className="text-sm font-semibold text-slate-900">
                    {capturedAt ? formatTime(capturedAt) : "—"}
                  </dd>
                </div>
              </dl>
              {singleFace.person_id != null && (
                <Link
                  href={`/people/${singleFace.person_id}`}
                  className="mt-3 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  View profile
                </Link>
              )}
              <button type="button" onClick={startCamera} className={`mt-4 w-full ${PRIMARY_BUTTON}`}>
                <Camera className="h-4 w-4" />
                Take Next Attendance
              </button>
            </div>
          )}

          {(stage === "idle" || stage === "camera") && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                How it works
              </h2>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-500">
                <li>Start the camera.</li>
                <li>One person looks straight at the camera inside the frame.</li>
                <li>Hold still — the photo is captured automatically.</li>
                <li>The person is identified and the result is shown.</li>
              </ol>
            </div>
          )}

          {session.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recognized this session
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Not saved anywhere — cleared when you leave this page.
              </p>
              <ul className="mt-2.5 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
                {session.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {entry.name}
                      </p>
                      {entry.personCode && (
                        <p className="truncate font-mono text-xs text-slate-500">
                          {entry.personCode}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatTime(entry.time)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: typeof AlertCircle;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600">
        <Icon className="h-4 w-4" />
        {title}
      </p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <button type="button" onClick={onAction} className={`mt-4 w-full ${PRIMARY_BUTTON}`}>
        <RefreshCw className="h-4 w-4" />
        {actionLabel}
      </button>
    </div>
  );
}
