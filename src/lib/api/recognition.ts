import { apiClient } from "@/lib/api/client";
import type { RecognizeResponse } from "@/types";

export interface RecognizeInput {
  file: File;
  /** 0 – 1. Defaults to 0.5 on the backend if omitted. */
  threshold: number;
}

/** POST /api/recognize?threshold=<value> (multipart/form-data) */
export function recognizeFace({
  file,
  threshold,
}: RecognizeInput): Promise<RecognizeResponse> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const clampedThreshold = Math.min(1, Math.max(0, threshold));
  const query = `threshold=${encodeURIComponent(clampedThreshold.toFixed(2))}`;

  return apiClient.post<RecognizeResponse>(`/api/recognize?${query}`, formData);
}
