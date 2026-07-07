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
import { cn } from "@/lib/utils";

type Category = { id: string; categoryName: string };
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
    secondaryCategory: { id: string; categoryName: string };
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
    const res = await fetch("/api/source");
    const data = await res.json();
    setSources(data);
  };

  const fetchCategories = async () => {
    const res = await fetch("/api/category");
    const data = await res.json();
    setCategories(data);
  };

  const fetchSecondaryCategories = async () => {
    const res = await fetch("/api/secondary-category");
    const data = await res.json();
    setSecondaryCategories(data);
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
      body: JSON.stringify({ categoryName: newSecondaryCategory.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setSecondaryCategories((prev) => [...prev, data]);
      setSecondaryCategoryIds((prev) => [...prev, data.id]);
      setNewSecondaryCategory("");
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

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-sky-50 ring-1 ring-gray-300">
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
              {secondaryCategories.map((c) => (
                <Badge
                  key={c.id}
                  variant={
                    secondaryCategoryIds.includes(c.id) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleSecondaryCategory(c.id)}
                >
                  {c.categoryName}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Thêm nhãn phụ mới..."
                value={newSecondaryCategory}
                onChange={(e) => setNewSecondaryCategory(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(), handleAddSecondaryCategory())
                }
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
