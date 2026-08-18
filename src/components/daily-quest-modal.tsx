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
import { Label } from "@/components/ui/label";
import { CheckSquare, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export interface DailyQuestItemData {
  id: string;
  title: string;
  isDone: boolean;
  lastCheckedAt?: string | null;
}

export interface DailyQuestData {
  id: string;
  title: string;
  items: DailyQuestItemData[];
  createdAt: string;
  updatedAt: string;
}

interface DailyQuestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questToEdit?: DailyQuestData | null;
  onSuccess: () => void;
}

export function DailyQuestModal({
  open,
  onOpenChange,
  questToEdit,
  onSuccess,
}: DailyQuestModalProps) {
  const { language } = useLanguage();
  const [title, setTitle] = useState("");
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newItemInput, setNewItemInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (questToEdit) {
        setTitle(questToEdit.title);
        setChecklistItems(questToEdit.items.map((i) => i.title));
      } else {
        setTitle("");
        setChecklistItems([]);
      }
      setNewItemInput("");
      setError(null);
    }
  }, [open, questToEdit]);

  const handleAddChecklistItem = () => {
    if (newItemInput.trim()) {
      setChecklistItems([...checklistItems, newItemInput.trim()]);
      setNewItemInput("");
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(
        language === "vi"
          ? "Vui lòng nhập tên nhiệm vụ"
          : "Please enter quest title"
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = questToEdit
        ? `/api/daily-quests/${questToEdit.id}`
        : "/api/daily-quests";
      const method = questToEdit ? "PUT" : "POST";

      const bodyData = questToEdit
        ? { title: title.trim() }
        : { title: title.trim(), items: checklistItems };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Có lỗi xảy ra khi lưu nhiệm vụ");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu nhiệm vụ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {questToEdit
                  ? language === "vi"
                    ? "Chỉnh sửa Nhiệm vụ Hàng ngày"
                    : "Edit Daily Quest"
                  : language === "vi"
                  ? "Tạo Nhiệm vụ Hàng ngày Mới"
                  : "Create New Daily Quest"}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "vi"
                  ? "Thiết lập nhiệm vụ lặp lại & danh sách checklist nhỏ bên trong"
                  : "Setup recurring quest & checklist items inside"}
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

          {/* Quest Title */}
          <div className="space-y-1.5">
            <Label htmlFor="quest-title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === "vi" ? "Tên nhiệm vụ hàng ngày" : "Quest Title"} <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="quest-title"
              placeholder={
                language === "vi"
                  ? "Ví dụ: Tập thể dục buổi sáng, Học Tiếng Anh..."
                  : "e.g. Morning Workout, Learn English..."
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-semibold"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Initial Checklist Items (Only for creation) */}
          {!questToEdit && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{language === "vi" ? "Danh sách checklist ban đầu" : "Checklist Items"}</span>
                <span className="text-[11px] font-normal text-slate-500">({checklistItems.length} items)</span>
              </Label>

              {/* Add item input */}
              <div className="flex gap-2">
                <Input
                  placeholder={
                    language === "vi"
                      ? "Nhập việc nhỏ cần làm (e.g. Uống 500ml nước, Khởi động 5 phút...)"
                      : "Add checklist item..."
                  }
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddChecklistItem}
                  className="h-9 px-3 rounded-xl text-xs font-bold shrink-0 gap-1 border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                >
                  <Plus className="h-4 w-4" />
                  <span>{language === "vi" ? "Thêm" : "Add"}</span>
                </Button>
              </div>

              {/* List of items */}
              {checklistItems.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  {checklistItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <span className="truncate">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
              className="rounded-xl text-xs font-bold h-9 bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shadow-lg shadow-teal-500/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>
                {questToEdit
                  ? language === "vi"
                    ? "Cập nhật"
                    : "Update"
                  : language === "vi"
                  ? "Lưu nhiệm vụ"
                  : "Save Quest"}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
