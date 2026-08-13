"use client";

import { useState } from "react";
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
}

export function CalendarPlanDetailModal({
  plan,
  open,
  onOpenChange,
  onEdit,
  onDeleted,
}: CalendarPlanDetailModalProps) {
  const { language } = useLanguage();
  const dateLocale = language === "vi" ? vi : enUS;

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!plan) return null;

  const statusCfg = PLAN_STATUS_CONFIG[plan.status] || PLAN_STATUS_CONFIG[0];
  const formattedDate = format(new Date(plan.date), "EEEE, 'ngày' dd 'tháng' MM, yyyy", {
    locale: dateLocale,
  });

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
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${statusCfg.badgeClass}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {language === "vi" ? statusCfg.labelVi : statusCfg.labelEn}
            </span>

            <div className="flex items-center gap-1 text-xs text-slate-400">
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
                className="h-8 text-xs font-bold rounded-xl"
              >
                {language === "vi" ? "Hủy" : "Cancel"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-rose-600 hover:bg-rose-700"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {language === "vi" ? "Đồng ý xóa" : "Confirm Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{language === "vi" ? "Xóa kế hoạch" : "Delete"}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(plan);
              }}
              className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-lg shadow-indigo-500/20"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>{language === "vi" ? "Sửa kế hoạch" : "Edit Plan"}</span>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
