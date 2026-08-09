"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  FileQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { fetchCurrentMonthAlerts, BudgetAlertItem } from "@/lib/budget-checker";
import { checkIsIncomplete, getMissingFields } from "@/lib/incomplete-checker";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";

export function NotificationsPopover() {
  const { t, language } = useLanguage();
  const [alerts, setAlerts] = useState<BudgetAlertItem[]>([]);
  const [incompleteItems, setIncompleteItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"budget" | "incomplete">(
    "incomplete"
  );

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCurrentMonthAlerts();
      setAlerts(data);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIncompleteItems = useCallback(async () => {
    try {
      const res = await fetch("/api/cashflow/incomplete");
      if (res.ok) {
        const data = await res.json();
        setIncompleteItems(data);
      }
    } catch {
      setIncompleteItems([]);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    loadIncompleteItems();

    const handleRefresh = () => {
      loadAlerts();
      loadIncompleteItems();
    };

    window.addEventListener("refresh-budget-alerts", handleRefresh);
    window.addEventListener("refresh-incomplete-count", handleRefresh);

    return () => {
      window.removeEventListener("refresh-budget-alerts", handleRefresh);
      window.removeEventListener("refresh-incomplete-count", handleRefresh);
    };
  }, [loadAlerts, loadIncompleteItems]);

  // Set initial active tab based on availability
  useEffect(() => {
    if (incompleteItems.length > 0) {
      setActiveTab("incomplete");
    } else if (alerts.length > 0) {
      setActiveTab("budget");
    }
  }, [incompleteItems.length, alerts.length]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  const totalNotificationCount = alerts.length + incompleteItems.length;
  const overCount = alerts.filter((a) => a.type === "OVER").length;
  const warningCount = alerts.filter((a) => a.type === "WARNING").length;

  const handleEditIncomplete = (item: any) => {
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent("open-edit-cashflow-modal", {
        detail: { item },
      })
    );
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="relative h-9 w-9 rounded-xl border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-sky-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
            title="Trung tâm thông báo"
          >
            <Bell className="h-4 w-4" />
            {totalNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950 px-1 shadow-xs animate-pulse">
                {totalNotificationCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-80 sm:w-96 p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Bar with Tabs */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-sky-500" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {language === "vi" ? "Trung Tâm Thông Báo" : "Notification Center"}
                </h4>
              </div>
              {totalNotificationCount > 0 && (
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md">
                  {totalNotificationCount} {language === "vi" ? "thông báo" : "alerts"}
                </Badge>
              )}
            </div>

            {/* Segmented Tabs */}
            <div className="grid grid-cols-2 p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("incomplete")}
                className={cn(
                  "py-1.5 px-2 text-[11px] font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  activeTab === "incomplete"
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <AlertTriangle className="h-3 w-3" />
                {language === "vi" ? "Cần Bổ Sung" : "Incomplete"} ({incompleteItems.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("budget")}
                className={cn(
                  "py-1.5 px-2 text-[11px] font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  activeTab === "budget"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <Bell className="h-3 w-3" />
                {language === "vi" ? "Hạn Mức" : "Budgets"} ({alerts.length})
              </button>
            </div>
          </div>

          {/* TAB 1: INCOMPLETE TRANSACTIONS LIST */}
          {activeTab === "incomplete" && (
            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              {incompleteItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {language === "vi" ? "Tuyệt vời! Tất cả giao dịch đã đầy đủ thông tin" : "Awesome! All transactions are fully categorized"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {language === "vi" ? "Không có giao dịch nào bị thiếu Nguồn, Nhãn chính hay Nhãn phụ." : "No missing Source, Primary Category or Secondary Tags."}
                  </p>
                </div>
              ) : (
                incompleteItems.map((item) => {
                  const missingFields = getMissingFields(item);
                  const isIncome = item.cashType === "Income";

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-amber-300 dark:border-amber-700/80 bg-amber-500/10 dark:bg-amber-950/40 text-xs space-y-2 hover:bg-amber-500/15 transition-all shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </span>
                            <Badge
                              className={cn(
                                "text-[9px] font-black px-1.5 py-0 rounded-md shrink-0",
                                isIncome
                                  ? "bg-emerald-500 text-white"
                                  : "bg-rose-500 text-white"
                              )}
                            >
                              {isIncome
                                ? `+${formatVND(item.amountOfMoney)}`
                                : `-${formatVND(item.amountOfMoney)}`}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.datetime
                              ? new Date(item.datetime).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")
                              : (language === "vi" ? "Chưa chọn ngày" : "No date")}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleEditIncomplete(item)}
                          className="h-7 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg shrink-0 gap-1 shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3" />
                          {t("common.edit")}
                        </Button>
                      </div>

                      <div className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200 bg-amber-400/20 dark:bg-amber-900/40 px-2 py-1 rounded-lg border border-amber-400/30 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          {language === "vi" ? "Thiếu:" : "Missing:"} <strong className="underline">{missingFields.join(", ")}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: BUDGET ALERTS LIST */}
          {activeTab === "budget" && (
            <div className="max-h-80 overflow-y-auto p-3 space-y-2.5">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {language === "vi" ? "Tất cả các nhãn chi tiêu đều an toàn" : "All spending budgets are safe"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {language === "vi" ? "Chưa có danh mục nào chạm ngưỡng hoặc vượt hạn mức trong tháng này." : "No categories approaching or exceeding limits this month."}
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
                          {alert.isSecondary ? (language === "vi" ? "Nhãn phụ" : "Secondary") : (language === "vi" ? "Nhãn chính" : "Primary")}
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
                        {alert.type === "OVER" ? (language === "vi" ? "🔴 VƯỢT HẠN MỨC" : "🔴 OVER LIMIT") : (language === "vi" ? "🟡 CHẠM NGƯỠNG" : "🟡 WARNING")}
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between text-[11px] font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">
                        {language === "vi" ? "Đã chi:" : "Spent:"}{" "}
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
                        {language === "vi" ? "Hạn mức:" : "Limit:"} {formatVND(alert.budgetLimit)} ({alert.percent.toFixed(0)}%)
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
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
