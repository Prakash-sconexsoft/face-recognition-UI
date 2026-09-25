"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { ThresholdSlider } from "@/components/recognize/ThresholdSlider";
import { InlineError } from "@/components/ui/ErrorState";
import {
  DEFAULT_RECOGNITION_THRESHOLD,
  getRecognitionThreshold,
  saveRecognitionThreshold,
  subscribeRecognitionThreshold,
} from "@/lib/settings";

export function RecognitionSettingsCard() {
  const savedThreshold = useSyncExternalStore(
    subscribeRecognitionThreshold,
    getRecognitionThreshold,
    () => DEFAULT_RECOGNITION_THRESHOLD
  );
  // Unsaved slider edits; null means "showing the saved value".
  const [draft, setDraft] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const value = draft ?? savedThreshold;
  const dirty = draft !== null && draft.toFixed(2) !== savedThreshold.toFixed(2);

  const handleChange = (next: number) => {
    setDraft(next);
    setJustSaved(false);
    setErrorMessage(null);
  };

  const handleSave = () => {
    try {
      saveRecognitionThreshold(value);
      setDraft(null);
      setJustSaved(true);
    } catch {
      setErrorMessage(
        "Could not save settings. Your browser may be blocking site storage."
      );
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">
            Recognition Settings
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Controls how closely a face must match an enrolled person during
            Take Attendance.
          </p>

          <div className="mt-4">
            <ThresholdSlider value={value} onChange={handleChange} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Settings
            </button>
            {justSaved && !dirty && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <Check className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>

          {errorMessage && (
            <div className="mt-3">
              <InlineError message={errorMessage} />
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">
            Saved in this browser. Default is{" "}
            {DEFAULT_RECOGNITION_THRESHOLD.toFixed(2)}.
          </p>
        </div>
      </div>
    </div>
  );
}
