"use client";

export function ThresholdSlider({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label
          htmlFor="recognition-threshold"
          className="text-sm font-medium text-slate-700"
        >
          Recognition Threshold
        </label>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-sm font-semibold text-slate-700">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        id="recognition-threshold"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={value.toFixed(2)}
        className="w-full accent-blue-600 disabled:opacity-60"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
        <span>More matches</span>
        <span>Stricter matching</span>
      </div>
    </div>
  );
}
