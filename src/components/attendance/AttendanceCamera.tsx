"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Circle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  captureVideoFrame,
  guidanceMessage,
  useAutoFaceCapture,
} from "@/hooks/useAutoFaceCapture";
import {
  CAMERA_ERROR_MESSAGES,
  type CameraErrorType,
  acquireCameraStream,
  classifyCameraError,
  stopMediaStream,
} from "@/lib/camera";
import { getFaceLandmarker } from "@/lib/faceLandmarker";
import type { PoseTarget } from "@/lib/pose";
import { cn } from "@/lib/utils";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

/** How long each automatic pose is attempted before moving to the next. */
const POSE_TIMEOUT_MS = 5000;
/** If a pose is mid-hold when its timeout expires, re-check after this delay
 *  instead of cutting the user off just before capture. */
const TIMEOUT_RECHECK_MS = 300;

export type AttendancePose = "front" | "left" | "right" | "manual";

/**
 * - loading / camera-error: acquiring the camera
 * - capturing: automatic pose attempts (Front → Left → Right)
 * - fallback: all automatic attempts timed out; manual Take Photo only
 * - captured: one image taken; detection stopped, stream stopped
 */
type Phase = "loading" | "camera-error" | "capturing" | "fallback" | "captured";

interface PoseStep {
  pose: Exclude<AttendancePose, "manual">;
  /** Target understood by the shared evaluatePose (lib/pose.ts), which owns
   *  the left/right coordinate convention. */
  target: PoseTarget;
  fileName: string;
  label: string;
  instruction: string;
  arrow?: "left" | "right";
}

const POSE_STEPS: PoseStep[] = [
  {
    pose: "front",
    target: "front",
    fileName: "front.jpg",
    label: "LOOK STRAIGHT",
    instruction: "Look directly at the camera",
  },
  {
    pose: "left",
    target: "left_45",
    fileName: "left_45.jpg",
    label: "TURN LEFT",
    instruction: "Slowly turn your head to the left",
    arrow: "left",
  },
  {
    pose: "right",
    target: "right_45",
    fileName: "right_45.jpg",
    label: "TURN RIGHT",
    instruction: "Slowly turn your head to the right",
    arrow: "right",
  },
];

const MANUAL_FILE_NAME = "manual_capture.jpg";

/**
 * Guided auto-capture for Take Attendance. Tries Front, then Left 45°, then
 * Right 45° (each for POSE_TIMEOUT_MS) and submits the FIRST image that
 * passes — only one image is ever captured per attempt. A manual Take Photo
 * button (same video/stream) is always available as a secondary action and
 * becomes the primary action once all automatic poses time out.
 *
 * Shares the detection/stability/capture loop with enrollment via
 * useAutoFaceCapture — exactly one detection loop runs at a time. The stream
 * is stopped on capture, cancel and unmount.
 */
export function AttendanceCamera({
  onCapture,
  onCancel,
}: {
  onCapture: (file: File, pose: AttendancePose) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const capturedRef = useRef(false);
  const holdingRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [cameraError, setCameraError] = useState<CameraErrorType>("other");
  const [stepIndex, setStepIndex] = useState(0);

  const step = POSE_STEPS[stepIndex];

  const stopStream = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
  }, []);

  // Camera + model acquisition on mount (mount happens only after the
  // operator clicks Start Camera / Take Next Attendance).
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
      stopStream();
    };
  }, [stopStream]);

  // "Try Again" after a camera error — click handler only.
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
      setStepIndex(0);
      setPhase("capturing");
    } catch (error) {
      setCameraError(classifyCameraError(error));
      setPhase("camera-error");
    }
  };

  // Single exit point for both auto and manual capture: guarantees only one
  // image is ever submitted, stops detection + the stream, then hands off.
  const finishCapture = useCallback(
    (file: File, pose: AttendancePose) => {
      if (capturedRef.current) return;
      capturedRef.current = true;
      setPhase("captured");
      stopStream();
      onCapture(file, pose);
    },
    [stopStream, onCapture]
  );

  const handleAutoCapture = useCallback(
    (file: File) => finishCapture(file, step.pose),
    [finishCapture, step.pose]
  );

  const status = useAutoFaceCapture({
    videoRef,
    landmarkerRef,
    active: phase === "capturing",
    target: step.target,
    fileName: step.fileName,
    onCapture: handleAutoCapture,
  });

  useEffect(() => {
    holdingRef.current = status.holdProgress > 0;
  }, [status.holdProgress]);

  // Per-pose timeout: Front → Left → Right → manual fallback. Keyed on
  // stepIndex so each pose gets its own fresh timer; the previous one is
  // always cleared first.
  useEffect(() => {
    if (phase !== "capturing") return;
    let timer = setTimeout(function advance() {
      if (holdingRef.current) {
        timer = setTimeout(advance, TIMEOUT_RECHECK_MS);
        return;
      }
      if (stepIndex < POSE_STEPS.length - 1) {
        setStepIndex(stepIndex + 1);
      } else {
        setPhase("fallback");
      }
    }, POSE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [phase, stepIndex]);

  const handleManualCapture = async () => {
    const video = videoRef.current;
    if (!video || capturedRef.current) return;
    const frame = await captureVideoFrame(video, MANUAL_FILE_NAME);
    if (frame) finishCapture(frame.file, "manual");
  };

  const retryAutomatic = () => {
    setStepIndex(0);
    setPhase("capturing");
  };

  const handleCancel = () => {
    stopStream();
    onCancel();
  };

  const faceDetected = status.faceCount === 1;
  const correctPose = faceDetected && status.angleOk;
  const streaming = phase === "capturing" || phase === "fallback";

  return (
    <div>
      {phase === "capturing" && (
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
          Step {stepIndex + 1} / {POSE_STEPS.length}
        </p>
      )}

      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg bg-slate-900">
        {/* Always mounted so the ref exists before the stream is attached.
            Mirrored preview only; captured frames keep true orientation. */}
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
            streaming ? "opacity-100" : "opacity-0"
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
            <button
              type="button"
              onClick={restartCamera}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          </div>
        )}

        {streaming && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                "h-3/4 w-3/4 rounded-[45%] border-2 transition-colors",
                phase === "capturing" && status.holdProgress > 0
                  ? "border-solid border-emerald-400"
                  : phase === "capturing" && faceDetected
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

        {phase === "captured" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow">
              <Check className="h-4 w-4" />
              Face captured
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
            {step.label}
            {step.arrow === "right" && (
              <ArrowRight className="h-4 w-4 text-slate-400" />
            )}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {guidanceMessage(status, step.instruction)}
          </p>

          <div className="mt-2 flex justify-center gap-4 text-xs font-medium">
            <StatusItem
              ok={faceDetected}
              label={
                status.faceCount > 1
                  ? "Only one person"
                  : faceDetected
                    ? "Face detected"
                    : "No face detected"
              }
            />
            <StatusItem ok={correctPose} label="Correct pose" />
          </div>

          <div className="mx-auto mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-150",
                status.holdProgress > 0 ? "bg-emerald-500" : "bg-transparent"
              )}
              style={{ width: `${status.holdProgress}%` }}
            />
          </div>

          <p className="mt-3 text-xs text-slate-400">
            The photo is captured automatically.
          </p>
        </div>
      )}

      {phase === "fallback" && (
        <div className="mt-4 text-center">
          <p className="text-base font-semibold text-slate-900">
            Unable to automatically capture
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Face the camera and take a photo manually.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>

        {phase === "capturing" && (
          <button
            type="button"
            onClick={handleManualCapture}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Camera className="h-4 w-4" />
            Take Photo
          </button>
        )}

        {phase === "fallback" && (
          <>
            <button
              type="button"
              onClick={retryAutomatic}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Automatic
            </button>
            <button
              type="button"
              onClick={handleManualCapture}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StatusItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        ok ? "text-emerald-600" : "text-slate-400"
      )}
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
      {label}
    </span>
  );
}
