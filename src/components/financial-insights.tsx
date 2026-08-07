"use client";

import { useMemo, useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  PieChart as PieIcon,
  Target,
  Repeat,
  ShieldCheck,
  Zap,
  Settings2,
  ChevronRight,
  ListFilter,
  Eye,
  Calendar,
  HelpCircle,
  FileSpreadsheet,
  Download,
  Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getStoredBudgets } from "./budget-modal";
import { cn } from "@/lib/utils";

import { ImportExcelModal } from "@/components/import-excel-modal";
import { exportCashflowToExcel } from "@/lib/excel-import-utils";

export type Category = { id: string; categoryName: string; type?: number | null; budgetLimit?: number | null };
export type Source = { id: string; sourceName: string };

export type CashFlowItem = {
  id: string;
  title: string;
  description: string | null;
  datetime: string;
  cashType: "Income" | "Expense";
  amountOfMoney: number;
  source: Source | null;
  primaryCategory: Category | null;
  secondaryCategories: { secondaryCategory: Category }[];
  sourceId: string | null;
  primaryCategoryId: string | null;
};

interface FinancialInsightsProps {
  items: CashFlowItem[];
  categories: Category[];
  secondaryCategories?: Category[];
  sources?: Source[];
  onOpenBudgetModal: () => void;
  budgetsUpdatedKey?: number;
  onMutationNeeded?: () => void;
}

export function FinancialInsights({
  items,
  categories,
  secondaryCategories = [],
  sources = [],
  onOpenBudgetModal,
  budgetsUpdatedKey = 0,
  onMutationNeeded,
}: FinancialInsightsProps) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [storedBudgets, setStoredBudgets] = useState<Record<string, number>>({});
  const [selectedDetail, setSelectedDetail] = useState<{
    title: string;
    subtitle?: string;
    items: CashFlowItem[];
  } | null>(null);

  const [allCategoriesModalOpen, setAllCategoriesModalOpen] = useState(false);

  // Scope state: "month" (default) or "filter"
  const [analysisScope, setAnalysisScope] = useState<"filter" | "month">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [monthItems, setMonthItems] = useState<CashFlowItem[]>([]);
  const [loadingMonthData, setLoadingMonthData] = useState(false);

  // Email report state for past months
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isPastMonth = useMemo(() => {
    if (analysisScope !== "month") return false;
    const currentMonthStr = format(new Date(), "yyyy-MM");
    return selectedMonth < currentMonthStr;
  }, [analysisScope, selectedMonth]);

  const handleSendPastMonthEmail = async () => {
    setSendingEmail(true);
    setEmailMessage(null);
    try {
      const res = await fetch("/api/reports/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          storedBudgets: getStoredBudgets(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEmailMessage({ type: "error", text: data.error || "Không thể gửi email báo cáo" });
      } else {
        setEmailMessage({ type: "success", text: data.message });
        setTimeout(() => setEmailMessage(null), 6000);
      }
    } catch {
      setEmailMessage({ type: "error", text: "Lỗi kết nối khi gửi email báo cáo" });
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    setStoredBudgets(getStoredBudgets());
  }, [budgetsUpdatedKey]);

  // List of available months for selection (current month + past 5 months)
  const availableMonths = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = subMonths(now, i);
      list.push({
        value: format(d, "yyyy-MM"),
        label: i === 0 ? `Tháng này (${format(d, "MM/yyyy")})` : `Tháng ${format(d, "MM/yyyy")}`,
      });
    }
    return list;
  }, []);

  // Fetch full month items if scope is "month"
  useEffect(() => {
    if (analysisScope === "filter") return;

    const fetchMonthData = async () => {
      setLoadingMonthData(true);
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;

      const startDate = startOfMonth(new Date(year, month, 1));
      const endDate = endOfMonth(new Date(year, month, 1));

      const params = new URLSearchParams({
        page: "1",
        limit: "all",
        dateFrom: startDate.toISOString(),
        dateTo: endDate.toISOString(),
      });

      try {
        const res = await fetch(`/api/cashflow?${params}`);
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setMonthItems(data.items || []);
      } catch {
        setMonthItems([]);
      } finally {
        setLoadingMonthData(false);
      }
    };

    fetchMonthData();
  }, [analysisScope, selectedMonth, budgetsUpdatedKey]);

  // Active items used for all insights & budget calculations
  const activeItems = analysisScope === "filter" ? items : monthItems;

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  // 1. Calculations: Total Income, Total Expense, Net Savings, Savings Rate
  const { totalIncome, totalExpense, netSavings, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    activeItems.forEach((item) => {
      const amt = Math.abs(item.amountOfMoney);
      if (item.cashType === "Income") {
        inc += amt;
      } else {
        exp += amt;
      }
    });
    const net = inc - exp;
    const rate = inc > 0 ? (net / inc) * 100 : 0;
    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: net,
      savingsRate: rate,
    };
  }, [activeItems]);

  // 2. Top 3 Highest Expense Transactions
  const top3Spikes = useMemo(() => {
    const expenseItems = activeItems.filter((i) => i.cashType === "Expense");
    return expenseItems
      .sort((a, b) => Math.abs(b.amountOfMoney) - Math.abs(a.amountOfMoney))
      .slice(0, 3);
  }, [activeItems]);

  const allExpenseItemsSorted = useMemo(() => {
    return activeItems
      .filter((i) => i.cashType === "Expense")
      .sort((a, b) => Math.abs(b.amountOfMoney) - Math.abs(a.amountOfMoney));
  }, [activeItems]);

  // 3. All Expense Categories Sorted (High to Low)
  const allCategoriesExpenseSorted = useMemo(() => {
    const catMap = new Map<string, { value: number; catItems: CashFlowItem[] }>();
    activeItems.forEach((item) => {
      if (item.cashType === "Expense") {
        const catName =
          item.primaryCategory?.categoryName || "Chưa phân loại";
        if (!catMap.has(catName)) {
          catMap.set(catName, { value: 0, catItems: [] });
        }
        const entry = catMap.get(catName)!;
        entry.value += Math.abs(item.amountOfMoney);
        entry.catItems.push(item);
      }
    });
    return Array.from(catMap.entries())
      .map(([name, { value, catItems }]) => ({
        name,
        value,
        catItems,
        percent: totalExpense > 0 ? (value / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeItems, totalExpense]);

  const top3ExpenseCategories = useMemo(() => {
    return allCategoriesExpenseSorted.slice(0, 3);
  }, [allCategoriesExpenseSorted]);

  // 4. Top 3 Highest Income Transactions
  const top3Incomes = useMemo(() => {
    const incomeItems = activeItems.filter((i) => i.cashType === "Income");
    return incomeItems
      .sort((a, b) => Math.abs(b.amountOfMoney) - Math.abs(a.amountOfMoney))
      .slice(0, 3);
  }, [activeItems]);

  const allIncomeItemsSorted = useMemo(() => {
    return activeItems
      .filter((i) => i.cashType === "Income")
      .sort((a, b) => Math.abs(b.amountOfMoney) - Math.abs(a.amountOfMoney));
  }, [activeItems]);

  // 5. Category Budget Progress (Primary & Secondary Categories)
  const budgetProgressList = useMemo(() => {
    const expenseByPrimaryMap = new Map<string, { spent: number; catItems: CashFlowItem[] }>();
    const expenseBySecondaryMap = new Map<string, { spent: number; catItems: CashFlowItem[] }>();

    activeItems.forEach((item) => {
      if (item.cashType === "Expense") {
        const amt = Math.abs(item.amountOfMoney);

        // Primary category tracking
        if (item.primaryCategory) {
          const id = item.primaryCategory.id;
          if (!expenseByPrimaryMap.has(id)) {
            expenseByPrimaryMap.set(id, { spent: 0, catItems: [] });
          }
          const entry = expenseByPrimaryMap.get(id)!;
          entry.spent += amt;
          entry.catItems.push(item);
        }

        // Secondary categories tracking
        if (item.secondaryCategories && item.secondaryCategories.length > 0) {
          item.secondaryCategories.forEach((sc) => {
            const id = sc.secondaryCategory.id;
            if (!expenseBySecondaryMap.has(id)) {
              expenseBySecondaryMap.set(id, { spent: 0, catItems: [] });
            }
            const entry = expenseBySecondaryMap.get(id)!;
            entry.spent += amt;
            entry.catItems.push(item);
          });
        }
      }
    });

    const list: Array<{
      category: Category;
      isSecondary: boolean;
      budgetLimit: number;
      spent: number;
      catItems: CashFlowItem[];
      percent: number;
    }> = [];

    // Primary categories with budget set
    categories.forEach((cat) => {
      const budgetLimit =
        cat.budgetLimit !== undefined && cat.budgetLimit !== null && cat.budgetLimit > 0
          ? cat.budgetLimit
          : storedBudgets[cat.id] || 0;

      if (budgetLimit > 0) {
        const entry = expenseByPrimaryMap.get(cat.id) || { spent: 0, catItems: [] };
        const percent = (entry.spent / budgetLimit) * 100;
        list.push({
          category: cat,
          isSecondary: false,
          budgetLimit,
          spent: entry.spent,
          catItems: entry.catItems,
          percent,
        });
      }
    });

    // Secondary categories with budget set
    (secondaryCategories || []).forEach((secCat) => {
      const budgetLimit =
        secCat.budgetLimit !== undefined && secCat.budgetLimit !== null && secCat.budgetLimit > 0
          ? secCat.budgetLimit
          : storedBudgets[secCat.id] || 0;

      if (budgetLimit > 0) {
        const entry = expenseBySecondaryMap.get(secCat.id) || { spent: 0, catItems: [] };
        const percent = (entry.spent / budgetLimit) * 100;
        list.push({
          category: secCat,
          isSecondary: true,
          budgetLimit,
          spent: entry.spent,
          catItems: entry.catItems,
          percent,
        });
      }
    });

    return list.sort((a, b) => b.percent - a.percent);
  }, [activeItems, categories, secondaryCategories, storedBudgets]);

  // Health Rating
  const healthStatus = useMemo(() => {
    if (netSavings < 0) {
      return {
        label: "Thâm Hụt Chi Tiêu",
        badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        icon: AlertTriangle,
        desc: "Tổng chi tiêu đang vượt tổng thu nhập. Cần rà soát và cắt giảm ngay!",
      };
    }
    if (savingsRate >= 40) {
      return {
        label: "Sức Khỏe Xuất Sắc",
        badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        icon: ShieldCheck,
        desc: `Tích lũy đạt ${savingsRate.toFixed(1)}% thu nhập. Quản lý tài chính cực kỳ vững vàng!`,
      };
    }
    if (savingsRate >= 20) {
      return {
        label: "Sức Khỏe Tốt",
        badgeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
        icon: Zap,
        desc: `Tích lũy đạt ${savingsRate.toFixed(1)}% thu nhập. Tiếp tục duy trì phong độ này!`,
      };
    }
    return {
      label: "Cần Cải Thiện",
      badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      icon: AlertTriangle,
      desc: `Tỷ lệ tiết kiệm ở mức ${savingsRate.toFixed(1)}%. Hãy gia tăng khoản tích lũy!`,
    };
  }, [netSavings, savingsRate]);

  const HealthIcon = healthStatus.icon;

  return (
    <div className="space-y-6 mb-6">
      {/* SECTION 1: FINANCIAL HEALTH & SMART INSIGHTS CARDS */}
      <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-sky-100 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-500" />
            Báo Cáo Phân Tích & Điểm Cần Lưu Ý
          </CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <button className="focus:outline-none shrink-0" title="Bấm để xem chi tiết đánh giá">
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5 text-xs font-bold py-1 px-2.5 sm:px-3 border rounded-xl cursor-pointer hover:opacity-85 transition-all shrink-0",
                    healthStatus.badgeBg
                  )}
                >
                  <HealthIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">{healthStatus.label}</span>
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-64 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-1.5 text-xs"
            >
              <div className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                <HealthIcon className="h-4 w-4 text-sky-500" />
                {healthStatus.label}
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {healthStatus.desc}
              </p>
            </PopoverContent>
          </Popover>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Scope Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-sky-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Phạm vi tính toán báo cáo & ngân sách:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={analysisScope === "filter" ? "filter" : selectedMonth}
                onValueChange={(val) => {
                  if (val === "filter") {
                    setAnalysisScope("filter");
                  } else {
                    setAnalysisScope("month");
                    setSelectedMonth(val);
                  }
                }}
              >
                <SelectTrigger className="w-[210px] h-8.5 text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableMonths.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs font-medium cursor-pointer">
                      📅 {m.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="filter" className="text-xs font-semibold text-sky-600 dark:text-sky-400 cursor-pointer">
                    🔍 Theo bộ lọc thanh bên trái
                  </SelectItem>
                </SelectContent>
              </Select>
              {loadingMonthData && <Spinner className="h-4 w-4 text-sky-500" />}
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            💡 {healthStatus.desc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Tỷ lệ Tiết kiệm (Clickable) */}
            {(() => {
              const isPositive = netSavings >= 0;
              return (
                <div
                  onClick={() =>
                    setSelectedDetail({
                      title: "Chi tiết Dòng Tiền Tích Lũy (Thu nhập vs Chi tiêu)",
                      subtitle: `Tổng thu: ${formatVND(totalIncome)} | Tổng chi: ${formatVND(totalExpense)}`,
                      items: activeItems,
                    })
                  }
                  className={cn(
                    "p-3.5 rounded-2xl border space-y-1.5 cursor-pointer hover:shadow-md transition-all group",
                    isPositive
                      ? "bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-100 dark:border-emerald-900/40"
                      : "bg-gradient-to-br from-rose-50/60 to-red-50/40 dark:from-rose-950/30 dark:to-red-950/20 border-rose-100 dark:border-rose-900/40"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between text-xs font-bold",
                      isPositive
                        ? "text-emerald-800 dark:text-emerald-300"
                        : "text-rose-800 dark:text-rose-300"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                      )}
                      Tỷ Lệ Tích Lũy
                    </span>
                    <span>{savingsRate.toFixed(1)}%</span>
                  </div>
                  <div
                    className={cn(
                      "text-lg font-black",
                      isPositive
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-700 dark:text-rose-400"
                    )}
                  >
                    {formatVND(netSavings)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                    <span>{isPositive ? "Dòng tiền còn dư" : "Thâm hụt dòng tiền"}</span>
                    <span className="text-sky-600 dark:text-sky-400 font-semibold group-hover:underline flex items-center gap-0.5">
                      Xem {activeItems.length} giao dịch <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Card 2: Top 3 Chi Cao Nhất (Clickable xem chi tiết 3 giao dịch) */}
            <div
              onClick={() => {
                if (top3Spikes.length > 0) {
                  setSelectedDetail({
                    title: "Chi Tiết Top 3 Giao Dịch Chi Tiêu Cao Nhất",
                    subtitle: "3 khoản chi có giá trị lớn nhất trong khoảng thời gian này",
                    items: top3Spikes,
                  });
                }
              }}
              className={cn(
                "p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/60 to-red-50/40 dark:from-rose-950/30 dark:to-red-950/20 border border-rose-100 dark:border-rose-900/40 space-y-1.5 transition-all group cursor-pointer hover:shadow-md",
              )}
            >
              <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Top 3 Chi Cao Nhất
                </span>
                {top3Spikes.length > 0 && (
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold group-hover:underline flex items-center gap-0.5">
                    Xem chi tiết <ChevronRight className="h-3 w-3" />
                  </span>
                )}
              </div>
              {top3Spikes.length === 0 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium py-1">
                  Không có khoản chi nào.
                </div>
              ) : (
                <div className="space-y-1 pt-0.5">
                  {top3Spikes.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                      <span className="truncate max-w-[125px] font-medium">{item.title}</span>
                      <span className="text-rose-600 dark:text-rose-400 font-extrabold">{formatVND(Math.abs(item.amountOfMoney))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 3: Top Ngốn Tiền (Bấm vào hiển thị tất cả nhãn từ lớn đến bé) */}
            <div
              onClick={() => {
                if (allCategoriesExpenseSorted.length > 0) {
                  setAllCategoriesModalOpen(true);
                }
              }}
              className={cn(
                "p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-100 dark:border-amber-900/40 space-y-1.5 transition-all group cursor-pointer hover:shadow-md",
              )}
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-1.5">
                  <PieIcon className="h-4 w-4 text-amber-500" />
                  Top Ngốn Tiền
                </span>
                {allCategoriesExpenseSorted.length > 0 && (
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 group-hover:underline flex items-center gap-0.5">
                    Xem tất cả ({allCategoriesExpenseSorted.length}) <ChevronRight className="h-3 w-3" />
                  </span>
                )}
              </div>
              {top3ExpenseCategories.length === 0 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium py-1">Chưa có chi tiêu.</div>
              ) : (
                <div className="space-y-1 pt-0.5">
                  {top3ExpenseCategories.map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 p-0.5 rounded-lg"
                    >
                      <span className="truncate max-w-[110px] font-semibold">{cat.name}</span>
                      <span className="text-amber-700 dark:text-amber-400 font-extrabold">{cat.percent.toFixed(0)}% ({formatVND(cat.value)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 4: Top 3 Thu Cao Nhất (Clickable xem chi tiết 3 giao dịch thu) */}
            <div
              onClick={() => {
                if (top3Incomes.length > 0) {
                  setSelectedDetail({
                    title: "Chi Tiết Top 3 Giao Dịch Thu Nhập Cao Nhất",
                    subtitle: "3 khoản thu có giá trị lớn nhất trong khoảng thời gian này",
                    items: top3Incomes,
                  });
                }
              }}
              className={cn(
                "p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-cyan-50/40 dark:from-blue-950/30 dark:to-cyan-950/20 border border-blue-100 dark:border-blue-900/40 space-y-1.5 transition-all group cursor-pointer hover:shadow-md",
              )}
            >
              <div className="flex items-center justify-between text-xs font-bold text-blue-800 dark:text-blue-300">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Top 3 Thu Cao Nhất
                </span>
                {top3Incomes.length > 0 && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold group-hover:underline flex items-center gap-0.5">
                    Xem chi tiết <ChevronRight className="h-3 w-3" />
                  </span>
                )}
              </div>
              {top3Incomes.length === 0 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium py-1">
                  Không có khoản thu nào.
                </div>
              ) : (
                <div className="space-y-1 pt-0.5">
                  {top3Incomes.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                      <span className="truncate max-w-[125px] font-medium">{item.title}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">+{formatVND(Math.abs(item.amountOfMoney))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: CATEGORY BUDGET TRACKER & OVER-BUDGET ALERTS (IDEAS 3) */}
      <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-sky-100 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            Theo Dõi Ngân Sách Hạn Mức Danh Mục
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {isPastMonth && (
              <Button
                variant="outline"
                size="sm"
                disabled={sendingEmail}
                onClick={handleSendPastMonthEmail}
                className="text-xs font-bold gap-1.5 h-8 px-3 rounded-xl border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-slate-800 dark:border-slate-700 dark:text-purple-400 shadow-2xs transition-all"
                title={`Gửi báo cáo Tháng ${selectedMonth} kèm file Excel tới email của bạn`}
              >
                {sendingEmail ? (
                  <>
                    <Spinner className="h-3.5 w-3.5" />
                    Đang gửi mail...
                  </>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    Gửi Báo Cáo Qua Mail
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const scopeTag =
                  analysisScope === "filter" ? "Theo_Bo_Loc" : selectedMonth;
                exportCashflowToExcel(
                  activeItems,
                  sources,
                  categories,
                  secondaryCategories,
                  scopeTag
                );
              }}
              className="text-xs font-bold gap-1.5 h-8 px-3 rounded-xl border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:border-slate-700 dark:text-blue-400 shadow-2xs"
              title="Xuất toàn bộ giao dịch đang hiển thị theo phạm vi ra file Excel"
            >
              <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Export Excel ({activeItems.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenBudgetModal}
              className="text-xs font-bold gap-1.5 h-8 px-3 rounded-xl border-sky-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-800"
            >
              <Settings2 className="h-3.5 w-3.5 text-sky-500" />
              Thiết Lập Ngân Sách
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {budgetProgressList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center text-sky-500">
                <Target className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Chưa cài đặt ngân sách hạn mức nào
                </h5>
                <p className="text-xs text-slate-400 max-w-sm">
                  Bấm nút &quot;Thiết lập ngân sách&quot; để cài đặt hạn mức chi tiêu cho từng danh mục và nhận cảnh báo khi vượt ngưỡng.
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={onOpenBudgetModal}
                className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl gap-1.5"
              >
                Cài đặt ngay
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetProgressList.map((item) => {
                const isOver = item.percent >= 100;
                const isWarning = item.percent >= 80 && item.percent < 100;

                return (
                  <div
                    key={item.category.id}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all space-y-2.5",
                      isOver
                        ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                        : isWarning
                        ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {item.category.categoryName}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-bold py-0 px-1.5 rounded-md border shrink-0",
                            item.isSecondary
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                              : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
                          )}
                        >
                          {item.isSecondary ? "Nhãn phụ" : "Nhãn chính"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-extrabold py-0.5 px-2 rounded-lg",
                            isOver
                              ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                              : isWarning
                              ? "bg-amber-500 text-white border-amber-600"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                          )}
                        >
                          {isOver ? "🔴 VƯỢT HẠN MỨC" : isWarning ? "🟡 CHẠM NGƯỠNG" : "🟢 AN TOÀN"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSelectedDetail({
                              title: `Chi tiết chi tiêu danh mục: ${item.category.categoryName}`,
                              subtitle: `Đã chi ${formatVND(item.spent)} / Hạn mức ${formatVND(item.budgetLimit)} (${item.percent.toFixed(1)}%)`,
                              items: item.catItems,
                            })
                          }
                          className="h-6 text-[11px] px-2 font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 rounded-lg gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          {item.catItems.length}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-300">
                        Đã chi: <strong className={isOver ? "text-rose-600 dark:text-rose-400" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-100"}>{formatVND(item.spent)}</strong>
                      </span>
                      <span className="text-slate-400 font-medium">
                        Hạn mức: {formatVND(item.budgetLimit)} ({item.percent.toFixed(0)}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isOver
                            ? "bg-rose-500"
                            : isWarning
                            ? "bg-amber-500"
                            : "bg-emerald-500",
                        )}
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ALL CATEGORIES BREAKDOWN MODAL */}
      <Dialog open={allCategoriesModalOpen} onOpenChange={setAllCategoriesModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <PieIcon className="h-4.5 w-4.5 text-amber-500" />
              Bảng Xếp Hạng Chi Tiêu Theo Nhãn Chính
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toàn bộ {allCategoriesExpenseSorted.length} nhãn chính sắp xếp theo thứ tự số tiền chi từ cao đến thấp.
            </p>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 my-2">
            {allCategoriesExpenseSorted.map((cat, idx) => (
              <div
                key={cat.name}
                onClick={() => {
                  setAllCategoriesModalOpen(false);
                  setSelectedDetail({
                    title: `Chi tiết chi tiêu: ${cat.name}`,
                    subtitle: `Hạng #${idx + 1} | Tổng chi: ${formatVND(cat.value)} (${cat.percent.toFixed(1)}% tổng chi tiêu)`,
                    items: cat.catItems,
                  });
                }}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 space-y-1.5 cursor-pointer hover:bg-amber-50/60 dark:hover:bg-amber-950/40 transition-colors"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    {cat.name}
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-black">
                    {cat.percent.toFixed(1)}% ({formatVND(cat.value)})
                  </span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(cat.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllCategoriesModalOpen(false)}
              className="text-xs font-semibold rounded-xl"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL DRILL-DOWN MODAL */}
      <Dialog open={!!selectedDetail} onOpenChange={() => setSelectedDetail(null)}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ListFilter className="h-4.5 w-4.5 text-sky-500" />
              {selectedDetail?.title}
            </DialogTitle>
            {selectedDetail?.subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                {selectedDetail.subtitle}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 my-2">
            {selectedDetail?.items.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Không có giao dịch nào.</p>
            ) : (
              selectedDetail?.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-xs transition-all space-y-2 hover:bg-slate-100/80 dark:hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium flex flex-wrap items-center gap-1.5">
                        <span>{format(new Date(item.datetime), "HH:mm - dd/MM/yyyy")}</span>
                        <span>•</span>
                        <span className="text-sky-600 dark:text-sky-400 font-semibold">{item.source?.sourceName || "Tiền mặt"}</span>
                        {item.primaryCategory && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 dark:text-purple-400 font-semibold">{item.primaryCategory.categoryName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-black text-base">
                      <span className={item.cashType === "Income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                        {item.cashType === "Income" ? "+" : "-"}{formatVND(Math.abs(item.amountOfMoney))}
                      </span>
                    </div>
                  </div>

                  {/* Render description if available */}
                  {item.description && item.description.trim() !== "" && (
                    <div className="text-xs text-slate-700 dark:text-slate-200 font-normal whitespace-pre-wrap bg-slate-100 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 border-l-3 border-l-sky-500">
                      {item.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDetail(null)}
              className="text-xs font-semibold rounded-xl"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Import Modal */}
      <ImportExcelModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        sources={sources}
        categories={categories}
        secondaryCategories={secondaryCategories}
        onImportSuccess={() => {
          onMutationNeeded?.();
        }}
      />

      {/* Email Toast Feedback */}
      {emailMessage && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-50 max-w-sm p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-5 duration-300 flex items-center justify-between gap-3 text-xs font-bold",
            emailMessage.type === "success"
              ? "bg-emerald-500 text-white border-emerald-600"
              : "bg-rose-500 text-white border-rose-600"
          )}
        >
          <span>{emailMessage.text}</span>
          <button
            onClick={() => setEmailMessage(null)}
            className="text-white/80 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
