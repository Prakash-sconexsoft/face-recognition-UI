import { ApiError } from "@/types";

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

/** Base URL with any trailing slash stripped so paths can always start with "/". */
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

/** Generous enough for image analysis over a tunneled (e.g. ngrok) connection. */
const REQUEST_TIMEOUT_MS = 45000;

function buildHeaders(existing?: HeadersInit): Headers {
  const headers = new Headers(existing);
  if (API_KEY) {
    headers.set("X-API-Key", API_KEY);
  }
  // Required by ngrok's free-tier interstitial to allow programmatic access.
  headers.set("ngrok-skip-browser-warning", "true");
  return headers;
}

async function parseErrorDetail(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return undefined;
  }
}

function messageFromDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail === "object") {
    const record = detail as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.message === "string") return record.message;
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "NEXT_PUBLIC_API_BASE_URL is not configured. Set it in your environment to reach the backend."
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: buildHeaders(init?.headers),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(
        "The request timed out. Check your connection and try again."
      );
    }
    throw new ApiError(
      "Could not reach the backend. Check your network connection and the API base URL."
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiError(
      messageFromDetail(detail, `Request failed with status ${response.status}`),
      response.status,
      detail
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    throw new ApiError("The server returned an empty response.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("The server returned an unexpected response.");
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: BodyInit) =>
    request<T>(path, { method: "POST", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
