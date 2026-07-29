"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getSecondaryCategoryBadgeClass } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function SettingTab({
  title,
  items,
  loading,
  onAdd,
  onDelete,
  showType = false,
  onEdit,
}: {
  title: string;
  items: Item[];
  loading: boolean;
  onAdd: (name: string, type?: number) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onEdit?: (id: string, name: string, type?: number) => Promise<string | null>;
  showType?: boolean;
}) {
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
      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder={`Thêm ${title.toLowerCase()} mới...`}
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setAddError("");
          }}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), handleAdd())
          }
          className="bg-white"
        />
        {showType && (
          <Input
            type="number"
            min="0"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="w-24 bg-white"
            placeholder="Loại"
          />
        )}
        <Button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="gap-2"
        >
          {adding ? <Spinner /> : <Plus className="h-4 w-4" />}
          Thêm
        </Button>
      </div>
      {addError && <p className="text-sm text-red-500">{addError}</p>}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Chưa có dữ liệu
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-white ring-1 ring-gray-200"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.name}</span>
                {showType && (
                  <Badge
                    variant="outline"
                    className={`text-xs border-2 ${getSecondaryCategoryBadgeClass(item.type)}`}
                  >
                    Loại {item.type ?? 0}
                  </Badge>
                )}
                {item.isSystem && (
                  <Badge
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    Mặc định
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
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
                    className="h-8 w-8 text-muted-foreground hover:text-sky-600"
                  >
                    <Pencil className="h-4 w-4" />
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
                  className="h-8 w-8 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit item */}
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Cập nhật cho "{editingTarget?.name}"?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có thể đổi tên và loại cho mục này.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 px-1">
              <div>
                <label className="text-sm text-muted-foreground">Tên</label>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="mt-2 bg-white"
                />
              </div>
              {showType && (
                <div>
                  <label className="text-sm text-muted-foreground">Loại</label>
                  <Input
                    type="number"
                    min="0"
                    value={editingType}
                    onChange={(e) => setEditingType(e.target.value)}
                    className="mt-2 bg-white"
                  />
                </div>
              )}
            </div>
            {editingError && (
              <p className="text-sm text-red-500 px-1">{editingError}</p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={editing}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEdit}
                disabled={editing}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {editing ? (
                  <>
                    <Spinner className="mr-2" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Confirm delete */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Các giao dịch đang dùng sẽ bị
              xóa liên kết tương ứng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-red-500 px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? (
                <>
                  <Spinner className="mr-2" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SettingsPage() {
  const [sources, setSources] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Item[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, c, sc] = await Promise.all([
        fetch("/api/source").then((r) => r.json()),
        fetch("/api/category").then((r) => r.json()),
        fetch("/api/secondary-category").then((r) => r.json()),
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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
        return data.error;
      }
      refresh();
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
          return data?.error || "Server error";
        } catch (e) {
          const text = await res.text();
          return text || "Server error";
        }
      }
      await refresh();
      return null;
    };

  const makeDeleter =
    (url: string, refresh: () => void) =>
    async (id: string): Promise<string | null> => {
      const res = await fetch(`${url}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        try {
          const data = await res.json();
          return data?.error || "Server error";
        } catch (e) {
          const text = await res.text();
          return text || "Server error";
        }
      }
      refresh();
      return null;
    };

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-sky-50 border-b border-gray-200 shadow-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Quay lại
            </a>
            <h1 className="text-xl font-bold text-sky-700">Cài đặt</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Tabs defaultValue="source">
          <TabsList className="mb-6">
            <TabsTrigger value="source">Nguồn tiền</TabsTrigger>
            <TabsTrigger value="category">Nhãn chính</TabsTrigger>
            <TabsTrigger value="secondary">Nhãn phụ</TabsTrigger>
          </TabsList>

          <TabsContent value="source">
            <SettingTab
              title="Nguồn tiền"
              items={sources}
              loading={loading}
              onAdd={makeAdder("/api/source", "sourceName", fetchAll)}
              onDelete={makeDeleter("/api/source", fetchAll)}
              onEdit={makeEditor("/api/source", fetchAll, "sourceName")}
            />
          </TabsContent>

          <TabsContent value="category">
            <SettingTab
              title="Nhãn chính"
              items={categories}
              loading={loading}
              onAdd={makeAdder("/api/category", "categoryName", fetchAll)}
              onDelete={makeDeleter("/api/category", fetchAll)}
              onEdit={makeEditor("/api/category", fetchAll, "categoryName")}
            />
          </TabsContent>

          <TabsContent value="secondary">
            <SettingTab
              title="Nhãn phụ"
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
      </main>
    </div>
  );
}
