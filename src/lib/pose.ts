import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type PoseTarget = "front" | "left_45" | "right_45";

export type DistanceHint = "ok" | "too-close" | "too-far";

export interface PoseEvaluation {
  centered: boolean;
  sizeOk: boolean;
  angleOk: boolean;
  ready: boolean;
  distanceHint: DistanceHint;
  /** Normalized (0–1) face bounding-box width, for tuning. */
  faceWidth: number;
  /** 0–1, 0.5 ≈ straight. See note on sign convention below. */
  yawRatio: number;
}

// Canonical 468-point MediaPipe FaceMesh landmark indices used for a
// lightweight, tolerant yaw estimate (not a precise biometric measurement).
const NOSE_TIP = 1;
const LEFT_BOUNDARY = 234; // near the left temple/cheek
const RIGHT_BOUNDARY = 454; // near the right temple/cheek

const CENTER_TOLERANCE_X = 0.16;
const CENTER_TOLERANCE_Y = 0.2;
const MIN_FACE_WIDTH = 0.2;
const MAX_FACE_WIDTH = 0.78;

const STRAIGHT_MIN = 0.41;
const STRAIGHT_MAX = 0.59;
// The face landmarker is fed the raw (unmirrored) camera frame, so when the
// person turns their own left, their face shifts toward the RIGHT side of
// that frame, raising this ratio above 0.5 — hence "left" maps to the
// higher range. If a real device shows this reversed, swap the two ranges.
const LEFT_MIN = 0.62;
const LEFT_MAX = 0.93;
const RIGHT_MIN = 0.07;
const RIGHT_MAX = 0.38;

export function evaluatePose(
  landmarks: NormalizedLandmark[],
  target: PoseTarget
): PoseEvaluation {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const faceWidth = maxX - minX;

  const centered =
    Math.abs(centerX - 0.5) < CENTER_TOLERANCE_X &&
    Math.abs(centerY - 0.5) < CENTER_TOLERANCE_Y;

  const distanceHint: DistanceHint =
    faceWidth > MAX_FACE_WIDTH
      ? "too-close"
      : faceWidth < MIN_FACE_WIDTH
        ? "too-far"
        : "ok";
  const sizeOk = distanceHint === "ok";

  const nose = landmarks[NOSE_TIP];
  const left = landmarks[LEFT_BOUNDARY];
  const right = landmarks[RIGHT_BOUNDARY];
  const span = right.x - left.x;
  const yawRatio = Math.abs(span) < 1e-4 ? 0.5 : (nose.x - left.x) / span;

  let angleOk: boolean;
  if (target === "front") {
    angleOk = yawRatio >= STRAIGHT_MIN && yawRatio <= STRAIGHT_MAX;
  } else if (target === "left_45") {
    angleOk = yawRatio >= LEFT_MIN && yawRatio <= LEFT_MAX;
  } else {
    angleOk = yawRatio >= RIGHT_MIN && yawRatio <= RIGHT_MAX;
  }

  return {
    centered,
    sizeOk,
    angleOk,
    ready: centered && sizeOk && angleOk,
    distanceHint,
    faceWidth,
    yawRatio,
  };
}
