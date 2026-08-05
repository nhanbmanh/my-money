"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Target, Save, RotateCcw, Tag, Layers } from "lucide-react";

export type Category = { id: string; categoryName: string };

interface BudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  secondaryCategories?: Category[];
  onBudgetsUpdated: () => void;
}

export const BUDGET_STORAGE_KEY = "my_money_category_budgets";

export function getStoredBudgets(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredBudgets(budgets: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
  } catch (e) {
    console.error("Failed to save budgets to localStorage", e);
  }
}

export function BudgetModal({
  open,
  onOpenChange,
  categories,
  secondaryCategories = [],
  onBudgetsUpdated,
}: BudgetModalProps) {
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"primary" | "secondary">("primary");

  useEffect(() => {
    if (open) {
      const stored = getStoredBudgets();
      const initial: Record<string, string> = {};
      
      const allCats = [...categories, ...secondaryCategories];
      allCats.forEach((cat) => {
        const val = stored[cat.id] || stored[cat.categoryName];
        initial[cat.id] = val ? Number(val).toLocaleString("vi-VN") : "";
      });
      setBudgets(initial);
    }
  }, [open, categories, secondaryCategories]);

  const handleInputChange = (catId: string, val: string) => {
    const digitsOnly = val.replace(/\D/g, "");
    if (!digitsOnly) {
      setBudgets((prev) => ({ ...prev, [catId]: "" }));
    } else {
      const num = parseInt(digitsOnly, 10);
      setBudgets((prev) => ({ ...prev, [catId]: num.toLocaleString("vi-VN") }));
    }
  };

  const handleSave = () => {
    const toSave: Record<string, number> = {};
    const allCats = [...categories, ...secondaryCategories];
    allCats.forEach((cat) => {
      const rawVal = budgets[cat.id] || "";
      const digitsOnly = rawVal.replace(/\D/g, "");
      if (digitsOnly) {
        toSave[cat.id] = parseInt(digitsOnly, 10);
      }
    });
    saveStoredBudgets(toSave);
    window.dispatchEvent(
      new CustomEvent("refresh-budget-alerts", { detail: { triggerToast: false } })
    );
    onBudgetsUpdated();
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setBudgets({});
  };

  const renderCategoryList = (list: Category[], label: string) => {
    if (list.length === 0) {
      return (
        <p className="text-xs text-slate-400 text-center py-6">
          Chưa có {label.toLowerCase()} nào.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {list.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80"
          >
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 truncate">
              {cat.categoryName}
            </Label>
            <div className="relative w-44">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Không giới hạn"
                value={budgets[cat.id] || ""}
                onChange={(e) => handleInputChange(cat.id, e.target.value)}
                className="h-8.5 text-xs text-right pr-6 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">
                ₫
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Target className="h-4.5 w-4.5" />
            </div>
            Thiết Lập Ngân Sách Hạn Mức (Tháng)
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Đặt hạn mức chi tiêu tối đa cho Nhãn chính và Nhãn phụ để nhận cảnh báo tự động khi sắp vượt ngưỡng.
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "primary" | "secondary")} className="w-full my-2">
          <TabsList className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-10 w-full mb-3">
            <TabsTrigger value="primary" className="text-xs font-bold gap-1.5 rounded-lg">
              <Layers className="h-3.5 w-3.5 text-sky-500" />
              Nhãn Chính ({categories.length})
            </TabsTrigger>
            <TabsTrigger value="secondary" className="text-xs font-bold gap-1.5 rounded-lg">
              <Tag className="h-3.5 w-3.5 text-purple-500" />
              Nhãn Phụ ({secondaryCategories.length})
            </TabsTrigger>
          </TabsList>

          <div className="max-h-[50vh] overflow-y-auto pr-1">
            <TabsContent value="primary" className="mt-0">
              {renderCategoryList(categories, "Nhãn chính")}
            </TabsContent>
            <TabsContent value="secondary" className="mt-0">
              {renderCategoryList(secondaryCategories, "Nhãn phụ")}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Xóa tất cả
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Lưu Ngân Sách
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
