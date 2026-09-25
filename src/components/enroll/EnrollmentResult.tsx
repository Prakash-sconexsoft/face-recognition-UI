import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { angleLabel, cn } from "@/lib/utils";
import type { EnrollmentResult as EnrollmentResultType } from "@/types";

export function EnrollmentResultList({
  results,
}: {
  results: EnrollmentResultType[];
}) {
  return (
    <div className="space-y-3">
      {results.map((result, index) => {
        const success = result.face_detected && result.embedding_generated;
        const Icon = success ? CheckCircle2 : result.face_detected ? AlertTriangle : XCircle;

        return (
          <div
            key={`${result.image_name}-${index}`}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4",
              success
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                success ? "text-emerald-600" : "text-amber-600"
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {angleLabel(result.angle)}
                </span>
                <span className="text-xs text-slate-400">
                  ({result.image_name})
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  {result.face_detected ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                  Face {result.face_detected ? "detected" : "not detected"}
                </span>
                <span className="flex items-center gap-1">
                  {result.embedding_generated ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                  Embedding {result.embedding_generated ? "generated" : "failed"}
                </span>
                <span className="font-medium text-slate-700">
                  Status: {result.status}
                </span>
              </div>
              {result.reason && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Reason: {result.reason}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
