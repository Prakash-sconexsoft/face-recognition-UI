/**
 * Application-level settings persisted in this browser's localStorage.
 *
 * The backend has no settings/configuration endpoint, so the admin-chosen
 * recognition threshold is stored client-side and sent as the existing
 * `threshold` query parameter on POST /api/recognize.
 */

const THRESHOLD_STORAGE_KEY = "frs.recognitionThreshold";

/** Matches the backend's own default when no threshold is supplied. */
export const DEFAULT_RECOGNITION_THRESHOLD = 0.5;

const listeners = new Set<() => void>();

function clampThreshold(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
}

/** Saved threshold, or the default if none is saved / storage is unavailable. */
export function getRecognitionThreshold(): number {
  try {
    const raw = window.localStorage.getItem(THRESHOLD_STORAGE_KEY);
    if (raw === null) return DEFAULT_RECOGNITION_THRESHOLD;
    const value = Number(raw);
    return Number.isFinite(value)
      ? clampThreshold(value)
      : DEFAULT_RECOGNITION_THRESHOLD;
  } catch {
    return DEFAULT_RECOGNITION_THRESHOLD;
  }
}

/** Throws if the browser blocks localStorage. */
export function saveRecognitionThreshold(value: number): void {
  window.localStorage.setItem(
    THRESHOLD_STORAGE_KEY,
    clampThreshold(value).toFixed(2)
  );
  listeners.forEach((listener) => listener());
}

/** For useSyncExternalStore — also picks up changes made in other tabs. */
export function subscribeRecognitionThreshold(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
