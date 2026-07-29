"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn, getSecondaryCategoryBadgeClass } from "@/lib/utils";

type Category = { id: string; categoryName: string; type?: number | null };
type Source = { id: string; sourceName: string; sourceType: string };

type CashFlowData = {
  id: string;
  title: string;
  description: string | null;
  datetime: string;
  cashType: "Income" | "Expense";
  amountOfMoney: number;
  sourceId: string | null;
  primaryCategoryId: string | null;
  secondaryCategories: {
    secondaryCategory: {
      id: string;
      categoryName: string;
      type?: number | null;
    };
  }[];
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editData?: CashFlowData | null;
}

export function CashFlowModal({
  open,
  onOpenChange,
  onSuccess,
  editData,
}: Props) {
  const isEdit = !!editData;

  const [form, setForm] = useState({
    title: "",
    description: "",
    cashType: "Expense",
    amountOfMoney: "",
    sourceId: "",
    primaryCategoryId: "",
  });

  const [datetime, setDatetime] = useState<Date>(new Date());
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState<string[]>(
    [],
  );

  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<Category[]>(
    [],
  );

  const [newSource, setNewSource] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSecondaryCategory, setNewSecondaryCategory] = useState("");
  const [newSecondaryCategoryType, setNewSecondaryCategoryType] = useState("0");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetchSources();
    fetchCategories();
    fetchSecondaryCategories();

    if (editData) {
      setForm({
        title: editData.title,
        description: editData.description || "",
        cashType: editData.cashType,
        amountOfMoney: String(editData.amountOfMoney),
        sourceId: editData.sourceId || "",
        primaryCategoryId: editData.primaryCategoryId || "",
      });
      setDatetime(new Date(editData.datetime));
      setSecondaryCategoryIds(
        editData.secondaryCategories.map((s) => s.secondaryCategory.id),
      );
    }
  }, [open, editData]);

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/source");
      const text = await res.text();
      setSources(text ? JSON.parse(text) : []);
    } catch {
      setSources([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/category");
      const text = await res.text();
      setCategories(text ? JSON.parse(text) : []);
    } catch {
      setCategories([]);
    }
  };

  const fetchSecondaryCategories = async () => {
    try {
      const res = await fetch("/api/secondary-category");
      const text = await res.text();
      setSecondaryCategories(text ? JSON.parse(text) : []);
    } catch {
      setSecondaryCategories([]);
    }
  };

  const handleAddSource = async () => {
    if (!newSource.trim()) return;
    const res = await fetch("/api/source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceName: newSource.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setSources((prev) => [...prev, data]);
      setForm((prev) => ({ ...prev, sourceId: data.id }));
      setNewSource("");
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const res = await fetch("/api/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryName: newCategory.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories((prev) => [...prev, data]);
      setForm((prev) => ({ ...prev, primaryCategoryId: data.id }));
      setNewCategory("");
    }
  };

  const handleAddSecondaryCategory = async () => {
    if (!newSecondaryCategory.trim()) return;
    const res = await fetch("/api/secondary-category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryName: newSecondaryCategory.trim(),
        type: Number(newSecondaryCategoryType),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setSecondaryCategories((prev) => [...prev, data]);
      setSecondaryCategoryIds((prev) => [...prev, data.id]);
      setNewSecondaryCategory("");
      setNewSecondaryCategoryType("0");
    }
  };

  const toggleSecondaryCategory = (id: string) => {
    setSecondaryCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      ...form,
      amountOfMoney: parseFloat(form.amountOfMoney),
      datetime: datetime.toISOString(),
      secondaryCategoryIds,
      sourceId: form.sourceId || undefined,
      primaryCategoryId: form.primaryCategoryId || undefined,
    };

    const res = isEdit
      ? await fetch(`/api/cashflow/${editData!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/cashflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [payload] }),
        });

    let data: { error?: string } = {};
    try {
      data = await res.json();
    } catch {
      data = { error: "Máy chủ trả về phản hồi không hợp lệ" };
    }
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Đã xảy ra lỗi khi lưu giao dịch");
      return;
    }

    // Reset form
    setForm({
      title: "",
      description: "",
      cashType: "Expense",
      amountOfMoney: "",
      sourceId: "",
      primaryCategoryId: "",
    });
    setDatetime(new Date());
    setSecondaryCategoryIds([]);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-sky-50 ring-1 ring-gray-400">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isEdit ? "Sửa giao dịch" : "Khai giao dịch mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Tên giao dịch <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VD: Ăn trưa, Tiền lương..."
              required
            />
          </div>

          {/* CashType + Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Loại giao dịch <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.cashType}
                onValueChange={(value) => setForm({ ...form, cashType: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Expense">💸 Chi tiêu</SelectItem>
                  <SelectItem value="Income">💰 Thu nhập</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full">
              <Label htmlFor="amount">
                Số tiền (VND) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min={0}
                value={form.amountOfMoney}
                onChange={(e) =>
                  setForm({ ...form, amountOfMoney: e.target.value })
                }
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Datetime */}
          <div className="space-y-2">
            <Label>Thời gian giao dịch</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(datetime, "HH:mm - dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={datetime}
                  onSelect={(date) => date && setDatetime(date)}
                />
                <div className="p-3 border-t">
                  <Label className="text-xs text-muted-foreground">Giờ</Label>
                  <Input
                    type="time"
                    className="mt-1"
                    value={format(datetime, "HH:mm")}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":");
                      const d = new Date(datetime);
                      d.setHours(Number(h), Number(m));
                      setDatetime(d);
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label>Nguồn tiền</Label>
            <Select
              value={form.sourceId}
              onValueChange={(value) => setForm({ ...form, sourceId: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sourceName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Thêm nguồn tiền mới..."
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAddSource())
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddSource}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Primary Category */}
          <div className="space-y-2">
            <Label>Nhãn phân loại chính</Label>
            <Select
              value={form.primaryCategoryId}
              onValueChange={(value) =>
                setForm({ ...form, primaryCategoryId: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Thêm nhãn chính mới..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAddCategory())
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddCategory}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Secondary Categories */}
          <div className="space-y-2">
            <Label>Nhãn phân loại phụ</Label>
            <div className="flex flex-wrap gap-2 min-h-8">
              {[...secondaryCategories]
                .sort((a, b) => (a.type ?? 0) - (b.type ?? 0))
                .map((c) => {
                  const isSelected = secondaryCategoryIds.includes(c.id);

                  return (
                    <Badge
                      key={c.id}
                      variant="outline"
                      className={cn(
                        "cursor-pointer border-2 transition-all",
                        getSecondaryCategoryBadgeClass(c.type),
                        isSelected &&
                          "shadow-md scale-[1.03] border-slate-900 bg-slate-900 text-white",
                      )}
                      onClick={() => toggleSecondaryCategory(c.id)}
                    >
                      {c.categoryName}
                      {typeof c.type === "number" && (
                        <span className="ml-1 opacity-80">[{c.type}]</span>
                      )}
                    </Badge>
                  );
                })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Thêm nhãn phụ mới..."
                value={newSecondaryCategory}
                onChange={(e) => setNewSecondaryCategory(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(), handleAddSecondaryCategory())
                }
              />
              <Input
                type="number"
                min="0"
                value={newSecondaryCategoryType}
                onChange={(e) => setNewSecondaryCategoryType(e.target.value)}
                className="w-24"
                placeholder="Loại"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddSecondaryCategory}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả ngắn</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Ghi chú thêm..."
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="mr-2" />
                  Đang lưu...
                </>
              ) : isEdit ? (
                "Cập nhật"
              ) : (
                "Lưu"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
