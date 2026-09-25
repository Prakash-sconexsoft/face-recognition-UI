"use client";

import {
  AlertTriangle,
  Camera as CameraIcon,
  Loader2,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMERA_ERROR_MESSAGES as ERROR_MESSAGES,
  type CameraErrorType,
  acquireCameraStream as acquireStream,
  classifyCameraError as classifyError,
  stopMediaStream,
} from "@/lib/camera";

type CameraState = "requesting" | "streaming" | "captured" | "error";

/**
 * Generic single-shot camera capture modal — request access, show a live
 * (mirrored) preview, let the user manually capture one photo, then review
 * it with Retake/Use Photo. No pose guidance of any kind; used both by the
 * enrollment flow (per face angle) and the Recognize page (one photo).
 *
 * Mounted only while the modal is open (parent conditionally renders this
 * component), so every open gets a fresh instance/initial state instead of
 * needing an effect to reset state on reopen.
 */
export function CameraCapture({
  label,
  hint,
  title,
  fileName = "capture.jpg",
  onCapture,
  onClose,
}: {
  label: string;
  hint: string;
  /** Overrides the default "Capture {label}" modal heading. */
  title?: string;
  /** Filename given to the captured File. */
  fileName?: string;
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("requesting");
  const [errorType, setErrorType] = useState<CameraErrorType>("other");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const stopStream = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
  }, []);

  const attachStream = (stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  };

  // Request camera access on mount only (never on page load — this
  // component only exists while the "Use Camera" modal is open).
  useEffect(() => {
    let cancelled = false;
    acquireStream()
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        attachStream(stream);
        setState("streaming");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorType(classifyError(error));
        setState("error");
      });
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  // Used by explicit user actions ("Try Again", "Retake") — not called from
  // an effect, so setting state directly here is fine.
  const requestCamera = async () => {
    setState("requesting");
    try {
      const stream = await acquireStream();
      attachStream(stream);
      setState("streaming");
    } catch (error) {
      setErrorType(classifyError(error));
      setState("error");
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop the stream as soon as the frame is captured — it is no longer needed.
    stopStream();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], fileName, { type: "image/jpeg" });
        setCapturedFile(file);
        setCapturedUrl(URL.createObjectURL(blob));
        setState("captured");
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    setCapturedUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setCapturedFile(null);
    requestCamera();
  };

  const handleUsePhoto = () => {
    if (!capturedFile) return;
    stopStream();
    onCapture(capturedFile);
    onClose();
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60"
        onClick={handleClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? `Capture ${label} photo`}
        className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {title ?? `Capture ${label}`}
            </p>
            <p className="text-xs text-slate-500">{hint}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close camera"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-square w-full bg-slate-900">
          {state === "requesting" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Requesting camera access...</span>
            </div>
          )}

          {state === "error" && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-sm text-slate-100">
                {ERROR_MESSAGES[errorType]}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={requestCamera}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-500 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload Instead
                </button>
              </div>
            </div>
          )}

          {/* Video element stays mounted (hidden when not streaming) so the
              ref is stable across state transitions. */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={
              state === "streaming"
                ? "h-full w-full -scale-x-100 object-cover"
                : "hidden"
            }
          />

          {state === "streaming" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-3/4 w-3/4 rounded-[45%] border-2 border-dashed border-white/70" />
            </div>
          )}

          {state === "captured" && capturedUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedUrl}
              alt={`Captured ${label}`}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="flex items-center justify-center gap-3 px-5 py-4">
          {state === "streaming" && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCapture}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <CameraIcon className="h-4 w-4" />
                Capture Photo
              </button>
            </>
          )}

          {state === "captured" && (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Retake
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
