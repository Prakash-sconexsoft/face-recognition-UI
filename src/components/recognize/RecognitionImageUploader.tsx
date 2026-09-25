"use client";

import {
  Camera as CameraIcon,
  ImagePlus,
  ScanFace,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import { CameraCapture } from "@/components/camera/CameraCapture";
import { cn } from "@/lib/utils";

export function RecognitionImageUploader({
  file,
  previewUrl,
  onChange,
  disabled = false,
}: {
  file: File | null;
  previewUrl: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (candidate: File | undefined | null) => {
    if (disabled || !candidate) return;
    if (!candidate.type.startsWith("image/")) return;
    onChange(candidate);
  };

  return (
    <div
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        acceptFile(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        "relative flex min-h-80 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-slate-50 transition-colors",
        isDragging
          ? "border-blue-400 bg-blue-50"
          : previewUrl
            ? "border-slate-200"
            : "border-slate-300 hover:border-slate-400"
      )}
    >
      {previewUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected photo for face recognition"
            className="block h-auto max-h-[28rem] w-full object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 bg-gradient-to-t from-slate-950/70 to-transparent p-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Replace
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setCameraOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CameraIcon className="h-3.5 w-3.5" />
              Camera
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <ScanFace className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              Drag &amp; drop a photo, upload, or use your camera
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Use a clear, well-lit image with one or more visible faces.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Upload Image
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setCameraOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CameraIcon className="h-3.5 w-3.5" />
              Use Camera
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />

      {file && (
        <p className="absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-xs text-slate-500 shadow-sm">
          {file.name}
        </p>
      )}

      {cameraOpen && (
        <CameraCapture
          label="Photo"
          title="Recognize Face"
          hint="Position your face in the frame, then capture."
          fileName="recognition.jpg"
          onCapture={(captured) => onChange(captured)}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
