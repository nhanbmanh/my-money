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
import { NotebookPen, Save, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteToEdit?: NoteItem | null;
  onSuccess: () => void;
}

export function NoteModal({
  open,
  onOpenChange,
  noteToEdit,
  onSuccess,
}: NoteModalProps) {
  const { language } = useLanguage();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (noteToEdit) {
        setTitle(noteToEdit.title);
        setContent(noteToEdit.content);
      } else {
        setTitle("");
        setContent("");
      }
      setError(null);
    }
  }, [open, noteToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(
        language === "vi"
          ? "Vui lòng nhập tiêu đề ghi chú"
          : "Please enter note title"
      );
      return;
    }
    if (!content.trim()) {
      setError(
        language === "vi"
          ? "Vui lòng nhập nội dung ghi chú"
          : "Please enter note content"
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = noteToEdit ? `/api/notes/${noteToEdit.id}` : "/api/notes";
      const method = noteToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Có lỗi xảy ra khi lưu ghi chú");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu ghi chú");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {noteToEdit
                  ? language === "vi"
                    ? "Chỉnh sửa Ghi chú"
                    : "Edit Note"
                  : language === "vi"
                  ? "Tạo Ghi chú mới"
                  : "Create New Note"}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "vi"
                  ? "Lưu trữ thông tin & ý tưởng quan trọng của bạn"
                  : "Save your important information & ideas"}
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

          <div className="space-y-1.5">
            <Label htmlFor="note-title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === "vi" ? "Tiêu đề ghi chú" : "Title"} <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="note-title"
              placeholder={
                language === "vi"
                  ? "Nhập tiêu đề ghi chú..."
                  : "Enter note title..."
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note-content" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === "vi" ? "Nội dung ghi chú" : "Content"} <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="note-content"
              rows={6}
              placeholder={
                language === "vi"
                  ? "Nhập chi tiết nội dung ghi chú..."
                  : "Enter detailed content..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 resize-y min-h-[120px]"
              disabled={loading}
            />
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
              className="rounded-xl text-xs font-bold h-9 bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>
                {noteToEdit
                  ? language === "vi"
                    ? "Cập nhật"
                    : "Update"
                  : language === "vi"
                  ? "Lưu ghi chú"
                  : "Save Note"}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
