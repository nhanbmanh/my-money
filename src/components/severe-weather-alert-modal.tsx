"use client";

import React from "react";
import { SevereAlert } from "@/lib/weather-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, Zap, Wind, CloudRain, Flame, Sun, CheckCircle2, Waves, RefreshCw } from "lucide-react";

type SevereWeatherAlertModalProps = {
  isOpen: boolean;
  onClose: () => void;
  alert: SevereAlert | null;
  locationName: string;
  language?: "vi" | "en";
};

export function SevereWeatherAlertModal({
  isOpen,
  onClose,
  alert,
  locationName,
  language = "vi",
}: SevereWeatherAlertModalProps) {
  if (!alert) return null;

  const isCritical = alert.level === "critical";
  const isDanger = alert.level === "danger";

  const getAlertIcon = () => {
    switch (alert.id) {
      case "TYPHOON_CYCLONE":
        return <RefreshCw className="h-8 w-8 text-purple-400 animate-spin" />;
      case "TORNADO_WHIRLWIND":
        return <Wind className="h-8 w-8 text-rose-400 animate-spin" />;
      case "TSUNAMI_COASTAL_SURGE":
        return <Waves className="h-8 w-8 text-cyan-400 animate-pulse" />;
      case "SEVERE_THUNDERSTORM_HAIL":
        return <Zap className="h-8 w-8 text-amber-400 animate-bounce" />;
      case "HIGH_WIND_GALE":
        return <Wind className="h-8 w-8 text-sky-400 animate-pulse" />;
      case "TORRENTIAL_RAIN_FLOOD":
        return <CloudRain className="h-8 w-8 text-blue-400 animate-pulse" />;
      case "EXTREME_HEATWAVE":
        return <Flame className="h-8 w-8 text-rose-500 animate-bounce" />;
      case "EXTREME_UV_RADIATION":
        return <Sun className="h-8 w-8 text-amber-500 animate-pulse" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-amber-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-slate-900/95 border-2 border-rose-500/80 text-white shadow-2xl backdrop-blur-xl rounded-3xl overflow-hidden p-0 border-solid">
        {/* Animated Glow Top Header */}
        <div
          className={`p-4 sm:p-6 text-center border-b shrink-0 ${
            isCritical
              ? "bg-gradient-to-r from-rose-900/90 via-red-800/90 to-rose-900/90 border-rose-700/60"
              : isDanger
              ? "bg-gradient-to-r from-amber-900/90 via-orange-800/90 to-amber-900/90 border-amber-700/60"
              : "bg-gradient-to-r from-amber-950/90 via-amber-900/90 to-amber-950/90 border-amber-600/50"
          }`}
        >
          <div className="flex justify-center mb-2 sm:mb-3">
            <div className="p-2 sm:p-3 bg-white/10 rounded-full border border-white/20 shadow-inner">
              {getAlertIcon()}
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-rose-500/20 border border-rose-400/40 text-rose-200 mb-1.5">
            <ShieldAlert className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {language === "vi" ? "CẢNH BÁO THỜI TIẾT CỰC ĐOAN REALTIME" : "REALTIME SEVERE WEATHER ALERT"}
          </div>

          <DialogTitle className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
            {alert.title}
          </DialogTitle>
          <p className="text-[11px] sm:text-xs text-rose-200/80 font-medium mt-1">
            📍 {locationName} · {language === "vi" ? "Thời điểm hiện tại" : "Current Time"}
          </p>
        </div>

        {/* Scrollable Modal Body Content */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Description Box */}
          <DialogDescription className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed bg-slate-800/80 p-3 sm:p-3.5 rounded-2xl border border-slate-700">
            {alert.description}
          </DialogDescription>

          {/* Key Realtime Metrics */}
          {alert.metrics && alert.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {alert.metrics.map((m, idx) => (
                <div key={idx} className="bg-slate-800/60 border border-slate-700/80 p-2 sm:p-2.5 rounded-xl text-center">
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">{m.label}</span>
                  <span className="text-xs sm:text-sm font-black text-amber-400">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Safety Recommendation List */}
          <div className="space-y-1.5 sm:space-y-2">
            <h4 className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {language === "vi" ? "KHUYẾN CÁO AN TOÀN QUAN TRỌNG" : "CRITICAL SAFETY RECOMMENDATIONS"}
            </h4>

            <ul className="space-y-1.5 sm:space-y-2 text-xs font-medium text-slate-300">
              {alert.advice.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-800/40 p-2 sm:p-2.5 rounded-xl border border-slate-700/50">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span className="text-[11px] sm:text-xs leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-5 bg-slate-950/90 border-t border-slate-800 shrink-0">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-xs sm:text-sm py-2.5 sm:py-3 rounded-2xl shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            {language === "vi" ? "Tôi Đã Hiểu & Đóng Cảnh Báo" : "I Understand & Dismiss Alert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
