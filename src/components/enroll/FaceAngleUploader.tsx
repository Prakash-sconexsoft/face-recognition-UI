"use client";

import {
  Camera as CameraIcon,
  ImagePlus,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { CameraCapture } from "@/components/camera/CameraCapture";
import { cn } from "@/lib/utils";

export function FaceAngleUploader({
  label,
  hint,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const acceptFile = (candidate: File | undefined | null) => {
    if (!candidate) return;
    if (!candidate.type.startsWith("image/")) return;
    onChange(candidate);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {file && (
          <span className="text-xs font-medium text-emerald-600">Ready</span>
        )}
      </div>

      <div
        onDragOver={(event) => {
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
          "relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-slate-50 transition-colors",
          isDragging
            ? "border-blue-400 bg-blue-50"
            : previewUrl
              ? "border-slate-200"
              : "border-slate-300 hover:border-slate-400"
        )}
      >
        {previewUrl ? (
          <>
            <Image
              src={previewUrl}
              alt={`${label} preview`}
              fill
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 bg-gradient-to-t from-slate-950/70 to-transparent p-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
              >
                <CameraIcon className="h-3.5 w-3.5" />
                Camera
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <UploadCloud className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600">
                Drag &amp; drop, upload, or use your camera
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload Image
              </button>
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
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
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
      </div>

      {file && (
        <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-slate-400">
          <ImagePlus className="h-3 w-3 shrink-0" />
          {file.name}
        </p>
      )}

      {cameraOpen && (
        <CameraCapture
          label={label}
          hint={hint}
          onCapture={(captured) => onChange(captured)}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
