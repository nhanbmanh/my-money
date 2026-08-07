"use client";

import { useEffect, useState, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { fetchCurrentMonthAlerts, BudgetAlertItem } from "@/lib/budget-checker";
import { cn } from "@/lib/utils";

export function BudgetWarningModal() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<BudgetAlertItem[]>([]);
  const lastOpenedRef = useRef<number>(0);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  useEffect(() => {
    const handleRefresh = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const shouldModal = customEvent?.detail?.triggerModal === true;

      // Only check and open modal if triggerModal is explicitly true
      if (!shouldModal) return;

      const targetPrimaryId = customEvent?.detail?.targetPrimaryCategoryId;
      const targetSecondaryIds = customEvent?.detail?.targetSecondaryCategoryIds as string[] | undefined;

      const now = Date.now();
      // Debounce: don't open modal if opened less than 2 seconds ago
      if (now - lastOpenedRef.current < 2000) return;

      try {
        const data = await fetchCurrentMonthAlerts();
        if (data.length > 0) {
          let relevantAlerts = data;

          // If target categories are provided, filter alerts to only include those categories
          if (targetPrimaryId || (targetSecondaryIds && targetSecondaryIds.length > 0)) {
            relevantAlerts = data.filter((item) => {
              if (item.isSecondary) {
                return targetSecondaryIds?.includes(item.id);
              } else {
                return item.id === targetPrimaryId;
              }
            });
          }

          if (relevantAlerts.length > 0) {
            setAlerts(relevantAlerts);
            setOpen(true);
            lastOpenedRef.current = now;
          }
        }
      } catch (err) {
        console.error("Failed to fetch budget alerts for modal:", err);
      }
    };

    window.addEventListener("refresh-budget-alerts", handleRefresh);

    return () => {
      window.removeEventListener("refresh-budget-alerts", handleRefresh);
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <span>Cảnh Báo Hạn Mức Chi Tiêu</span>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                Giao dịch vừa thực hiện làm chi tiêu chạm hoặc vượt hạn mức tháng
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 my-2 max-h-[50vh] overflow-y-auto pr-1">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "p-3.5 rounded-2xl border transition-all",
                alert.type === "OVER"
                  ? "bg-rose-50/70 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/60"
                  : "bg-amber-50/70 border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/60"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {alert.categoryName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                    {alert.isSecondary ? "Nhãn phụ" : "Nhãn chính"}
                  </span>
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

              <div className="flex items-baseline justify-between text-xs font-semibold mb-2">
                <span className="text-slate-700 dark:text-slate-300">
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
                <span className="text-slate-500 dark:text-slate-400">
                  Hạn mức: {formatVND(alert.budgetLimit)} ({alert.percent.toFixed(1)}%)
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
          ))}
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs rounded-xl"
          >
            Đã hiểu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
