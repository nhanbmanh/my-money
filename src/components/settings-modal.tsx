"use client";

import { useEffect, useState } from "react";
import { Settings, Plus, Pencil, Trash2, Wallet, FolderKanban, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getSecondaryCategoryBadgeClass } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Item = {
  id: string;
  name: string;
  isSystem: boolean;
  type?: number | null;
  inUse?: number;
};

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function SettingTabContent({
  title,
  items,
  loading,
  onAdd,
  onDelete,
  onEdit,
  showType = false,
}: {
  title: string;
  items: Item[];
  loading: boolean;
  onAdd: (name: string, type?: number) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onEdit?: (id: string, name: string, type?: number) => Promise<string | null>;
  showType?: boolean;
}) {
  const { t, language } = useLanguage();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("0");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [editingTarget, setEditingTarget] = useState<Item | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingType, setEditingType] = useState("0");
  const [editingError, setEditingError] = useState("");
  const [editing, setEditing] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setAddError("");
    const error = await onAdd(
      newName.trim(),
      showType ? Number(newType) : undefined,
    );
    setAdding(false);
    if (error) {
      setAddError(error);
      return;
    }
    setNewName("");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const error = await onDelete(deleteTarget.id);
    setDeleting(false);
    if (error) {
      setDeleteError(error);
      return;
    }
    setDeleteTarget(null);
  };

  const handleEdit = async () => {
    if (!editingTarget || !onEdit) return;
    if (!editingName.trim()) return;
    setEditing(true);
    setEditingError("");
    const error = await onEdit(
      editingTarget.id,
      editingName.trim(),
      showType ? Number(editingType) : undefined,
    );
    setEditing(false);
    if (error) {
      setEditingError(error);
      return;
    }
    setEditingTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Add Input Bar */}
      <div className="flex flex-col sm:flex-row gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <Input
          placeholder={language === "vi" ? `Nhập tên ${title.toLowerCase()} mới...` : `Enter new ${title.toLowerCase()} name...`}
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setAddError("");
          }}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), handleAdd())
          }
          className="bg-white dark:bg-slate-900 text-xs sm:text-sm rounded-xl h-10 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
        />
        {showType && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{language === "vi" ? "Loại:" : "Type:"}</span>
            <Input
              type="number"
              min="0"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-16 bg-white dark:bg-slate-900 text-xs rounded-xl h-10 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>
        )}
        <Button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="h-10 text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shrink-0 cursor-pointer"
        >
          {adding ? <Spinner /> : <Plus className="h-4 w-4" />}
          {t("common.add")}
        </Button>
      </div>
      {addError && <p className="text-xs text-rose-500 font-medium px-1">{addError}</p>}

      {/* Items List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-10">
          {language === "vi" ? "Chưa có danh mục nào" : "No items yet"}
        </p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {item.name}
                </span>
                {showType && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold border-2 ${getSecondaryCategoryBadgeClass(item.type)}`}
                  >
                    {language === "vi" ? `Loại ${item.type ?? 0}` : `Type ${item.type ?? 0}`}
                  </Badge>
                )}
                {item.isSystem && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-slate-400 border-slate-200"
                  >
                    {language === "vi" ? "Mặc định" : "Default"}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingError("");
                      setEditingTarget(item);
                      setEditingName(item.name);
                      setEditingType(String(item.type ?? 0));
                    }}
                    className="h-7 w-7 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={item.isSystem}
                  onClick={() => {
                    setDeleteError("");
                    setDeleteTarget(item);
                  }}
                  className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-30 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Item Dialog */}
      {onEdit && (
        <AlertDialog
          open={!!editingTarget}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTarget(null);
              setEditingError("");
            }
          }}
        >
          <AlertDialogContent className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                {language === "vi" ? `Cập nhật danh mục "${editingTarget?.name}"` : `Edit item "${editingTarget?.name}"`}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                {language === "vi" ? "Thay đổi tên hoặc phân loại nhóm cho danh mục này." : "Modify item name or classification group."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{language === "vi" ? "Tên danh mục" : "Item name"}</label>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="h-10 text-xs bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                />
              </div>
              {showType && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{language === "vi" ? "Phân loại (Type)" : "Classification Type"}</label>
                  <Input
                    type="number"
                    min="0"
                    value={editingType}
                    onChange={(e) => setEditingType(e.target.value)}
                    className="h-10 text-xs bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                  />
                </div>
              )}
            </div>
            {editingError && (
              <p className="text-xs text-rose-500 font-medium">{editingError}</p>
            )}
            <AlertDialogFooter className="pt-2">
              <AlertDialogCancel disabled={editing} className="h-9 text-xs rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700">
                {t("common.cancel")}
              </AlertDialogCancel>
              <Button
                type="button"
                onClick={handleEdit}
                disabled={editing}
                className="h-9 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl cursor-pointer"
              >
                {editing ? (
                  <>
                    <Spinner className="mr-2" />
                    {t("common.loading")}
                  </>
                ) : (
                  t("common.save")
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Confirm Delete Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
              {language === "vi" ? `Xóa danh mục "${deleteTarget?.name}"?` : `Delete item "${deleteTarget?.name}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {language === "vi" ? "Hành động này không thể hoàn tác. Các giao dịch đang gắn danh mục này sẽ bị gỡ liên kết." : "This action cannot be undone. Associated transactions will be unlinked."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-xs text-rose-500 font-medium">{deleteError}</p>
          )}
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={deleting} className="h-9 text-xs rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700">
              {t("common.cancel")}
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer"
            >
              {deleting ? (
                <>
                  <Spinner className="mr-2" />
                  {language === "vi" ? "Đang xóa..." : "Deleting..."}
                </>
              ) : (
                language === "vi" ? "Xóa vĩnh viễn" : "Delete permanently"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function SettingsModal({
  open,
  onOpenChange,
  onSuccess,
}: SettingsModalProps) {
  const { t, language } = useLanguage();
  const [sources, setSources] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Item[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, c, sc] = await Promise.all([
        fetch("/api/source").then((r) => r.text().then((t) => (t ? JSON.parse(t) : []))),
        fetch("/api/category").then((r) => r.text().then((t) => (t ? JSON.parse(t) : []))),
        fetch("/api/secondary-category").then((r) => r.text().then((t) => (t ? JSON.parse(t) : []))),
      ]);
      setSources(
        s.map((i: any) => ({
          id: i.id,
          name: i.sourceName,
          isSystem: !i.userId,
        })),
      );
      setCategories(
        c.map((i: any) => ({
          id: i.id,
          name: i.categoryName,
          isSystem: !i.userId,
        })),
      );
      setSecondaryCategories(
        sc.map((i: any) => ({
          id: i.id,
          name: i.categoryName,
          isSystem: !i.userId,
          type: i.type ?? 0,
        })),
      );
    } catch {
      setSources([]);
      setCategories([]);
      setSecondaryCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAll();
    }
  }, [open]);

  const makeAdder =
    (url: string, nameKey: string, refresh: () => void) =>
    async (name: string, type?: number): Promise<string | null> => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [nameKey]: name,
          ...(type !== undefined ? { type } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        return data.error || "Không thể tạo mới";
      }
      refresh();
      onSuccess?.();
      return null;
    };

  const makeEditor =
    (url: string, refresh: () => Promise<void>, nameKey: string) =>
    async (id: string, name: string, type?: number): Promise<string | null> => {
      const res = await fetch(`${url}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [nameKey]: name,
          ...(type !== undefined ? { type } : {}),
        }),
      });
      if (!res.ok) {
        try {
          const data = await res.json();
          return data?.error || "Lỗi cập nhật";
        } catch {
          return "Lỗi cập nhật";
        }
      }
      await refresh();
      onSuccess?.();
      return null;
    };

  const makeDeleter =
    (url: string, refresh: () => void) =>
    async (id: string): Promise<string | null> => {
      const res = await fetch(`${url}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        try {
          const data = await res.json();
          return data?.error || "Lỗi xóa";
        } catch {
          return "Lỗi xóa";
        }
      }
      refresh();
      onSuccess?.();
      return null;
    };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-3xl"
      >
        {/* Fixed Header */}
        <DialogHeader className="p-5 pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200/60 dark:border-sky-800/60 shrink-0">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                {t("settings.title")}
              </DialogTitle>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {t("settings.subtitle")}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <Tabs defaultValue="source">
            <TabsList className="grid grid-cols-3 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <TabsTrigger value="source" className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 cursor-pointer">
                <Wallet className="h-3.5 w-3.5" />
                {t("settings.tabSources")}
              </TabsTrigger>
              <TabsTrigger value="category" className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 cursor-pointer">
                <FolderKanban className="h-3.5 w-3.5" />
                {t("settings.tabPrimary")}
              </TabsTrigger>
              <TabsTrigger value="secondary" className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 cursor-pointer">
                <Tags className="h-3.5 w-3.5" />
                {t("settings.tabSecondary")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="source" className="mt-0">
              <SettingTabContent
                title={t("settings.tabSources")}
                items={sources}
                loading={loading}
                onAdd={makeAdder("/api/source", "sourceName", fetchAll)}
                onDelete={makeDeleter("/api/source", fetchAll)}
                onEdit={makeEditor("/api/source", fetchAll, "sourceName")}
              />
            </TabsContent>

            <TabsContent value="category" className="mt-0">
              <SettingTabContent
                title={t("settings.tabPrimary")}
                items={categories}
                loading={loading}
                onAdd={makeAdder("/api/category", "categoryName", fetchAll)}
                onDelete={makeDeleter("/api/category", fetchAll)}
                onEdit={makeEditor("/api/category", fetchAll, "categoryName")}
              />
            </TabsContent>

            <TabsContent value="secondary" className="mt-0">
              <SettingTabContent
                title={t("settings.tabSecondary")}
                items={secondaryCategories}
                loading={loading}
                onAdd={makeAdder(
                  "/api/secondary-category",
                  "categoryName",
                  fetchAll,
                )}
                onDelete={makeDeleter("/api/secondary-category", fetchAll)}
                onEdit={makeEditor(
                  "/api/secondary-category",
                  fetchAll,
                  "categoryName",
                )}
                showType
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 px-5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 flex justify-end z-10">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-6 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
