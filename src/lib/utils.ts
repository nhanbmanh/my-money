import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSecondaryCategoryBadgeClass(type?: number | null) {
  const normalized = typeof type === "number" ? type : 0;
  const palette = [
    "border-slate-400 bg-slate-50 text-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-600",
    "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700",
    "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700",
    "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700",
    "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300 dark:border-violet-700",
    "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700",
  ];

  return palette[normalized % palette.length] ?? palette[0];
}
