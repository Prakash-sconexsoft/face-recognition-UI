/**
 * Domain types mirrored exactly from the backend API contract.
 * Do not add fields the backend does not actually return.
 */

export type FaceAngle = "front" | "left_45" | "right_45";

export interface Person {
  id: number;
  person_code: string;
  name: string;
  created_at: string;
  embedding_count: number;
}

export interface Embedding {
  id: number;
  angle: string;
  image_path: string;
  created_at: string;
}

export interface EnrollmentResult {
  image_name: string;
  angle: string;
  face_detected: boolean;
  embedding_generated: boolean;
  status: string;
  reason?: string | null;
}

export interface EnrollmentResponse {
  person: Person;
  results: EnrollmentResult[];
  success_count: number;
}

export interface DeleteResponse {
  message: string;
}

export interface RecognizedFace {
  /** [x1, y1, x2, y2] in the original image's pixel coordinates. */
  bbox: number[];
  det_score: number;
  label: string;
  similarity: number;
  is_known: boolean;
  person_id?: number | null;
  person_code?: string | null;
  best_matched_angle?: string | null;
}

export interface RecognizeResponse {
  faces: RecognizedFace[];
  gallery_empty: boolean;
}

/** Thrown by the API client for any non-2xx response or network failure. */
export class ApiError extends Error {
  status?: number;
  detail?: unknown;

  constructor(message: string, status?: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}
