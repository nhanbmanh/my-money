"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DailyQuestModal, DailyQuestData, DailyQuestItemData } from "@/components/daily-quest-modal";
import {
  CheckSquare,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  CircleCheck,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function DailyQuestsPage() {
  const { language } = useLanguage();

  const [quests, setQuests] = useState<DailyQuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<DailyQuestData | null>(null);

  // Delete Confirmation State
  const [deleteQuestTarget, setDeleteQuestTarget] = useState<DailyQuestData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick Add Item per Quest state
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [addingItemQuestId, setAddingItemQuestId] = useState<string | null>(null);

  const fetchQuests = useCallback(async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/daily-quests${query}`);
      if (res.ok) {
        const data = await res.json();
        setQuests(data);
      }
    } catch (err) {
      console.error("Failed to fetch daily quests:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  // Listen for open-daily-quest-modal event from header
  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedQuest(null);
      setModalOpen(true);
    };

    window.addEventListener("open-daily-quest-modal", handleOpenModal);
    return () => {
      window.removeEventListener("open-daily-quest-modal", handleOpenModal);
    };
  }, []);

  const handleEdit = (quest: DailyQuestData) => {
    setSelectedQuest(quest);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteQuestTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/daily-quests/${deleteQuestTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchQuests();
        setDeleteQuestTarget(null);
      }
    } catch (err) {
      console.error("Failed to delete daily quest:", err);
    } finally {
      setDeleting(false);
    }
  };

  // Toggle checklist item check/uncheck
  const handleToggleItem = async (questId: string, item: DailyQuestItemData) => {
    const nextIsDone = !item.isDone;

    // Optimistic UI update
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId) return q;
        return {
          ...q,
          items: q.items.map((i) =>
            i.id === item.id ? { ...i, isDone: nextIsDone } : i
          ),
        };
      })
    );

    try {
      const res = await fetch(`/api/daily-quests/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: nextIsDone }),
      });
      if (!res.ok) {
        // Revert on failure
        fetchQuests();
      }
    } catch (err) {
      console.error("Failed to toggle item:", err);
      fetchQuests();
    }
  };

  // Add new item to a quest
  const handleAddItem = async (questId: string) => {
    const itemTitle = (newItemInputs[questId] || "").trim();
    if (!itemTitle) return;

    try {
      setAddingItemQuestId(questId);
      const res = await fetch(`/api/daily-quests/${questId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: itemTitle }),
      });

      if (res.ok) {
        setNewItemInputs((prev) => ({ ...prev, [questId]: "" }));
        fetchQuests();
      }
    } catch (err) {
      console.error("Failed to add checklist item:", err);
    } finally {
      setAddingItemQuestId(null);
    }
  };

  // Delete an item from a quest
  const handleDeleteItem = async (itemId: string) => {
    // Optimistic UI delete
    setQuests((prev) =>
      prev.map((q) => ({
        ...q,
        items: q.items.filter((i) => i.id !== itemId),
      }))
    );

    try {
      await fetch(`/api/daily-quests/items/${itemId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete checklist item:", err);
      fetchQuests();
    }
  };

  // Calculate Overall Progress Stats
  const { totalItems, totalCompletedItems, completionPercent } = useMemo(() => {
    let total = 0;
    let completed = 0;

    quests.forEach((q) => {
      total += q.items.length;
      completed += q.items.filter((i) => i.isDone).length;
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalItems: total, totalCompletedItems: completed, completionPercent: percent };
  }, [quests]);

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Overview Progress Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Banner Card 1: Total Progress */}
        <div className="md:col-span-2 bg-gradient-to-r from-teal-900/90 via-slate-900 to-slate-900 border border-teal-800/40 text-slate-100 rounded-3xl p-5 shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>{language === "vi" ? "Tiến Độ Hoàn Thành Hôm Nay" : "Today's Completion Progress"}</span>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {completionPercent}% {language === "vi" ? "Đã xong" : "Done"}
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-black text-white">
                {totalCompletedItems} / {totalItems} <span className="text-xs font-semibold text-slate-400">items checklist</span>
              </span>
            </div>
            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Banner Card 2: Auto-Reset Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <RotateCcw className="h-4 w-4 text-teal-500" />
            <span>{language === "vi" ? "Tự Động Reset 00:00 VNT" : "Auto Reset 00:00 VNT"}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed my-2">
            {language === "vi"
              ? "Mỗi ngày mới (00:00 VNT), các checklist sẽ tự động uncheck để bạn bắt đầu chu trình theo dõi mới."
              : "Every new day at 00:00 VNT, all checklist items automatically uncheck for your new routine."}
          </p>
          <div className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-xl w-fit">
            ⏰ 00:00:00 GMT+7
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder={
            language === "vi"
              ? "Tìm kiếm tên nhiệm vụ hoặc công việc checklist..."
              : "Search quest title or checklist item..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-xs shadow-xs"
        />
      </div>

      {/* Quests Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <span className="text-xs font-semibold text-slate-500">
            {language === "vi" ? "Đang tải danh sách nhiệm vụ..." : "Loading daily quests..."}
          </span>
        </div>
      ) : quests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/50 text-teal-500 flex items-center justify-center">
            <CheckSquare className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {search
                ? language === "vi"
                  ? "Không tìm thấy nhiệm vụ phù hợp"
                  : "No matching quests found"
                : language === "vi"
                ? "Chưa có nhiệm vụ hàng ngày nào"
                : "No daily quests yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {language === "vi"
                ? "Tạo nhiệm vụ lặp lại hàng ngày (e.g. Tập thể dục, Học từ vựng) với danh sách checklist để theo dõi tiến độ mỗi ngày!"
                : "Create recurring daily quests with checklists to track your routine every day!"}
            </p>
          </div>
          {!search && (
            <Button
              onClick={() => {
                setSelectedQuest(null);
                setModalOpen(true);
              }}
              className="rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{language === "vi" ? "Tạo nhiệm vụ đầu tiên" : "Create First Quest"}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[1920px]:grid-cols-2 gap-5 w-full">
          {quests.map((quest) => {
            const itemCount = quest.items.length;
            const completedCount = quest.items.filter((i) => i.isDone).length;
            const isAllDone = itemCount > 0 && completedCount === itemCount;
            const questPercent = itemCount > 0 ? Math.round((completedCount / itemCount) * 100) : 0;

            return (
              <div
                key={quest.id}
                className={cn(
                  "group relative flex flex-col justify-between bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1",
                  isAllDone
                    ? "border-emerald-300 dark:border-emerald-800/80 bg-emerald-500/5"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-800/80"
                )}
              >
                <div className="space-y-4">
                  {/* Card Top: Title, Progress & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 flex items-center gap-1.5">
                        <span>{quest.title}</span>
                        {isAllDone && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 inline" />
                        )}
                      </h3>

                      {/* Progress Stats Badge */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 text-[11px] font-bold rounded-lg",
                            isAllDone
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {completedCount}/{itemCount} {language === "vi" ? "hoàn thành" : "done"}
                        </span>
                        {itemCount > 0 && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({questPercent}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons: Edit & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(quest)}
                        title="Chỉnh sửa nhiệm vụ"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteQuestTarget(quest)}
                        title="Xóa nhiệm vụ"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quest Progress Bar */}
                  {itemCount > 0 && (
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isAllDone ? "bg-emerald-500" : "bg-teal-500"
                        )}
                        style={{ width: `${questPercent}%` }}
                      />
                    </div>
                  )}

                  {/* Checklist Items List */}
                  <div className="space-y-1.5 pt-1">
                    {quest.items.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        {language === "vi" ? "Chưa có checklist item nào" : "No checklist items yet"}
                      </p>
                    ) : (
                      quest.items.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "group/item flex items-center justify-between gap-2.5 p-2 rounded-xl border transition-all duration-200",
                            item.isDone
                              ? "bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-950/50 text-slate-400 dark:text-slate-500"
                              : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Checkbox
                              checked={item.isDone}
                              onCheckedChange={() => handleToggleItem(quest.id, item)}
                              className={cn(
                                "h-4 w-4 rounded-md border-slate-300 dark:border-slate-700 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 transition-colors cursor-pointer"
                              )}
                            />
                            <span
                              onClick={() => handleToggleItem(quest.id, item)}
                              className={cn(
                                "text-xs font-medium cursor-pointer truncate transition-all",
                                item.isDone && "line-through text-slate-400 dark:text-slate-500"
                              )}
                            >
                              {item.title}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            title="Xóa item này"
                            className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Inline Quick Add Item */}
                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={
                        language === "vi"
                          ? "+ Thêm checklist item..."
                          : "+ Add checklist item..."
                      }
                      value={newItemInputs[quest.id] || ""}
                      onChange={(e) =>
                        setNewItemInputs((prev) => ({
                          ...prev,
                          [quest.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddItem(quest.id);
                        }
                      }}
                      className="h-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddItem(quest.id)}
                      disabled={addingItemQuestId === quest.id || !(newItemInputs[quest.id] || "").trim()}
                      className="h-8 px-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                    >
                      {addingItemQuestId === quest.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Quest Modal */}
      <DailyQuestModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        questToEdit={selectedQuest}
        onSuccess={fetchQuests}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteQuestTarget}
        onOpenChange={(open) => !open && setDeleteQuestTarget(null)}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === "vi" ? "Xác nhận xóa nhiệm vụ" : "Confirm Quest Deletion"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {language === "vi"
                ? `Bạn có chắc chắn muốn xóa nhiệm vụ "${deleteQuestTarget?.title}" cùng tất cả checklist items bên trong? Hành động này không thể hoàn tác.`
                : `Are you sure you want to delete quest "${deleteQuestTarget?.title}" and all its checklist items? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteQuestTarget(null)}
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
              {language === "vi" ? "Xóa nhiệm vụ" : "Delete Quest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
