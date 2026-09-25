"use client";

import { CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import Link from "next/link";
import { faceColorAt } from "@/lib/faceColors";
import { angleLabel, cn } from "@/lib/utils";
import type { RecognizedFace } from "@/types";

function toPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function FaceResultCard({
  face,
  index,
  personName,
  active = false,
  onHover,
}: {
  face: RecognizedFace;
  index: number;
  personName?: string;
  active?: boolean;
  onHover?: (index: number | null) => void;
}) {
  const color = faceColorAt(index);
  const canNavigate = face.is_known && face.person_id != null;

  const content = (
    <div
      onMouseEnter={() => onHover?.(index)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm transition-colors",
        active ? `${color.border} ring-1 ${color.ring}` : "border-slate-200",
        canNavigate && "hover:border-blue-300 hover:bg-blue-50/40"
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white",
            color.bg
          )}
        >
          {index + 1}
        </span>
        {face.is_known ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Known Person
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
            <HelpCircle className="h-3.5 w-3.5" />
            Unknown Person
          </span>
        )}
        {canNavigate && (
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
        )}
      </div>

      {face.is_known ? (
        <div className="mt-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {personName ?? "Enrolled Person"}
          </p>
          {face.person_code && (
            <p className="truncate font-mono text-xs text-slate-500">
              {face.person_code}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          This face does not match anyone in the enrolled gallery.
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
        <Stat label="Similarity" value={toPercent(face.similarity)} />
        <Stat label="Detection" value={toPercent(face.det_score)} />
        <Stat
          label="Matched Angle"
          value={
            face.is_known && face.best_matched_angle
              ? angleLabel(face.best_matched_angle)
              : "—"
          }
        />
      </div>
    </div>
  );

  if (canNavigate) {
    return (
      <Link href={`/people/${face.person_id}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
