"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  RefreshCw,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMERA_ERROR_MESSAGES,
  type CameraErrorType,
  acquireCameraStream,
  classifyCameraError,
  stopMediaStream,
} from "@/lib/camera";
import { getFaceLandmarker } from "@/lib/faceLandmarker";
import { evaluatePose, type PoseTarget } from "@/lib/pose";
import { cn } from "@/lib/utils";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

type Phase = "loading" | "camera-error" | "capturing" | "flash" | "review";

interface StepConfig {
  key: PoseTarget;
  fileName: string;
  stepLabel: string;
  shortLabel: string;
  instruction: string;
  arrow?: "left" | "right";
}

const STEPS: StepConfig[] = [
  {
    key: "front",
    fileName: "front.jpg",
    stepLabel: "LOOK STRAIGHT",
    shortLabel: "Front",
    instruction: "Look directly at the camera",
  },
  {
    key: "left_45",
    fileName: "left_45.jpg",
    stepLabel: "TURN LEFT",
    shortLabel: "Left 45°",
    instruction: "Slowly turn your head to the left",
    arrow: "left",
  },
  {
    key: "right_45",
    fileName: "right_45.jpg",
    stepLabel: "TURN RIGHT",
    shortLabel: "Right 45°",
    instruction: "Slowly turn your head to the right",
    arrow: "right",
  },
];

const DETECTION_INTERVAL_MS = 150;
const HOLD_DURATION_MS = 900;
const FLASH_DURATION_MS = 1100;

type Captured = Partial<Record<PoseTarget, { file: File; url: string }>>;

interface DetectionStatus {
  faceCount: number;
  centered: boolean;
  sizeOk: boolean;
  angleOk: boolean;
  distanceHint: "ok" | "too-close" | "too-far";
  holdProgress: number;
}

const IDLE_STATUS: DetectionStatus = {
  faceCount: 0,
  centered: false,
  sizeOk: false,
  angleOk: false,
  distanceHint: "ok",
  holdProgress: 0,
};

function guidanceMessage(step: StepConfig, status: DetectionStatus): string {
  if (status.faceCount === 0) return "Position your face inside the frame";
  if (status.faceCount > 1)
    return "Please make sure only one person is in the camera.";
  if (status.distanceHint === "too-far") return "Move a little closer";
  if (status.distanceHint === "too-close") return "Move back slightly";
  if (!status.centered) return "Center your face in the frame";
  if (!status.angleOk) return step.instruction;
  return "Hold still...";
}

export function GuidedFaceCapture({
  submitting,
  submitError,
  onEnroll,
  onClose,
  onFallbackToUpload,
}: {
  submitting: boolean;
  submitError: string | null;
  onEnroll: (files: Record<PoseTarget, File>) => void;
  onClose: () => void;
  onFallbackToUpload: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const capturingRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [cameraError, setCameraError] = useState<CameraErrorType>("other");
  const [stepIndex, setStepIndex] = useState(0);
  const [captured, setCaptured] = useState<Captured>({});
  const [retakeOnly, setRetakeOnly] = useState<PoseTarget | null>(null);
  const [flashUrl, setFlashUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<DetectionStatus>(IDLE_STATUS);

  const step = STEPS[stepIndex];

  // Initial camera + model acquisition on mount. State updates happen only
  // inside .then/.catch callbacks so nothing is set synchronously within the
  // effect body itself.
  useEffect(() => {
    let cancelled = false;
    Promise.all([acquireCameraStream(), getFaceLandmarker()])
      .then(([stream, landmarker]) => {
        if (cancelled) {
          stopMediaStream(stream);
          return;
        }
        streamRef.current = stream;
        landmarkerRef.current = landmarker;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setPhase("capturing");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCameraError(classifyCameraError(error));
        setPhase("camera-error");
      });
    return () => {
      cancelled = true;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  // Re-acquire the camera for a retake (stream was stopped once review was
  // reached). Only ever invoked from click handlers, so setting state
  // directly here is fine.
  const restartCamera = async () => {
    setPhase("loading");
    try {
      const stream = await acquireCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      if (!landmarkerRef.current) {
        landmarkerRef.current = await getFaceLandmarker();
      }
      setPhase("capturing");
    } catch (error) {
      setCameraError(classifyCameraError(error));
      setPhase("camera-error");
    }
  };

  // Landmark detection loop for the current step.
  useEffect(() => {
    if (phase !== "capturing") return;

    capturingRef.current = false;
    holdStartRef.current = null;

    const target = step.key;

    const capture = () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) {
        capturingRef.current = false;
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        capturingRef.current = false;
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            capturingRef.current = false;
            return;
          }
          const file = new File([blob], step.fileName, {
            type: "image/jpeg",
          });
          const url = URL.createObjectURL(blob);
          setCaptured((prev) => {
            const existing = prev[target];
            if (existing) URL.revokeObjectURL(existing.url);
            return { ...prev, [target]: { file, url } };
          });
          setFlashUrl(url);
          setPhase("flash");
        },
        "image/jpeg",
        0.92
      );
    };

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (
        !video ||
        !landmarker ||
        video.readyState < 2 ||
        capturingRef.current
      ) {
        return;
      }

      const result = landmarker.detectForVideo(video, performance.now());
      const faces = result.faceLandmarks;

      if (faces.length !== 1) {
        holdStartRef.current = null;
        setStatus({ ...IDLE_STATUS, faceCount: faces.length });
        return;
      }

      const evaluation = evaluatePose(faces[0], target);
      if (!evaluation.ready) {
        holdStartRef.current = null;
        setStatus({
          faceCount: 1,
          centered: evaluation.centered,
          sizeOk: evaluation.sizeOk,
          angleOk: evaluation.angleOk,
          distanceHint: evaluation.distanceHint,
          holdProgress: 0,
        });
        return;
      }

      const now = performance.now();
      if (holdStartRef.current === null) holdStartRef.current = now;
      const elapsed = now - holdStartRef.current;
      const holdProgress = Math.min(
        100,
        Math.round((elapsed / HOLD_DURATION_MS) * 100)
      );
      setStatus({
        faceCount: 1,
        centered: true,
        sizeOk: true,
        angleOk: true,
        distanceHint: "ok",
        holdProgress,
      });

      if (elapsed >= HOLD_DURATION_MS && !capturingRef.current) {
        capturingRef.current = true;
        capture();
      }
    }, DETECTION_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [phase, stepIndex, step.key, step.fileName]);

  // Brief freeze/success frame, then auto-advance to the next step (or to
  // review once the last pose — or a single retake — is done).
  useEffect(() => {
    if (phase !== "flash") return;
    const timer = setTimeout(() => {
      setFlashUrl(null);
      if (retakeOnly) {
        setRetakeOnly(null);
        stopMediaStream(streamRef.current);
        streamRef.current = null;
        setPhase("review");
        return;
      }
      if (stepIndex >= STEPS.length - 1) {
        stopMediaStream(streamRef.current);
        streamRef.current = null;
        setPhase("review");
      } else {
        setStepIndex((index) => index + 1);
        setPhase("capturing");
      }
    }, FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [phase, stepIndex, retakeOnly]);

  // Revoke every captured object URL when the component unmounts (covers
  // cancel, navigate-away, and completion — the stream itself is already
  // stopped by the effects above in each of those cases).
  const capturedRef = useRef<Captured>({});
  useEffect(() => {
    capturedRef.current = captured;
  }, [captured]);
  useEffect(() => {
    return () => {
      stopMediaStream(streamRef.current);
      Object.values(capturedRef.current).forEach(
        (entry) => entry && URL.revokeObjectURL(entry.url)
      );
    };
  }, []);

  const retakeStep = useCallback((target: PoseTarget) => {
    setCaptured((prev) => {
      const existing = prev[target];
      if (existing) URL.revokeObjectURL(existing.url);
      const next = { ...prev };
      delete next[target];
      return next;
    });
    setRetakeOnly(target);
    setStepIndex(STEPS.findIndex((s) => s.key === target));
    restartCamera();
  }, []);

  const retakeAll = () => {
    setCaptured((prev) => {
      Object.values(prev).forEach(
        (entry) => entry && URL.revokeObjectURL(entry.url)
      );
      return {};
    });
    setRetakeOnly(null);
    setStepIndex(0);
    restartCamera();
  };

  const handleClose = () => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    onClose();
  };

  const handleEnroll = () => {
    const front = captured.front?.file;
    const left = captured.left_45?.file;
    const right = captured.right_45?.file;
    if (!front || !left || !right) return;
    onEnroll({ front, left_45: left, right_45: right });
  };

  const allCaptured = STEPS.every((s) => captured[s.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60"
        onClick={phase === "review" ? undefined : handleClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guided face capture"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Face Enrollment
            </p>
            <p className="text-xs text-slate-500">
              {phase === "review"
                ? "Face capture complete"
                : `Step ${stepIndex + 1} of ${STEPS.length}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close guided capture"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {phase !== "review" && (
          <div className="px-5 pt-3">
            <StepIndicator captured={captured} activeIndex={stepIndex} />
          </div>
        )}

        <div className="overflow-y-auto px-5 py-4">
          {phase !== "review" && (
            <div>
              <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-900">
                {/*
                  The video element is mounted for every non-review phase
                  (not just "capturing") so `videoRef.current` is already
                  attached to the DOM by the time the camera-acquisition
                  code runs. Conditionally rendering it only during
                  "capturing"/"flash" was the original bug: the effect that
                  assigns `srcObject` ran while this element didn't exist
                  yet, so the stream was silently dropped and only the dark
                  background + face guide ever showed up.

                  Mirrored for a natural selfie preview — `capture()` below
                  draws directly from this element's decoded frame, which is
                  unaffected by the CSS transform, so the saved file keeps
                  its true (unmirrored) orientation.
                */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => {
                    videoRef.current?.play().catch(() => {});
                  }}
                  className={cn(
                    "absolute inset-0 h-full w-full -scale-x-100 object-cover",
                    phase === "capturing" ? "opacity-100" : "opacity-0"
                  )}
                />

                {phase === "loading" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 text-slate-300">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">Preparing camera...</span>
                  </div>
                )}

                {phase === "camera-error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <p className="text-sm text-slate-100">
                      {CAMERA_ERROR_MESSAGES[cameraError]}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={restartCamera}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Try Again
                      </button>
                      <button
                        type="button"
                        onClick={onFallbackToUpload}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-500 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        Use Upload Instead
                      </button>
                    </div>
                  </div>
                )}

                {phase === "capturing" && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className={cn(
                        "h-3/4 w-3/4 rounded-[45%] border-2 transition-colors",
                        status.holdProgress > 0
                          ? "border-solid border-emerald-400"
                          : status.faceCount === 1
                            ? "border-dashed border-amber-300"
                            : "border-dashed border-white/70"
                      )}
                    />
                  </div>
                )}

                {phase === "capturing" && step.arrow && (
                  <div
                    className={cn(
                      "pointer-events-none absolute top-1/2 -translate-y-1/2 text-white/80",
                      step.arrow === "left" ? "left-3" : "right-3"
                    )}
                  >
                    {step.arrow === "left" ? (
                      <ArrowLeft className="h-8 w-8" />
                    ) : (
                      <ArrowRight className="h-8 w-8" />
                    )}
                  </div>
                )}

                {phase === "flash" && flashUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={flashUrl}
                    alt={`Captured ${step.shortLabel}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

                {phase === "flash" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow">
                      <Check className="h-4 w-4" />
                      {step.shortLabel} captured
                    </span>
                  </div>
                )}
              </div>

              {phase === "capturing" && (
                <div className="mt-4 text-center">
                  <p className="flex items-center justify-center gap-2 text-base font-semibold text-slate-900">
                    {step.arrow === "left" && (
                      <ArrowLeft className="h-4 w-4 text-slate-400" />
                    )}
                    {step.stepLabel}
                    {step.arrow === "right" && (
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {guidanceMessage(step, status)}
                  </p>

                  <div className="mx-auto mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-150",
                        status.holdProgress > 0
                          ? "bg-emerald-500"
                          : "bg-transparent"
                      )}
                      style={{ width: `${status.holdProgress}%` }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    No capture button needed — this happens automatically.
                  </p>
                </div>
              )}
            </div>
          )}

          {phase === "review" && (
            <div>
              <p className="mb-3 text-center text-sm text-slate-500">
                Review your photos below, then continue.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {STEPS.map((s) => {
                  const entry = captured[s.key];
                  return (
                    <div key={s.key} className="text-center">
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                        {entry ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.url}
                            alt={`${s.shortLabel} capture`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserRound className="h-6 w-6 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-slate-700">
                        {s.shortLabel}
                      </p>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => retakeStep(s.key)}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Retake
                      </button>
                    </div>
                  );
                })}
              </div>

              {submitError && (
                <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {submitError}
                </p>
              )}
            </div>
          )}
        </div>

        {phase === "review" && (
          <div className="flex items-center justify-center gap-3 border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              disabled={submitting}
              onClick={retakeAll}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              Retake All
            </button>
            <button
              type="button"
              disabled={submitting || !allCaptured}
              onClick={handleEnroll}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Enrolling..." : "Enroll Person"}
            </button>
          </div>
        )}

        {(phase === "capturing" || phase === "flash") && (
          <div className="flex items-center justify-center gap-3 border-t border-slate-100 px-5 py-3.5">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={retakeAll}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  captured,
  activeIndex,
}: {
  captured: Captured;
  activeIndex: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((s, index) => {
        const done = Boolean(captured[s.key]);
        const active = index === activeIndex && !done;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "border-2 border-blue-500 text-blue-600"
                    : "border border-slate-300 text-slate-400"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                done
                  ? "text-emerald-600"
                  : active
                    ? "text-blue-600"
                    : "text-slate-400"
              )}
            >
              {s.shortLabel}
            </span>
            {index < STEPS.length - 1 && (
              <span className="mx-1 h-px w-4 bg-slate-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}
