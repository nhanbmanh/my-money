"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Search,
  Trash2,
  Edit,
  Sparkles,
  RefreshCw,
  Plus,
  Bookmark,
  Receipt,
  Wallet,
  FolderKanban,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getSecondaryCategoryBadgeClass } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";

export type CashFlowTemplateItem = {
  id: string;
  templateName: string;
  title: string;
  description: string | null;
  cashType: "Income" | "Expense";
  amountOfMoney: number;
  source: { id: string; sourceName: string } | null;
  primaryCategory: { id: string; categoryName: string } | null;
  secondaryCategories: {
    secondaryCategory: { id: string; categoryName: string; type?: number | null };
  }[];
  sourceId: string | null;
  primaryCategoryId: string | null;
};

interface CashFlowTemplateTableProps {
  onUseTemplate?: (template: CashFlowTemplateItem) => void;
  refreshKey?: number;
}

export function CashFlowTemplateTable({
  onUseTemplate,
  refreshKey = 0,
}: CashFlowTemplateTableProps) {
  const { t, language } = useLanguage();
  const [templates, setTemplates] = useState<CashFlowTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Edit template dialog state
  const [editingTemplate, setEditingTemplate] = useState<CashFlowTemplateItem | null>(null);
  const [editForm, setEditForm] = useState({
    templateName: "",
    title: "",
    description: "",
    cashType: "Expense" as "Income" | "Expense",
    amountOfMoney: "",
    sourceId: "",
    primaryCategoryId: "",
  });
  const [editSecondaryIds, setEditSecondaryIds] = useState<string[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Option lists for edit dialog
  const [sources, setSources] = useState<{ id: string; sourceName: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; categoryName: string }[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<
    { id: string; categoryName: string; type?: number | null }[]
  >([]);

  // Delete dialog state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cashflow-template");
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      const [resS, resC, resSC] = await Promise.all([
        fetch("/api/source"),
        fetch("/api/category"),
        fetch("/api/secondary-category"),
      ]);
      if (resS.ok) setSources(await resS.json());
      if (resC.ok) setCategories(await resC.json());
      if (resSC.ok) setSecondaryCategories(await resSC.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchMetadata();
  }, [fetchTemplates, fetchMetadata, refreshKey]);

  useEffect(() => {
    const handleRefresh = () => fetchTemplates();
    window.addEventListener("refresh-templates", handleRefresh);
    return () => window.removeEventListener("refresh-templates", handleRefresh);
  }, [fetchTemplates]);

  const handleApplyTemplate = (tpl: CashFlowTemplateItem) => {
    if (onUseTemplate) {
      onUseTemplate(tpl);
    } else {
      window.dispatchEvent(
        new CustomEvent("open-cashflow-modal-template", {
          detail: { template: tpl },
        })
      );
    }
  };

  const handleOpenEdit = (tpl: CashFlowTemplateItem) => {
    setEditingTemplate(tpl);
    setEditForm({
      templateName: tpl.templateName,
      title: tpl.title,
      description: tpl.description || "",
      cashType: tpl.cashType,
      amountOfMoney: String(tpl.amountOfMoney || ""),
      sourceId: tpl.sourceId || "",
      primaryCategoryId: tpl.primaryCategoryId || "",
    });
    setEditSecondaryIds(
      tpl.secondaryCategories.map((s) => s.secondaryCategory.id)
    );
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setSaveLoading(true);
    setEditError("");

    try {
      const res = await fetch(`/api/cashflow-template/${editingTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: editForm.templateName,
          title: editForm.title,
          description: editForm.description || null,
          cashType: editForm.cashType,
          amountOfMoney: Number(editForm.amountOfMoney) || 0,
          sourceId: editForm.sourceId || null,
          primaryCategoryId: editForm.primaryCategoryId || null,
          secondaryCategoryIds: editSecondaryIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Không thể cập nhật mẫu");
        setSaveLoading(false);
        return;
      }

      setEditingTemplate(null);
      fetchTemplates();
    } catch {
      setEditError("Lỗi hệ thống khi cập nhật mẫu");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/cashflow-template/${deleteTargetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== deleteTargetId));
      }
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
      setDeleteTargetId(null);
    }
  };

  const filteredTemplates = templates.filter((tpl) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      tpl.templateName.toLowerCase().includes(q) ||
      tpl.title.toLowerCase().includes(q) ||
      (tpl.primaryCategory?.categoryName || "").toLowerCase().includes(q) ||
      (tpl.source?.sourceName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Bookmark className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              {language === "vi" ? "Mẫu Khai Báo Giao Dịch" : "Transaction Templates"}
              <Badge variant="secondary" className="text-[10px] font-extrabold rounded-full px-2">
                {templates.length}
              </Badge>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              {language === "vi"
                ? "Danh sách các mẫu có sẵn để tạo giao dịch nhanh chóng"
                : "Saved templates for quick transaction entry"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === "vi" ? "Tìm kiếm mẫu..." : "Search templates..."}
              className="h-8 pl-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTemplates()}
            disabled={loading}
            className="h-8 px-2.5 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>

          <Button
            size="sm"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-cashflow-modal"));
            }}
            className="h-8 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold gap-1 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            {language === "vi" ? "Tạo Mới" : "New"}
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto min-h-0">
        <Table>
          <TableHeader className="bg-slate-50/80 dark:bg-slate-800/50 sticky top-0 z-10">
            <TableRow className="border-b border-slate-100 dark:border-slate-800">
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "vi" ? "Tên Mẫu" : "Template Name"}
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "vi" ? "Loại" : "Type"}
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "vi" ? "Tên Giao Dịch Mẫu" : "Default Title"}
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">
                {language === "vi" ? "Số Tiền Mẫu" : "Default Amount"}
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "vi" ? "Nguồn Tiền" : "Source"}
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "vi" ? "Nhãn Chính" : "Category"}
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {language === "vi" ? "Nhãn Phụ" : "Tags"}
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center w-36">
                {language === "vi" ? "Thao Tác" : "Actions"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28 rounded-lg" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 rounded-lg" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32 rounded-lg" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto rounded-lg" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 rounded-lg" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 rounded-lg" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28 rounded-lg" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 mx-auto rounded-lg" /></TableCell>
                </TableRow>
              ))
            ) : filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                    <Bookmark className="h-8 w-8 text-slate-300 dark:text-slate-700 stroke-[1.5]" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {search.trim()
                        ? (language === "vi" ? "Không tìm thấy mẫu phù hợp" : "No matching templates found")
                        : (language === "vi" ? "Chưa có mẫu khai báo nào" : "No saved templates yet")}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      {language === "vi"
                        ? 'Khi nhập form ở modal "Khai Báo Giao Dịch", bấm nút "Lưu Mẫu" để lưu lại cho các lần sau.'
                        : 'Fill in the transaction form and click "Save Template" to quickly reuse it later.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((tpl) => (
                <TableRow
                  key={tpl.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60"
                >
                  <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{tpl.templateName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "text-[10px] font-extrabold rounded-lg px-2 py-0.5 border-0",
                        tpl.cashType === "Income"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {tpl.cashType === "Income"
                        ? (language === "vi" ? "Thu nhập" : "Income")
                        : (language === "vi" ? "Chi tiêu" : "Expense")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {tpl.title || <span className="text-slate-400 italic">({language === "vi" ? "Chưa nhập" : "None"})</span>}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-right font-mono">
                    <span
                      className={
                        tpl.cashType === "Income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {tpl.amountOfMoney > 0
                        ? `${tpl.amountOfMoney.toLocaleString("vi-VN")} ₫`
                        : "0 ₫"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {tpl.source?.sourceName || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {tpl.primaryCategory?.categoryName || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {tpl.secondaryCategories.length > 0 ? (
                        tpl.secondaryCategories.map((s, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded-md font-medium",
                              getSecondaryCategoryBadgeClass(s.secondaryCategory?.type)
                            )}
                          >
                            {s.secondaryCategory?.categoryName}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="h-7 px-2 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg cursor-pointer"
                        title={language === "vi" ? "Sử dụng mẫu để khai báo" : "Use template to fill modal"}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {language === "vi" ? "Dùng Mẫu" : "Use"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(tpl)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTargetId(tpl.id)}
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(val) => !val && setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Edit className="h-4 w-4 text-sky-500" />
              {language === "vi" ? "Chỉnh Sửa Mẫu Khai Báo" : "Edit Template"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{language === "vi" ? "Tên Mẫu *" : "Template Name *"}</Label>
              <Input
                value={editForm.templateName}
                onChange={(e) => setEditForm({ ...editForm, templateName: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{language === "vi" ? "Loại Giao Dịch" : "Cash Type"}</Label>
                <Select
                  value={editForm.cashType}
                  onValueChange={(val: "Income" | "Expense") =>
                    setEditForm({ ...editForm, cashType: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Expense">💸 {t("financial.expense")}</SelectItem>
                    <SelectItem value="Income">💰 {t("financial.income")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{language === "vi" ? "Số Tiền Mẫu" : "Amount"}</Label>
                <Input
                  type="number"
                  value={editForm.amountOfMoney}
                  onChange={(e) => setEditForm({ ...editForm, amountOfMoney: e.target.value })}
                  placeholder="0"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{language === "vi" ? "Tên Giao Dịch Mẫu" : "Default Title"}</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t("financial.source")}</Label>
                <Select
                  value={editForm.sourceId}
                  onValueChange={(val) => setEditForm({ ...editForm, sourceId: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Chọn nguồn..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.sourceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t("financial.primaryCategory")}</Label>
                <Select
                  value={editForm.primaryCategoryId}
                  onValueChange={(val) => setEditForm({ ...editForm, primaryCategoryId: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Chọn nhãn chính..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{language === "vi" ? "Mô tả mẫu" : "Description"}</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {editError && <p className="text-xs text-rose-500 font-medium">{editError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingTemplate(null)}
                className="h-8 text-xs rounded-xl"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveLoading}
                className="h-8 text-xs font-bold rounded-xl bg-sky-600 text-white"
              >
                {saveLoading ? <Spinner className="mr-1 h-3 w-3" /> : t("common.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(val) => !val && setDeleteTargetId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {language === "vi" ? "Xác nhận xóa mẫu khai báo?" : "Delete Template?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {language === "vi"
                ? "Hành động này sẽ xóa mẫu giao dịch đã lưu. Bạn không thể hoàn tác."
                : "This will delete the saved template. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="h-8 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleteLoading ? <Spinner className="mr-1 h-3 w-3" /> : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
