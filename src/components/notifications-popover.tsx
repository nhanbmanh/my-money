"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchCurrentMonthAlerts, BudgetAlertItem } from "@/lib/budget-checker";
import { cn } from "@/lib/utils";

export function NotificationsPopover() {
  const [alerts, setAlerts] = useState<BudgetAlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [toastAlert, setToastAlert] = useState<BudgetAlertItem | null>(null);

  const loadAlerts = useCallback(async (triggerToast = false) => {
    setLoading(true);
    try {
      const data = await fetchCurrentMonthAlerts();
      setAlerts(data);

      if (triggerToast && data.length > 0) {
        // Find highest priority alert (OVER first, or highest percent)
        const topAlert = data[0];
        setToastAlert(topAlert);
        setTimeout(() => {
          setToastAlert(null);
        }, 6000);
      }
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts(false);

    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      const shouldToast = customEvent?.detail?.triggerToast ?? true;
      loadAlerts(shouldToast);
    };

    window.addEventListener("refresh-budget-alerts", handleRefresh);
    return () => {
      window.removeEventListener("refresh-budget-alerts", handleRefresh);
    };
  }, [loadAlerts]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  const overCount = alerts.filter((a) => a.type === "OVER").length;
  const warningCount = alerts.filter((a) => a.type === "WARNING").length;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="relative h-9 w-9 rounded-xl border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-sky-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
            title="Thông báo ngân sách"
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white px-1 shadow-xs animate-pulse">
                {alerts.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-80 sm:w-96 p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-sky-500" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Cảnh Báo Hạn Mức Tháng
              </h4>
            </div>
            {alerts.length > 0 && (
              <div className="flex items-center gap-1.5">
                {overCount > 0 && (
                  <Badge className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    🔴 {overCount} Vượt
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    🟡 {warningCount} Cảnh báo
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-3 space-y-2.5">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Tất cả các nhãn chi tiêu đều an toàn
                </p>
                <p className="text-[11px] text-slate-400">
                  Chưa có danh mục nào chạm ngưỡng hoặc vượt hạn mức trong tháng này.
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-2xl border text-xs space-y-2 transition-all",
                    alert.type === "OVER"
                      ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                      : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {alert.categoryName}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-bold py-0 px-1.5 rounded-md shrink-0 border",
                          alert.isSecondary
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                            : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                        )}
                      >
                        {alert.isSecondary ? "Nhãn phụ" : "Nhãn chính"}
                      </Badge>
                    </div>

                    <Badge
                      className={cn(
                        "text-[10px] font-extrabold px-2 py-0.5 rounded-lg shrink-0",
                        alert.type === "OVER"
                          ? "bg-rose-500 text-white"
                          : "bg-amber-500 text-white"
                      )}
                    >
                      {alert.type === "OVER" ? "🔴 VƯỢT HẠN MỨC" : "🟡 CHẠM NGƯỠNG"}
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between text-[11px] font-semibold">
                    <span className="text-slate-600 dark:text-slate-300">
                      Đã chi:{" "}
                      <strong
                        className={
                          alert.type === "OVER"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-amber-600 dark:text-amber-400"
                        }
                      >
                        {formatVND(alert.spent)}
                      </strong>
                    </span>
                    <span className="text-slate-400 font-medium">
                      Hạn mức: {formatVND(alert.budgetLimit)} ({alert.percent.toFixed(0)}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        alert.type === "OVER" ? "bg-rose-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(alert.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* FLOATING TOAST ALERT UPON CREATING A TRANSACTION THAT TRIGGERS AN ALERT */}
      {toastAlert && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-white dark:bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-5 duration-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1 min-w-0">
              <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400">
                ⚠️ Cảnh Báo Ngân Sách Hạn Mức Tháng
              </h5>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {toastAlert.message}
              </p>
              <p className="text-[11px] text-slate-400">
                Đã chi {formatVND(toastAlert.spent)} / Hạn mức {formatVND(toastAlert.budgetLimit)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setToastAlert(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold shrink-0 p-1"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
