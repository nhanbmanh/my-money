"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  Plus,
  Receipt,
  Wallet,
  FolderKanban,
  Tags,
  Check,
  RotateCcw,
  Sparkles,
  FileText,
} from "lucide-react";
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

  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSecondary, setShowAddSecondary] = useState(false);

  const [newSource, setNewSource] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSecondaryCategory, setNewSecondaryCategory] = useState("");
  const [newSecondaryCategoryType, setNewSecondaryCategoryType] =
    useState("0");

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
    } else {
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
      setShowAddSource(false);
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
      setShowAddCategory(false);
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
      setShowAddSecondary(false);
    }
  };

  const toggleSecondaryCategory = (id: string) => {
    setSecondaryCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const addPresetAmount = (addValue: number) => {
    const current = parseFloat(form.amountOfMoney) || 0;
    setForm({ ...form, amountOfMoney: String(current + addValue) });
  };

  const clearAmount = () => {
    setForm({ ...form, amountOfMoney: "" });
  };

  // Group secondary categories by type number
  const secondaryGrouped = useMemo(() => {
    const map: Record<number, Category[]> = {};
    secondaryCategories.forEach((c) => {
      const t = typeof c.type === "number" ? c.type : 0;
      if (!map[t]) map[t] = [];
      map[t].push(c);
    });
    return Object.entries(map)
      .map(([typeStr, cats]) => ({
        type: Number(typeStr),
        cats,
      }))
      .sort((a, b) => a.type - b.type);
  }, [secondaryCategories]);

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

    onOpenChange(false);
    onSuccess?.();
  };

  const formattedAmountPreview = useMemo(() => {
    const num = parseFloat(form.amountOfMoney);
    if (isNaN(num) || num <= 0) return "0 ₫";
    return num.toLocaleString("vi-VN") + " ₫";
  }, [form.amountOfMoney]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-3xl">
        {/* Fixed Header */}
        <DialogHeader className="p-5 pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2.5 rounded-xl border transition-colors shrink-0",
                form.cashType === "Income"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60"
                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60",
              )}
            >
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                {isEdit ? "Sửa Giao Dịch" : "Khai Báo Giao Dịch"}
              </DialogTitle>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {isEdit
                  ? "Cập nhật thông tin thu chi cá nhân"
                  : "Ghi nhận dòng tiền thu chi cá nhân"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* SECTION 1: LOẠI GIAO DỊCH & SỐ TIỀN */}
            <div
              className={cn(
                "p-4 rounded-2xl border transition-all space-y-3",
                form.cashType === "Income"
                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40"
                  : "bg-rose-50/40 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40",
              )}
            >
              {/* Segmented Cash Type Toggle */}
              <div className="grid grid-cols-2 p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, cashType: "Expense" })}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    form.cashType === "Expense"
                      ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
                  )}
                >
                  💸 Chi tiêu
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, cashType: "Income" })}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    form.cashType === "Income"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
                  )}
                >
                  💰 Thu nhập
                </button>
              </div>

              {/* Prominent Amount Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="amount"
                    className="text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    Số tiền (VND) <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
                    {formattedAmountPreview}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    step="any"
                    value={form.amountOfMoney}
                    onChange={(e) =>
                      setForm({ ...form, amountOfMoney: e.target.value })
                    }
                    placeholder="0"
                    required
                    className={cn(
                      "h-12 text-xl font-black pr-14 pl-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all rounded-xl shadow-xs",
                      form.cashType === "Income"
                        ? "text-emerald-600 dark:text-emerald-400 focus:border-emerald-500"
                        : "text-rose-600 dark:text-rose-400 focus:border-rose-500",
                    )}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                    VND
                  </span>
                </div>

                {/* Quick Amount Preset Pills */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">
                    Nhanh:
                  </span>
                  <button
                    type="button"
                    onClick={() => addPresetAmount(50000)}
                    className="text-[11px] font-semibold px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    +50k
                  </button>
                  <button
                    type="button"
                    onClick={() => addPresetAmount(100000)}
                    className="text-[11px] font-semibold px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    +100k
                  </button>
                  <button
                    type="button"
                    onClick={() => addPresetAmount(500000)}
                    className="text-[11px] font-semibold px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    +500k
                  </button>
                  <button
                    type="button"
                    onClick={() => addPresetAmount(1000000)}
                    className="text-[11px] font-semibold px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    +1M
                  </button>
                  <button
                    type="button"
                    onClick={() => addPresetAmount(5000000)}
                    className="text-[11px] font-semibold px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    +5M
                  </button>
                  <button
                    type="button"
                    onClick={clearAmount}
                    className="text-[11px] font-semibold px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all ml-auto flex items-center gap-0.5 cursor-pointer"
                  >
                    <RotateCcw className="h-2.5 w-2.5" /> Xóa
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 2: THÔNG TIN CƠ BẢN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Title */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="title"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                >
                  <Sparkles className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Tên giao dịch <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Ăn sáng, Tiền điện tháng 8, Lương công ty..."
                  required
                  className="h-10 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-medium focus:border-sky-500"
                />
              </div>

              {/* Datetime */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Thời gian giao dịch
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-white dark:bg-slate-900 h-10 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-sky-600 dark:text-sky-400" />
                      {format(datetime, "HH:mm - dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={datetime}
                      onSelect={(date) => date && setDatetime(date)}
                    />
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Thời gian (Giờ:Phút)
                      </Label>
                      <Input
                        type="time"
                        className="w-28 h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    Nguồn tiền
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowAddSource(!showAddSource)}
                    className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    {showAddSource ? "Ẩn" : "Thêm mới"}
                  </button>
                </div>

                <Select
                  value={form.sourceId}
                  onValueChange={(value) => setForm({ ...form, sourceId: value })}
                >
                  <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium">
                    <SelectValue placeholder="Chọn nguồn tiền..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.sourceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {showAddSource && (
                  <div className="flex gap-1.5 pt-1 animate-in fade-in duration-150">
                    <Input
                      placeholder="Nhập tên nguồn tiền mới..."
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg"
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddSource())
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-2.5 bg-sky-600 text-white rounded-lg text-xs font-semibold shrink-0"
                      onClick={handleAddSource}
                    >
                      Tạo mới
                    </Button>
                  </div>
                )}
              </div>

              {/* Primary Category */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <FolderKanban className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    Nhãn chính
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    {showAddCategory ? "Ẩn" : "Thêm mới"}
                  </button>
                </div>

                <Select
                  value={form.primaryCategoryId}
                  onValueChange={(value) =>
                    setForm({ ...form, primaryCategoryId: value })
                  }
                >
                  <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium">
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

                {showAddCategory && (
                  <div className="flex gap-1.5 pt-1 animate-in fade-in duration-150">
                    <Input
                      placeholder="Nhập tên nhãn chính mới..."
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg"
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddCategory())
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-2.5 bg-sky-600 text-white rounded-lg text-xs font-semibold shrink-0"
                      onClick={handleAddCategory}
                    >
                      Tạo mới
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: NHÃN PHỤ & GHI CHÚ */}
            <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              {/* Secondary Categories Header & Adder */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Tags className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    Nhãn phụ (Có thể chọn nhiều)
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowAddSecondary(!showAddSecondary)}
                    className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    {showAddSecondary ? "Ẩn" : "Thêm mới"}
                  </button>
                </div>

                {showAddSecondary && (
                  <div className="flex flex-col sm:flex-row gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in duration-150">
                    <Input
                      placeholder="Nhập tên nhãn phụ mới..."
                      value={newSecondaryCategory}
                      onChange={(e) => setNewSecondaryCategory(e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg flex-1"
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddSecondaryCategory())
                      }
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                        Loại:
                      </span>
                      <Input
                        type="number"
                        min="0"
                        value={newSecondaryCategoryType}
                        onChange={(e) =>
                          setNewSecondaryCategoryType(e.target.value)
                        }
                        className="h-8 w-16 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-3 bg-sky-600 text-white rounded-lg text-xs font-semibold shrink-0"
                        onClick={handleAddSecondaryCategory}
                      >
                        Tạo mới
                      </Button>
                    </div>
                  </div>
                )}

                {/* Grouped Secondary Category Badges */}
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {secondaryGrouped.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Chưa có nhãn phụ nào
                    </p>
                  ) : (
                    secondaryGrouped.map((group) => (
                      <div key={`group-${group.type}`} className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Nhóm Type {group.type}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.cats.map((c) => {
                            const isSelected = secondaryCategoryIds.includes(
                              c.id,
                            );
                            return (
                              <Badge
                                key={c.id}
                                variant="outline"
                                className={cn(
                                  "cursor-pointer text-xs transition-all select-none rounded-lg px-2.5 py-1 flex items-center gap-1 font-medium",
                                  getSecondaryCategoryBadgeClass(c.type),
                                  isSelected &&
                                    "ring-2 ring-slate-900 dark:ring-slate-100 border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-xs scale-[1.02]",
                                )}
                                onClick={() => toggleSecondaryCategory(c.id)}
                              >
                                {isSelected && (
                                  <Check className="h-3 w-3 text-sky-400 dark:text-sky-600" />
                                )}
                                {c.categoryName}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 pt-1">
                <Label
                  htmlFor="description"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Mô tả ngắn / Ghi chú
                </Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Ghi chú thêm thông tin giao dịch..."
                  rows={2}
                  className="text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl resize-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-medium bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/60">
                {error}
              </p>
            )}
          </div>

          {/* Fixed Footer Actions */}
          <div className="p-4 px-5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 flex gap-3 z-10">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "flex-1 h-10 text-xs font-bold rounded-xl text-white shadow-md transition-all",
                form.cashType === "Income"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20"
                  : "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-600/20",
              )}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2" />
                  Đang xử lý...
                </>
              ) : isEdit ? (
                "Lưu Thay Đổi"
              ) : (
                "Tạo Giao Dịch"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
