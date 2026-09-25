"use client";

import { AlertTriangle, Check, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { cn } from "@/lib/utils";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

type Phase = "loading" | "camera-error" | "capturing";

/**
 * Single-pose (look straight) guided auto-capture for Take Attendance.
 * Shares the detection/stability/capture loop with enrollment via
 * useAutoFaceCapture. Mounted only while the camera is in use; the stream is
 * stopped the moment a frame is captured, on cancel, and on unmount.
 */
export function AttendanceCamera({
  onCapture,
  onCancel,
}: {
  onCapture: (file: File) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [cameraError, setCameraError] = useState<CameraErrorType>("other");

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
      setPhase("capturing");
    } catch (error) {
      setCameraError(classifyCameraError(error));
      setPhase("camera-error");
    }
  };

  const handleAutoCapture = useCallback(
    (file: File) => {
      stopStream();
      onCapture(file);
    },
    [stopStream, onCapture]
  );

  const status = useAutoFaceCapture({
    videoRef,
    landmarkerRef,
    active: phase === "capturing",
    target: "front",
    fileName: "attendance.jpg",
    onCapture: handleAutoCapture,
  });

  const handleCancel = () => {
    stopStream();
    onCancel();
  };

  const lookingStraight = status.faceCount === 1 && status.angleOk;

  return (
    <div>
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
      </div>

      {phase === "capturing" && (
        <div className="mt-4 text-center">
          <p className="text-base font-semibold text-slate-900">
            LOOK STRAIGHT
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {guidanceMessage(status, "Look directly at the camera")}
          </p>
          {lookingStraight && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              Looking straight
            </p>
          )}

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
            No capture button needed — this happens automatically.
          </p>
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
