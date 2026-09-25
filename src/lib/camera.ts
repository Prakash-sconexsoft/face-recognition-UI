export type CameraErrorType =
  | "denied"
  | "unavailable"
  | "in-use"
  | "unsupported"
  | "other";

export const CAMERA_ERROR_MESSAGES: Record<CameraErrorType, string> = {
  denied: "Camera access is required to capture a face image.",
  unavailable: "No camera was found on this device.",
  "in-use": "The camera is already in use by another application.",
  unsupported: "Camera access is not supported in this browser.",
  other: "Something went wrong while accessing the camera.",
};

export function classifyCameraError(error: unknown): CameraErrorType {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
      case "PermissionDeniedError":
        return "denied";
      case "NotFoundError":
      case "OverconstrainedError":
        return "unavailable";
      case "NotReadableError":
      case "TrackStartError":
        return "in-use";
      default:
        return "other";
    }
  }
  if (error instanceof Error && error.name === "Unsupported") return "unsupported";
  return "other";
}

/** Pure — never touches component state, so it's safe to call from an effect. */
export async function acquireCameraStream(): Promise<MediaStream> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    const err = new Error("Camera not supported");
    err.name = "Unsupported";
    throw err;
  }
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "user" },
      width: { ideal: 1280 },
      height: { ideal: 960 },
    },
    audio: false,
  });
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
