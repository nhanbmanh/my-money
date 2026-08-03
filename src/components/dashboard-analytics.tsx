"use client";

import { useEffect, useMemo, useState } from "react";
import {
  format,
  parseISO,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { BarChart3, PieChart as PieIcon, LineChart as LineChartIcon, Tags } from "lucide-react";

export type CashFlowChartFilters = {
  search: string;
  sourceId: string;
  categoryId: string;
  secondaryCategoryIds: string[];
  cashType: string;
  dateFrom: string;
  dateTo: string;
  sortOrder: string;
};

type CashFlowItem = {
  id: string;
  datetime: string;
  cashType: "Income" | "Expense";
  amountOfMoney: number;
  source: { sourceName: string } | null;
  primaryCategory: { categoryName: string } | null;
  secondaryCategories: {
    secondaryCategory: { id: string; categoryName: string; type?: number };
  }[];
};

interface DashboardAnalyticsProps {
  filters: CashFlowChartFilters;
  refreshKey?: number;
}

type TabType = "trend" | "category" | "source" | "secondaryCategory";
type TimeGrouping = "day" | "month";

const INCOME_COLORS = [
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#84cc16",
  "#14b8a6",
  "#6366f1",
];

const EXPENSE_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#d97706",
];

const buildQuery = (filters: CashFlowChartFilters) => {
  const params = new URLSearchParams({
    page: "1",
    limit: "all",
    ...(filters.search && { search: filters.search }),
    ...(filters.sourceId !== "all" && { sourceId: filters.sourceId }),
    ...(filters.categoryId !== "all" && { categoryId: filters.categoryId }),
    ...(filters.cashType !== "all" && { cashType: filters.cashType }),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortOrder: filters.sortOrder,
  });

  filters.secondaryCategoryIds.forEach((id) =>
    params.append("secondaryCategoryId", id),
  );

  return params.toString();
};

export function DashboardAnalytics({
  filters,
  refreshKey = 0,
}: DashboardAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("trend");
  const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>("day");
  const [items, setItems] = useState<CashFlowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch all matching records for the current filter
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError("");
      try {
        const query = buildQuery(filters);
        const res = await fetch(`/api/cashflow?${query}`);
        if (!res.ok) {
          setError("Không thể tải dữ liệu biểu đồ");
          setItems([]);
          return;
        }
        const data = await res.json();
        setItems(data.items || []);
      } catch (err) {
        setError("Lỗi kết nối khi tải dữ liệu biểu đồ");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [filters, refreshKey]);

  // Format currency
  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  // 1. Trend Data (Continuous from dateFrom to dateTo)
  const timeData = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return [];

    const startDate = startOfDay(parseISO(filters.dateFrom));
    const endDate = endOfDay(parseISO(filters.dateTo));

    // Map existing records to buckets
    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();

    items.forEach((item) => {
      const date = parseISO(item.datetime);
      const isDay = timeGrouping === "day";
      const key = format(date, isDay ? "yyyy-MM-dd" : "yyyy-MM");

      if (item.cashType === "Income") {
        incomeMap.set(key, (incomeMap.get(key) || 0) + item.amountOfMoney);
      } else {
        expenseMap.set(key, (expenseMap.get(key) || 0) + Math.abs(item.amountOfMoney));
      }
    });

    if (timeGrouping === "day") {
      try {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        return days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const label = format(day, "dd/MM");
          return {
            label,
            income: incomeMap.get(key) || 0,
            expense: expenseMap.get(key) || 0,
          };
        });
      } catch {
        return [];
      }
    } else {
      try {
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        return months.map((month) => {
          const key = format(month, "yyyy-MM");
          const label = format(month, "MM/yyyy");
          return {
            label,
            income: incomeMap.get(key) || 0,
            expense: expenseMap.get(key) || 0,
          };
        });
      } catch {
        return [];
      }
    }
  }, [items, timeGrouping, filters.dateFrom, filters.dateTo]);

  // 2. Category Data: 2 separate datasets for Income & Expense
  const { incomeCategoryData, expenseCategoryData } = useMemo(() => {
    const incMap = new Map<string, number>();
    const expMap = new Map<string, number>();

    items.forEach((item) => {
      const name = item.primaryCategory?.categoryName || "Chưa phân loại";
      if (item.cashType === "Income") {
        incMap.set(name, (incMap.get(name) || 0) + item.amountOfMoney);
      } else {
        expMap.set(name, (expMap.get(name) || 0) + Math.abs(item.amountOfMoney));
      }
    });

    const totalInc = Array.from(incMap.values()).reduce((a, b) => a + b, 0);
    const totalExp = Array.from(expMap.values()).reduce((a, b) => a + b, 0);

    const incData = Array.from(incMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: totalInc > 0 ? (value / totalInc) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const expData = Array.from(expMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: totalExp > 0 ? (value / totalExp) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return { incomeCategoryData: incData, expenseCategoryData: expData };
  }, [items]);

  // 3. Source Data: 2 bars per source (Income & Expense)
  const sourceData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();

    items.forEach((item) => {
      const sourceName = item.source?.sourceName || "Tiền mặt";
      if (!map.has(sourceName)) {
        map.set(sourceName, { income: 0, expense: 0 });
      }
      const entry = map.get(sourceName)!;
      if (item.cashType === "Income") {
        entry.income += item.amountOfMoney;
      } else {
        entry.expense += Math.abs(item.amountOfMoney);
      }
    });

    return Array.from(map.entries())
      .map(([name, { income, expense }]) => ({
        name,
        income,
        expense,
        total: income + expense,
      }))
      .sort((a, b) => b.total - a.total);
  }, [items]);

  const secondaryCategoryByType = useMemo(() => {
    const typeMap: Record<
      number,
      Record<string, { income: number; expense: number; total: number }>
    > = {};

    items.forEach((item) => {
      item.secondaryCategories?.forEach(({ secondaryCategory }) => {
        if (!secondaryCategory) return;
        const typeNum =
          typeof secondaryCategory.type === "number"
            ? secondaryCategory.type
            : 0;
        const name = secondaryCategory.categoryName;

        if (!typeMap[typeNum]) {
          typeMap[typeNum] = {};
        }
        if (!typeMap[typeNum][name]) {
          typeMap[typeNum][name] = { income: 0, expense: 0, total: 0 };
        }

        const amt = Math.abs(item.amountOfMoney);
        if (item.cashType === "Income") {
          typeMap[typeNum][name].income += amt;
        } else {
          typeMap[typeNum][name].expense += amt;
        }
        typeMap[typeNum][name].total += amt;
      });
    });

    const sortedTypes = Object.keys(typeMap)
      .map(Number)
      .sort((a, b) => a - b);

    return sortedTypes.map((typeNum) => {
      const catsObj = typeMap[typeNum];
      const totalGroupValue = Object.values(catsObj).reduce(
        (acc, c) => acc + c.total,
        0,
      );

      const catList = Object.entries(catsObj)
        .map(([name, data]) => ({
          name,
          value: data.total,
          income: data.income,
          expense: data.expense,
          percent:
            totalGroupValue > 0 ? (data.total / totalGroupValue) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);

      return {
        type: typeNum,
        totalGroupValue,
        catList,
      };
    });
  }, [items]);

  return (
    <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-sky-100 dark:border-slate-800 shadow-xs mb-6 overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            Biểu Đồ Thống Kê Giao Dịch
          </CardTitle>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <Button
            variant={activeTab === "trend" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("trend")}
            className={`text-xs h-8 gap-1.5 rounded-lg ${
              activeTab === "trend"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LineChartIcon className="h-3.5 w-3.5" />
            Xu hướng Thu/Chi
          </Button>

          <Button
            variant={activeTab === "category" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("category")}
            className={`text-xs h-8 gap-1.5 rounded-lg ${
              activeTab === "category"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <PieIcon className="h-3.5 w-3.5" />
            Phân Bổ Nhãn Chính
          </Button>

          <Button
            variant={activeTab === "secondaryCategory" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("secondaryCategory")}
            className={`text-xs h-8 gap-1.5 rounded-lg ${
              activeTab === "secondaryCategory"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Tags className="h-3.5 w-3.5" />
            Theo Nhãn Phụ
          </Button>

          <Button
            variant={activeTab === "source" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("source")}
            className={`text-xs h-8 gap-1.5 rounded-lg ${
              activeTab === "source"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Theo Nguồn Tiền
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {loading ? (
          <div className="flex h-72 items-center justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-72 text-red-500 text-sm">
            <p>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-slate-400 text-sm">
            <p>Không có dữ liệu phù hợp với bộ lọc hiện tại</p>
          </div>
        ) : (
          <div>
            {/* TAB 1: TREND (LINE CHART & BAR CHART) */}
            {activeTab === "trend" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Gộp dữ liệu theo thời gian:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant={timeGrouping === "day" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeGrouping("day")}
                      className={`text-xs h-7 px-3 rounded-md ${
                        timeGrouping === "day"
                          ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 font-bold"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      Theo Ngày
                    </Button>
                    <Button
                      variant={timeGrouping === "month" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeGrouping("month")}
                      className={`text-xs h-7 px-3 rounded-md ${
                        timeGrouping === "month"
                          ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 font-bold"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      Theo Tháng
                    </Button>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={timeData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={(val) =>
                          val >= 1000000
                            ? `${(val / 1000000).toFixed(1)}M`
                            : val >= 1000
                            ? `${(val / 1000).toFixed(0)}k`
                            : val
                        }
                      />
                      <Tooltip
                        formatter={(val: number) => [formatVND(val)]}
                        contentStyle={{
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          borderColor: "#e2e8f0",
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Line
                        type="monotone"
                        dataKey="income"
                        name="Thu nhập"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#10b981" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        name="Chi tiêu"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#f43f5e" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 2: CATEGORY BREAKDOWN (2 DONUTS) */}
            {activeTab === "category" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. INCOME PIE CHART */}
                <div className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3 text-center">
                    💰 Cơ cấu Thu nhập theo Nhãn chính
                  </h4>
                  {incomeCategoryData.length === 0 ? (
                    <div className="flex h-56 items-center justify-center text-slate-400 text-xs">
                      Không có dữ liệu Thu nhập
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={incomeCategoryData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={75}
                              paddingAngle={3}
                            >
                              {incomeCategoryData.map((_, index) => (
                                <Cell
                                  key={`inc-cat-${index}`}
                                  fill={INCOME_COLORS[index % INCOME_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(val: number) => [formatVND(val), "Số tiền"]}
                              contentStyle={{ borderRadius: "12px", borderColor: "#e2e8f0" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {incomeCategoryData.map((cat, idx) => (
                          <div
                            key={cat.name}
                            title={`${cat.name}: ${formatVND(cat.value)} (${cat.percent.toFixed(1)}%)`}
                            className="group relative flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 text-xs transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:border-emerald-300 hover:shadow-xs cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    INCOME_COLORS[idx % INCOME_COLORS.length],
                                }}
                              />
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                {cat.name}
                              </span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-1.5 font-bold">
                              <span className="text-emerald-600 dark:text-emerald-400 block group-hover:hidden transition-all">
                                {cat.percent.toFixed(1)}%
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-300 hidden group-hover:block transition-all animate-in fade-in duration-150">
                                {formatVND(cat.value)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. EXPENSE PIE CHART */}
                <div className="p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20">
                  <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-3 text-center">
                    💸 Cơ cấu Chi tiêu theo Nhãn chính
                  </h4>
                  {expenseCategoryData.length === 0 ? (
                    <div className="flex h-56 items-center justify-center text-slate-400 text-xs">
                      Không có dữ liệu Chi tiêu
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={expenseCategoryData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={75}
                              paddingAngle={3}
                            >
                              {expenseCategoryData.map((_, index) => (
                                <Cell
                                  key={`exp-cat-${index}`}
                                  fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(val: number) => [formatVND(val), "Số tiền"]}
                              contentStyle={{ borderRadius: "12px", borderColor: "#e2e8f0" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {expenseCategoryData.map((cat, idx) => (
                          <div
                            key={cat.name}
                            title={`${cat.name}: ${formatVND(cat.value)} (${cat.percent.toFixed(1)}%)`}
                            className="group relative flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 text-xs transition-all hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:border-rose-300 hover:shadow-xs cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    EXPENSE_COLORS[idx % EXPENSE_COLORS.length],
                                }}
                              />
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                {cat.name}
                              </span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-1.5 font-bold">
                              <span className="text-rose-600 dark:text-rose-400 block group-hover:hidden transition-all">
                                {cat.percent.toFixed(1)}%
                              </span>
                              <span className="text-rose-700 dark:text-rose-300 hidden group-hover:block transition-all animate-in fade-in duration-150">
                                {formatVND(cat.value)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SOURCE BREAKDOWN (2 BARS PER SOURCE) */}
            {activeTab === "source" && (
              <div>
                <div className="mb-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Thống kê Dòng tiền Thu nhập & Chi tiêu theo từng Nguồn tiền
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sourceData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={(val) =>
                          val >= 1000000
                            ? `${(val / 1000000).toFixed(1)}M`
                            : val >= 1000
                            ? `${(val / 1000).toFixed(0)}k`
                            : val
                        }
                      />
                      <Tooltip
                        formatter={(val: number) => [formatVND(val)]}
                        contentStyle={{ borderRadius: "12px", borderColor: "#e2e8f0" }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="income" name="Thu nhập" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="expense" name="Chi tiêu" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 4: SECONDARY CATEGORY BREAKDOWN (CHARTS GROUPED BY TYPE) */}
            {activeTab === "secondaryCategory" && (
              <div className="space-y-6">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Biểu đồ Phân bổ Nhãn Phụ được phân nhóm tự động theo từng Loại (Type 0, Type 1, Type 2,...)
                </div>
                {secondaryCategoryByType.length === 0 ? (
                  <div className="flex h-56 items-center justify-center text-slate-400 text-xs">
                    Không có dữ liệu Nhãn phụ trong khoảng thời gian này
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {secondaryCategoryByType.map((group) => {
                      const typeColors = [
                        "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fb7185", "#34d399", "#fbbf24"
                      ];
                      return (
                        <div
                          key={`sec-type-${group.type}`}
                          className="p-4 rounded-2xl border border-sky-100 dark:border-slate-800 bg-sky-50/20 dark:bg-slate-900/50"
                        >
                          <h4 className="text-xs font-bold text-sky-800 dark:text-sky-400 uppercase tracking-wider mb-1 text-center flex items-center justify-center gap-1.5">
                            <Tags className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            Biểu đồ Nhãn phụ (Type {group.type})
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mb-3">
                            Tổng phát sinh:{" "}
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {formatVND(group.totalGroupValue)}
                            </span>
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
                            <div className="h-52 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={group.catList}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={68}
                                    paddingAngle={3}
                                  >
                                    {group.catList.map((_, index) => (
                                      <Cell
                                        key={`sec-cell-${index}`}
                                        fill={typeColors[index % typeColors.length]}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    formatter={(val: number) => [formatVND(val), "Số tiền"]}
                                    contentStyle={{ borderRadius: "12px", borderColor: "#e2e8f0" }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                              {group.catList.map((cat, idx) => (
                                <div
                                  key={cat.name}
                                  title={`${cat.name}: ${formatVND(cat.value)} (${cat.percent.toFixed(1)}%)`}
                                  className="group relative flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 text-xs transition-all hover:bg-sky-50 dark:hover:bg-slate-800 hover:border-sky-300 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{
                                        backgroundColor:
                                          typeColors[idx % typeColors.length],
                                      }}
                                    />
                                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                      {cat.name}
                                    </span>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-1.5 font-bold">
                                    <span className="text-sky-600 dark:text-sky-400 block group-hover:hidden transition-all">
                                      {cat.percent.toFixed(1)}%
                                    </span>
                                    <span className="text-sky-700 dark:text-sky-300 hidden group-hover:block transition-all animate-in fade-in duration-150">
                                      {formatVND(cat.value)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
