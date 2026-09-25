import type { FaceLandmarker } from "@mediapipe/tasks-vision";

const WASM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

/**
 * Lazily creates (and caches) a single client-side FaceLandmarker instance
 * for the session. This only guides/validates capture in the browser — it
 * never replaces the backend's own face detection or embedding generation.
 */
export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker: FaceLandmarkerClass, FilesetResolver } =
        await import("@mediapipe/tasks-vision");
      const filesetResolver =
        await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      return FaceLandmarkerClass.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_URL,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numFaces: 2,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
      });
    })();

    landmarkerPromise.catch(() => {
      // Allow a later call (e.g. "Try Again") to retry instead of being
      // stuck on a permanently rejected cached promise.
      landmarkerPromise = null;
    });
  }
  return landmarkerPromise;
}
