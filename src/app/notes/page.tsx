"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteModal, NoteItem } from "@/components/note-modal";
import {
  NotebookPen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLanguage } from "@/components/language-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function NotesPage() {
  const { language } = useLanguage();
  const dateLocale = language === "vi" ? vi : enUS;

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  // Delete Confirmation State
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<NoteItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/notes${query}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Listen for open-note-modal event from Header button
  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedNote(null);
      setModalOpen(true);
    };

    window.addEventListener("open-note-modal", handleOpenModal);
    return () => {
      window.removeEventListener("open-note-modal", handleOpenModal);
    };
  }, []);

  const handleEdit = (note: NoteItem) => {
    setSelectedNote(note);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteNoteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/notes/${deleteNoteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchNotes();
        setDeleteNoteTarget(null);
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full px-4 py-4 lg:px-6 space-y-6">
      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={
              language === "vi"
                ? "Tìm kiếm tiêu đề hoặc nội dung ghi chú..."
                : "Search note title or content..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl border-0 bg-transparent text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium pr-3 hidden sm:block">
          {notes.length} {language === "vi" ? "ghi chú" : "notes"}
        </div>
      </div>

      {/* Notes List Grid: Desktop 2 per row (md:grid-cols-2), Mobile 1 per row (grid-cols-1) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-xs font-semibold">
            {language === "vi" ? "Đang tải ghi chú..." : "Loading notes..."}
          </p>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-500 flex items-center justify-center">
            <FileText className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {search
                ? language === "vi"
                  ? "Không tìm thấy ghi chú phù hợp"
                  : "No notes matched your search"
                : language === "vi"
                ? "Chưa có ghi chú nào"
                : "No notes created yet"}
            </h3>
            <p className="text-xs text-slate-400">
              {search
                ? language === "vi"
                  ? "Hãy thử tìm kiếm với từ khóa khác"
                  : "Try searching with a different keyword"
                : language === "vi"
                ? "Bấm vào nút 'Thêm ghi chú' ở góc trên để tạo ghi chú đầu tiên của bạn."
                : "Click 'Add Note' to create your very first note."}
            </p>
          </div>
          {!search && (
            <Button
              onClick={() => {
                setSelectedNote(null);
                setModalOpen(true);
              }}
              size="sm"
              className="mt-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {language === "vi" ? "Thêm ghi chú mới" : "Create note"}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {notes.map((note) => {
            const displayDate = note.updatedAt || note.createdAt;
            const formattedDate = format(
              new Date(displayDate),
              "HH:mm - dd/MM/yyyy",
              { locale: dateLocale }
            );

            return (
              <div
                key={note.id}
                className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-800/80"
              >
                <div className="space-y-3">
                  {/* Card Top: Title & Date */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                      {note.title}
                    </h3>

                    {/* Date Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[11px] font-semibold text-purple-700 dark:text-purple-300 shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Card Content Text */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-6 leading-relaxed bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                    {note.content}
                  </div>
                </div>

                {/* Card Action Buttons: Edit & Delete */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(note)}
                    className="h-8 px-3 rounded-xl text-xs font-bold text-slate-600 hover:text-purple-600 hover:bg-purple-50 dark:text-slate-400 dark:hover:text-purple-400 dark:hover:bg-slate-800 gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{language === "vi" ? "Sửa" : "Edit"}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteNoteTarget(note)}
                    className="h-8 px-3 rounded-xl text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40 gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{language === "vi" ? "Xóa" : "Delete"}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Form Modal */}
      <NoteModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        noteToEdit={selectedNote}
        onSuccess={fetchNotes}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteNoteTarget}
        onOpenChange={(open) => !open && setDeleteNoteTarget(null)}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === "vi" ? "Xác nhận xóa ghi chú" : "Confirm Note Deletion"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {language === "vi"
                ? `Bạn có chắc chắn muốn xóa ghi chú "${deleteNoteTarget?.title}"? Hành động này không thể hoàn tác.`
                : `Are you sure you want to delete "${deleteNoteTarget?.title}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteNoteTarget(null)}
              disabled={deleting}
              className="rounded-xl text-xs font-bold"
            >
              {language === "vi" ? "Hủy" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="rounded-xl text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {language === "vi" ? "Xóa ghi chú" : "Delete Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
