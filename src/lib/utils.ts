import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSecondaryCategoryBadgeClass(type?: number | null) {
  const normalized = typeof type === "number" ? type : 0;
  const palette = [
    "border-slate-400 bg-slate-50 text-slate-700",
    "border-sky-500 bg-sky-50 text-sky-700",
    "border-emerald-500 bg-emerald-50 text-emerald-700",
    "border-amber-500 bg-amber-50 text-amber-700",
    "border-violet-500 bg-violet-50 text-violet-700",
    "border-rose-500 bg-rose-50 text-rose-700",
  ];

  return palette[normalized % palette.length] ?? palette[0];
}
