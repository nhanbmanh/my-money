"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CalendarPlanItem,
  PLAN_STATUS_CONFIG,
} from "@/components/calendar-plan-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLanguage } from "@/components/language-provider";

interface CalendarPlanDetailModalProps {
  plan: CalendarPlanItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (plan: CalendarPlanItem) => void;
  onDeleted: () => void;
  onUpdated?: (updatedPlan?: CalendarPlanItem) => void;
}

export function CalendarPlanDetailModal({
  plan,
  open,
  onOpenChange,
  onEdit,
  onDeleted,
  onUpdated,
}: CalendarPlanDetailModalProps) {
  const { language } = useLanguage();
  const dateLocale = language === "vi" ? vi : enUS;

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<number>(plan?.status ?? 0);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (plan) {
      setCurrentStatus(plan.status);
    }
  }, [plan]);

  if (!plan) return null;

  const statusCfg = PLAN_STATUS_CONFIG[currentStatus] || PLAN_STATUS_CONFIG[0];
  const formattedDate = format(new Date(plan.date), "EEEE, 'ngày' dd 'tháng' MM, yyyy", {
    locale: dateLocale,
  });

  const handleStatusChange = async (newStatus: number) => {
    if (currentStatus === newStatus || updatingStatus) return;

    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/calendar-plans/${plan.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCurrentStatus(updated.status ?? newStatus);
        window.dispatchEvent(new CustomEvent("refresh-calendar-notifications"));
        onUpdated?.(updated);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Failed to update plan status:", err);
      }
    } catch (err) {
      console.error("Error updating plan status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/calendar-plans/${plan.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("refresh-calendar-notifications"));
        onDeleted();
        onOpenChange(false);
        setConfirmDelete(false);
      }
    } catch (err) {
      console.error("Failed to delete plan:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
        <DialogHeader className="space-y-3">
          {/* Status Badge & Date */}
          <div className="flex items-center justify-between gap-2">
            {/* Interactive Status Selector Dropdown */}
            <Select
              value={String(currentStatus)}
              onValueChange={(val) => handleStatusChange(Number(val))}
              disabled={updatingStatus}
            >
              <SelectTrigger
                size="sm"
                className={`inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-xl text-xs font-bold border-0 shadow-xs cursor-pointer transition-all hover:opacity-90 ${statusCfg.badgeClass} [&_svg]:text-white focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500`}
                title={language === "vi" ? "Bấm để đổi trạng thái" : "Click to change status"}
              >
                <div className="flex items-center gap-1.5">
                  {updatingStatus ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {language === "vi" ? statusCfg.labelVi : statusCfg.labelEn}
                  </span>
                </div>
                <span className="sr-only">
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[100] min-w-[200px]">
                {Object.entries(PLAN_STATUS_CONFIG).map(([key, cfg]) => {
                  const numKey = Number(key);
                  const isSelected = currentStatus === numKey;
                  return (
                    <SelectItem
                      key={key}
                      value={key}
                      className={`text-xs font-semibold cursor-pointer py-2 rounded-xl my-0.5 focus:bg-slate-100 dark:focus:bg-slate-800 ${
                        isSelected ? "bg-slate-100/80 dark:bg-slate-800/80 font-bold" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.badgeClass}`}
                        />
                        <span
                          className={
                            isSelected
                              ? "text-slate-900 dark:text-slate-100"
                              : "text-slate-600 dark:text-slate-300"
                          }
                        >
                          {language === "vi" ? cfg.labelVi : cfg.labelEn}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(plan.date), "dd/MM/yyyy")}</span>
            </div>
          </div>

          <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
            {plan.title}
          </DialogTitle>
        </DialogHeader>

        {/* Content Body */}
        <div className="space-y-4 my-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span>{formattedDate}</span>
          </div>

          {plan.content ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {plan.content}
            </div>
          ) : (
            <p className="text-xs italic text-slate-400">
              {language === "vi" ? "Không có mô tả chi tiết" : "No description provided"}
            </p>
          )}
        </div>

        {/* Delete Confirmation Alert if active */}
        {confirmDelete ? (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {language === "vi"
                  ? "Xác nhận xóa kế hoạch này?"
                  : "Delete this plan?"}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="h-8 text-xs font-bold rounded-xl cursor-pointer"
              >
                {language === "vi" ? "Hủy" : "Cancel"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-rose-600 hover:bg-rose-700 cursor-pointer"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {language === "vi" ? "Đồng ý xóa" : "Confirm Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="pt-2 flex flex-row items-center justify-between sm:justify-between w-full gap-2">
            {/* Delete button on the left */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={updatingStatus}
              className="rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{language === "vi" ? "Xóa" : "Delete"}</span>
            </Button>

            {/* Edit and Quick Status Action Buttons on the right */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit({ ...plan, status: currentStatus });
                }}
                disabled={updatingStatus}
                className="rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>{language === "vi" ? "Sửa" : "Edit"}</span>
              </Button>

              {currentStatus !== 2 ? (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(2)}
                  disabled={updatingStatus}
                  className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {updatingStatus ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>{language === "vi" ? "Hoàn thành" : "Done"}</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(1)}
                  disabled={updatingStatus}
                  className="rounded-xl text-xs font-bold border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1.5 cursor-pointer"
                >
                  {updatingStatus ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                  <span>{language === "vi" ? "Làm lại" : "Reopen"}</span>
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
