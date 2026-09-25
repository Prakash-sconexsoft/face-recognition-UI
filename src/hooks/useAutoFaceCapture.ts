"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { evaluatePose, type PoseTarget } from "@/lib/pose";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

const DETECTION_INTERVAL_MS = 150;
const HOLD_DURATION_MS = 900;

export interface DetectionStatus {
  faceCount: number;
  centered: boolean;
  sizeOk: boolean;
  angleOk: boolean;
  distanceHint: "ok" | "too-close" | "too-far";
  holdProgress: number;
}

export const IDLE_STATUS: DetectionStatus = {
  faceCount: 0,
  centered: false,
  sizeOk: false,
  angleOk: false,
  distanceHint: "ok",
  holdProgress: 0,
};

/** Positioning guidance shown under the live preview. */
export function guidanceMessage(
  status: DetectionStatus,
  angleInstruction: string
): string {
  if (status.faceCount === 0) return "Position your face inside the frame";
  if (status.faceCount > 1)
    return "Please make sure only one person is in the camera.";
  if (status.distanceHint === "too-far") return "Move a little closer";
  if (status.distanceHint === "too-close") return "Move back slightly";
  if (!status.centered) return "Center your face in the frame";
  if (!status.angleOk) return angleInstruction;
  return "Hold still...";
}

/**
 * Grabs the video's current (unmirrored) frame as a JPEG File. Resolves null
 * if the video has no frame yet. Shared by auto-capture and manual capture.
 */
export function captureVideoFrame(
  video: HTMLVideoElement,
  fileName: string
): Promise<{ file: File; blob: Blob } | null> {
  return new Promise((resolve) => {
    if (video.videoWidth === 0) return resolve(null);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return resolve(null);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) =>
        resolve(
          blob
            ? { file: new File([blob], fileName, { type: "image/jpeg" }), blob }
            : null
        ),
      "image/jpeg",
      0.92
    );
  });
}

/**
 * Shared guided auto-capture loop (used by enrollment and attendance).
 *
 * While `active`, runs face-landmark detection on the video every
 * DETECTION_INTERVAL_MS. Once exactly one face is centered, correctly sized
 * and at the `target` pose for HOLD_DURATION_MS, grabs the current frame as
 * a JPEG File and calls `onCapture`. The caller is expected to flip `active`
 * off (e.g. by changing phase) in response.
 */
export function useAutoFaceCapture({
  videoRef,
  landmarkerRef,
  active,
  target,
  fileName,
  onCapture,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarkerRef: RefObject<FaceLandmarker | null>;
  active: boolean;
  target: PoseTarget;
  fileName: string;
  onCapture: (file: File, blob: Blob) => void;
}): DetectionStatus {
  const capturingRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const onCaptureRef = useRef(onCapture);
  const [status, setStatus] = useState<DetectionStatus>(IDLE_STATUS);

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    if (!active) return;

    capturingRef.current = false;
    holdStartRef.current = null;

    const capture = () => {
      const video = videoRef.current;
      if (!video) {
        capturingRef.current = false;
        return;
      }
      captureVideoFrame(video, fileName).then((frame) => {
        if (!frame) {
          capturingRef.current = false;
          return;
        }
        onCaptureRef.current(frame.file, frame.blob);
      });
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
  }, [active, target, fileName, videoRef, landmarkerRef]);

  return status;
}
