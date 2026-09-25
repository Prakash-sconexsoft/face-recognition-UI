"use client";

import { HardDrive, ImageOff, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";
import { angleLabel, formatDateTime } from "@/lib/utils";
import type { Embedding } from "@/types";

// The backend currently returns image_path as an absolute filesystem path
// on the server's own disk (e.g. "C:\Users\...\data\faces\EMP45\00_front.jpg"
// or a Unix equivalent) — never a URL. There is no static/image-serving
// route on the backend to fetch these from, so we detect that case up front
// instead of firing a network request guaranteed to 404.
const WINDOWS_ABS_PATH = /^[a-zA-Z]:[\\/]/;
const UNC_PATH = /^\\\\/;

function isLocalFilesystemPath(path: string): boolean {
  return WINDOWS_ABS_PATH.test(path) || UNC_PATH.test(path) || path.includes("\\");
}

function resolveImageUrl(imagePath: string): string | null {
  if (!imagePath || isLocalFilesystemPath(imagePath)) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (!API_BASE_URL) return null;
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${API_BASE_URL}${path}`;
}

export function EmbeddingCard({
  embedding,
  onDelete,
}: {
  embedding: Embedding;
  onDelete: (embedding: Embedding) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = resolveImageUrl(embedding.image_path);
  const storedOnServerOnly =
    !imageUrl && Boolean(embedding.image_path) && isLocalFilesystemPath(embedding.image_path);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative flex aspect-square items-center justify-center bg-slate-100">
        {imageUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${angleLabel(embedding.angle)} face`}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : storedOnServerOnly ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <HardDrive className="h-8 w-8" />
            <span className="px-4 text-center text-xs">
              Stored on server, not accessible from the browser
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            {imageFailed ? (
              <ImageOff className="h-8 w-8" />
            ) : (
              <UserRound className="h-8 w-8" />
            )}
            <span className="px-4 text-center text-xs">
              Preview unavailable
            </span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-xs font-medium text-white">
          {angleLabel(embedding.angle)}
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs text-slate-500">
          Enrolled {formatDateTime(embedding.created_at)}
        </p>
        <button
          type="button"
          onClick={() => onDelete(embedding)}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
