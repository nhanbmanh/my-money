"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MetricHelpInfoProps {
  title: string;
  description: string;
  formula?: string;
  titleColorClass?: string;
}

export function MetricHelpInfo({
  title,
  description,
  formula,
  titleColorClass = "text-sky-400",
}: MetricHelpInfoProps) {
  const [openSheet, setOpenSheet] = useState(false);

  return (
    <>
      {/* Desktop Tooltip (Visible on MD screens and above) */}
      <div className="hidden md:inline-block">
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-slate-400 hover:text-sky-400 transition-colors cursor-help inline-flex items-center justify-center p-0.5 rounded-full hover:bg-slate-800/50"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="w-80 p-3.5 space-y-2 text-xs bg-slate-900 text-slate-100 border border-slate-700 shadow-2xl rounded-2xl"
            >
              <div className={`font-extrabold text-xs tracking-wide ${titleColorClass}`}>
                {title}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {description}
              </p>
              {formula && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-mono font-bold flex items-start gap-1.5">
                  <span className="shrink-0">🧮</span>
                  <span>{formula}</span>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Mobile Bottom Sheet (Visible on touch screens below MD) */}
      <div className="inline-block md:hidden">
        <Sheet open={openSheet} onOpenChange={setOpenSheet}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="text-slate-400 active:text-sky-400 transition-colors p-1.5 -m-1.5 inline-flex items-center justify-center rounded-full active:bg-slate-800/80"
            >
              <Info className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="p-6 bg-slate-900 text-slate-100 border-t border-slate-800 rounded-t-3xl max-h-[85vh] overflow-y-auto"
          >
            {/* Sheet Handle Indicator */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />

            <SheetHeader className="p-0 text-left space-y-2">
              <SheetTitle className={`text-base font-extrabold tracking-wide ${titleColorClass}`}>
                {title}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-300 leading-relaxed font-normal">
                {description}
              </SheetDescription>
            </SheetHeader>

            {formula && (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-xs text-emerald-400 font-mono font-bold flex items-start gap-2">
                <span className="text-sm shrink-0">🧮</span>
                <span className="leading-normal">{formula}</span>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
