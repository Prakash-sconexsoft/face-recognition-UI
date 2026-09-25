export interface FaceColor {
  border: string;
  bg: string;
  text: string;
  ring: string;
  hex: string;
}

/** Cycled by face index so bounding boxes and result cards share a color. */
const FACE_COLORS: FaceColor[] = [
  { border: "border-blue-500", bg: "bg-blue-500", text: "text-blue-600", ring: "ring-blue-500", hex: "#3b82f6" },
  { border: "border-emerald-500", bg: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-500", hex: "#10b981" },
  { border: "border-amber-500", bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-500", hex: "#f59e0b" },
  { border: "border-violet-500", bg: "bg-violet-500", text: "text-violet-600", ring: "ring-violet-500", hex: "#8b5cf6" },
  { border: "border-rose-500", bg: "bg-rose-500", text: "text-rose-600", ring: "ring-rose-500", hex: "#f43f5e" },
  { border: "border-cyan-500", bg: "bg-cyan-500", text: "text-cyan-600", ring: "ring-cyan-500", hex: "#06b6d4" },
];

export function faceColorAt(index: number): FaceColor {
  return FACE_COLORS[index % FACE_COLORS.length];
}
