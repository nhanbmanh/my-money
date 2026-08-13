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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, Calendar as CalendarIcon, Save, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { format } from "date-fns";

export interface CalendarPlanItem {
  id: string;
  title: string;
  content?: string | null;
  date: string;
  status: number; // 0: Todo, 1: In Progress, 2: Done, 3: Pending
  createdAt: string;
  updatedAt: string;
}

export const PLAN_STATUS_CONFIG: Record<
  number,
  { labelVi: string; labelEn: string; colorClass: string; badgeClass: string }
> = {
  0: {
    labelVi: "Cần làm (Todo)",
    labelEn: "Todo",
    colorClass: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
    badgeClass: "bg-sky-500 text-white",
  },
  1: {
    labelVi: "Đang làm (In Progress)",
    labelEn: "In Progress",
    colorClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    badgeClass: "bg-amber-500 text-white",
  },
  2: {
    labelVi: "Hoàn thành (Done)",
    labelEn: "Done",
    colorClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 line-through opacity-80",
    badgeClass: "bg-emerald-500 text-white",
  },
  3: {
    labelVi: "Tạm hoãn (Pending)",
    labelEn: "Pending",
    colorClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
    badgeClass: "bg-purple-500 text-white",
  },
};

interface CalendarPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planToEdit?: CalendarPlanItem | null;
  defaultDate?: Date | null;
  onSuccess: () => void;
}

export function CalendarPlanModal({
  open,
  onOpenChange,
  planToEdit,
  defaultDate,
  onSuccess,
}: CalendarPlanModalProps) {
  const { language } = useLanguage();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [status, setStatus] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (planToEdit) {
        setTitle(planToEdit.title);
        setContent(planToEdit.content || "");
        setSelectedDate(
          planToEdit.date ? new Date(planToEdit.date) : new Date()
        );
        setStatus(planToEdit.status ?? 0);
      } else {
        setTitle("");
        setContent("");
        setSelectedDate(defaultDate || new Date());
        setStatus(0);
      }
      setError(null);
    }
  }, [open, planToEdit, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(
        language === "vi"
          ? "Vui lòng nhập tiêu đề kế hoạch"
          : "Please enter plan title"
      );
      return;
    }
    if (!selectedDate) {
      setError(
        language === "vi" ? "Vui lòng chọn ngày thực hiện" : "Please select date"
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = planToEdit
        ? `/api/calendar-plans/${planToEdit.id}`
        : "/api/calendar-plans";
      const method = planToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          date: selectedDate.toISOString(),
          status: Number(status),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Có lỗi xảy ra khi lưu kế hoạch");
      }

      window.dispatchEvent(new CustomEvent("refresh-calendar-notifications"));
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu kế hoạch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {planToEdit
                  ? language === "vi"
                    ? "Chỉnh sửa Kế hoạch"
                    : "Edit Plan"
                  : language === "vi"
                  ? "Tạo Kế hoạch mới"
                  : "Create New Plan"}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "vi"
                  ? "Lập lịch trình công việc và sự kiện theo ngày"
                  : "Schedule work & events for specific dates"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          {error && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="plan-title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === "vi" ? "Tiêu đề kế hoạch" : "Title"}{" "}
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="plan-title"
              placeholder={
                language === "vi"
                  ? "Nhập tiêu đề kế hoạch..."
                  : "Enter plan title..."
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Content / Description */}
          <div className="space-y-1.5">
            <Label htmlFor="plan-content" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === "vi" ? "Mô tả nội dung" : "Description"}
            </Label>
            <Textarea
              id="plan-content"
              rows={4}
              placeholder={
                language === "vi"
                  ? "Nhập chi tiết công việc hoặc mô tả..."
                  : "Enter detailed plan description..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 resize-y min-h-[90px]"
              disabled={loading}
            />
          </div>

          {/* Grid 2 cols for Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Popover + Calendar DatePicker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === "vi" ? "Ngày thực hiện" : "Date"}{" "}
                <span className="text-rose-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loading}
                    className="w-full justify-start text-left font-semibold h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    {selectedDate
                      ? format(selectedDate, "dd/MM/yyyy")
                      : language === "vi"
                      ? "Chọn ngày"
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[250]"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Status Select */}
            <div className="space-y-1.5">
              <Label htmlFor="plan-status" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === "vi" ? "Trạng thái" : "Status"}
              </Label>
              <Select
                value={String(status)}
                onValueChange={(val) => setStatus(Number(val))}
                disabled={loading}
              >
                <SelectTrigger id="plan-status" className="h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-semibold">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
                  {Object.entries(PLAN_STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="text-xs font-medium cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.badgeClass}`} />
                        <span>{language === "vi" ? cfg.labelVi : cfg.labelEn}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl text-xs font-bold h-9 border-slate-200 dark:border-slate-800"
            >
              {language === "vi" ? "Hủy" : "Cancel"}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl text-xs font-bold h-9 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-lg shadow-indigo-500/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>
                {planToEdit
                  ? language === "vi"
                    ? "Cập nhật"
                    : "Update"
                  : language === "vi"
                  ? "Lưu kế hoạch"
                  : "Save Plan"}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
