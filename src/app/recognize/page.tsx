"use client";

import {
  AlertCircle,
  Loader2,
  RefreshCw,
  ScanFace,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BoundingBoxOverlay } from "@/components/recognize/BoundingBoxOverlay";
import { FaceResultCard } from "@/components/recognize/FaceResultCard";
import { RecognitionImageUploader } from "@/components/recognize/RecognitionImageUploader";
import { ThresholdSlider } from "@/components/recognize/ThresholdSlider";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePersons } from "@/hooks/usePersons";
import { recognizeFace } from "@/lib/api/recognition";
import { getErrorMessage } from "@/lib/utils";
import type { RecognizeResponse } from "@/types";

interface HistoryEntry {
  id: string;
  url: string;
  timestamp: string;
  facesCount: number;
  knownCount: number;
  threshold: number;
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function RecognizePage() {
  const { persons } = usePersons();
  const personById = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons]
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RecognizeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);

  const previewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Revoke every session-history thumbnail URL when the page unmounts.
  useEffect(() => {
    return () => {
      historyRef.current.forEach((entry) => URL.revokeObjectURL(entry.url));
    };
  }, []);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    setResult(null);
    setErrorMessage(null);
  };

  const handleReset = () => {
    handleImageChange(null);
  };

  const handleRecognize = async () => {
    if (!imageFile || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await recognizeFace({ file: imageFile, threshold });
      setResult(response);

      setHistory((prev) => {
        const combined: HistoryEntry[] = [
          {
            id: makeId(),
            url: URL.createObjectURL(imageFile),
            timestamp: new Date().toISOString(),
            facesCount: response.faces.length,
            knownCount: response.faces.filter((f) => f.is_known).length,
            threshold,
          },
          ...prev,
        ];
        const next = combined.slice(0, 6);
        combined.slice(6).forEach((entry) => URL.revokeObjectURL(entry.url));
        return next;
      });
    } catch (err) {
      setResult(null);
      setErrorMessage(
        getErrorMessage(err, "Failed to analyze the image. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showGalleryEmpty = result?.gallery_empty === true;
  const showNoFaces =
    result !== null && !showGalleryEmpty && result.faces.length === 0;
  const showFaces =
    result !== null && !showGalleryEmpty && result.faces.length > 0;

  return (
    <div>
      <PageHeader
        title="Recognize"
        description="Identify enrolled people from an uploaded or captured photo."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: image upload / preview / bounding-box result */}
        <div className="lg:col-span-3">
          <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {result && previewUrl ? (
              <>
                <BoundingBoxOverlay
                  imageUrl={previewUrl}
                  faces={result.faces}
                  activeIndex={hoveredIndex}
                  onHoverFace={setHoveredIndex}
                />
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  New Image
                </button>
              </>
            ) : (
              <RecognitionImageUploader
                file={imageFile}
                previewUrl={previewUrl}
                onChange={handleImageChange}
                disabled={submitting}
              />
            )}

            {submitting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-slate-700">
                  Analyzing image...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: settings + results */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Recognition Settings
            </h2>
            <div className="mt-4">
              <ThresholdSlider
                value={threshold}
                onChange={setThreshold}
                disabled={submitting}
              />
            </div>
            <button
              type="button"
              onClick={handleRecognize}
              disabled={!imageFile || submitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing image...
                </>
              ) : (
                <>
                  <ScanFace className="h-4 w-4" />
                  Recognize Face
                </>
              )}
            </button>
            {errorMessage && (
              <div className="mt-3">
                <InlineError message={errorMessage} />
              </div>
            )}
          </div>

          {showGalleryEmpty && (
            <EmptyState
              icon={Users}
              title="No enrolled people"
              description="Enroll people before running face recognition."
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

          {showNoFaces && (
            <EmptyState
              icon={AlertCircle}
              title="No face detected"
              description="Try another image containing a visible face."
              action={
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Try Another Image
                </button>
              }
            />
          )}

          {showFaces && result && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  {result.faces.length} face
                  {result.faces.length === 1 ? "" : "s"} detected
                </h2>
                <span className="text-xs text-slate-500">
                  {result.faces.filter((f) => f.is_known).length} known ·{" "}
                  {result.faces.filter((f) => !f.is_known).length} unknown
                </span>
              </div>
              <div className="space-y-3">
                {result.faces.map((face, index) => (
                  <FaceResultCard
                    key={index}
                    face={face}
                    index={index}
                    personName={
                      face.person_id != null
                        ? personById.get(face.person_id)?.name
                        : undefined
                    }
                    active={hoveredIndex === index}
                    onHover={setHoveredIndex}
                  />
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recent in this session
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Not saved anywhere — cleared when you leave this page.
              </p>
              <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                    title={`${entry.facesCount} face(s), ${entry.knownCount} known · threshold ${entry.threshold.toFixed(2)}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.url}
                      alt="Previously analyzed photo"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 rounded-tl bg-slate-900/80 px-1 text-[10px] font-medium text-white">
                      {entry.knownCount}/{entry.facesCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
