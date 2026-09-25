"use client";

import { useState } from "react";
import { faceColorAt } from "@/lib/faceColors";
import type { RecognizedFace } from "@/types";

function isValidBox(bbox: number[]): bbox is [number, number, number, number] {
  return bbox.length === 4 && bbox.every((n) => Number.isFinite(n));
}

export function BoundingBoxOverlay({
  imageUrl,
  faces,
  activeIndex = null,
  onHoverFace,
}: {
  imageUrl: string;
  faces: RecognizedFace[];
  activeIndex?: number | null;
  onHoverFace?: (index: number | null) => void;
}) {
  const [dims, setDims] = useState<{ width: number; height: number } | null>(
    null
  );

  return (
    <div className="relative overflow-hidden rounded-lg bg-slate-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Uploaded photo submitted for face recognition"
        className="block h-auto w-full select-none"
        draggable={false}
        onLoad={(event) => {
          const target = event.currentTarget;
          setDims({
            width: target.naturalWidth,
            height: target.naturalHeight,
          });
        }}
      />

      {dims && dims.width > 0 && dims.height > 0 && (
        <div className="absolute inset-0">
          {faces.map((face, index) => {
            if (!isValidBox(face.bbox)) return null;
            const [x1, y1, x2, y2] = face.bbox;
            const color = faceColorAt(index);
            const isActive = activeIndex === index;

            const left = (Math.min(x1, x2) / dims.width) * 100;
            const top = (Math.min(y1, y2) / dims.height) * 100;
            const width = (Math.abs(x2 - x1) / dims.width) * 100;
            const height = (Math.abs(y2 - y1) / dims.height) * 100;

            return (
              <div
                key={index}
                className={`absolute rounded-sm border-2 ${color.border} ${
                  face.is_known ? "border-solid" : "border-dashed"
                } ${
                  isActive
                    ? "ring-2 ring-white ring-offset-1 ring-offset-slate-900/50"
                    : ""
                } transition-shadow`}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
                onMouseEnter={() => onHoverFace?.(index)}
                onMouseLeave={() => onHoverFace?.(null)}
              >
                <span
                  className={`absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-semibold text-white shadow ${color.bg}`}
                >
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
