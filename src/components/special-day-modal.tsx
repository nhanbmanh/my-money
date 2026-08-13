"use client";

import { Star, PartyPopper, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpecialDayInfo } from "@/lib/vietnam-holidays";
import { formatLunarDate } from "@/lib/lunar-calendar";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLanguage } from "@/components/language-provider";

interface SpecialDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  specialDays: SpecialDayInfo[];
}

export function SpecialDayModal({
  open,
  onOpenChange,
  date,
  specialDays,
}: SpecialDayModalProps) {
  const { language } = useLanguage();
  const dateLocale = language === "vi" ? vi : enUS;

  if (!date || specialDays.length === 0) return null;

  const formattedSolar = format(date, "EEEE, 'ngày' dd/MM/yyyy", {
    locale: dateLocale,
  });
  const formattedLunar = formatLunarDate(date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center shrink-0">
              {specialDays.some((s) => s.type === "birthday") ? (
                <PartyPopper className="h-6 w-6 text-sky-500" />
              ) : (
                <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {language === "vi" ? "Thông Tin Ngày Đặc Biệt" : "Special Day Details"}
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                <span>{formattedSolar}</span>
                <span>({formattedLunar})</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {specialDays.map((item, idx) => {
            const isBirthday = item.type === "birthday";
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border space-y-2 transition-all ${
                  isBirthday
                    ? "bg-sky-500/10 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800"
                    : "bg-amber-500/10 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Star
                      className={`h-4 w-4 ${
                        item.iconType === "blue_star"
                          ? "text-sky-400 fill-sky-400"
                          : "text-amber-400 fill-amber-400"
                      }`}
                    />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {language === "vi" ? item.name : item.nameEn}
                    </h3>
                  </div>

                  <Badge
                    className={
                      isBirthday
                        ? "bg-sky-500 text-white text-[10px] font-black"
                        : "bg-amber-500 text-slate-950 text-[10px] font-black"
                    }
                  >
                    {isBirthday
                      ? language === "vi" ? "Sinh Nhật" : "Birthday"
                      : item.type === "lunar"
                      ? language === "vi" ? "Lễ Âm Lịch" : "Lunar Holiday"
                      : language === "vi" ? "Lễ Dương Lịch" : "Solar Holiday"}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                  {language === "vi" ? item.description : item.descriptionEn}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            {language === "vi" ? "Đóng" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
