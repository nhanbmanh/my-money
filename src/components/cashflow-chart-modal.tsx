"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

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

type ChartCriterion =
  | "type"
  | "source"
  | "primaryCategory"
  | "secondaryCategory"
  | "time";

type TimeGrouping = "day" | "month";

type ChartType = "bar" | "pie";

const chartOptions: { value: ChartCriterion; label: string }[] = [
  { value: "type", label: "Loại" },
  { value: "source", label: "Nguồn" },
  { value: "primaryCategory", label: "Nhãn chính" },
  { value: "secondaryCategory", label: "Nhãn phụ" },
  { value: "time", label: "Thời gian" },
];

const chartTypeOptions: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Cột" },
  { value: "pie", label: "Tròn" },
];

type CashFlowItem = {
  id: string;
  datetime: string;
  cashType: "Income" | "Expense";
  amountOfMoney: number;
  source: { sourceName: string } | null;
  primaryCategory: { categoryName: string } | null;
  secondaryCategories: {
    secondaryCategory: { id: string; categoryName: string };
  }[];
};

type ChartDataPoint = {
  name: string;
  income: number;
  expense: number;
  sortKey?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CashFlowChartFilters;
}

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

const groupItems = (
  items: CashFlowItem[],
  criterion: ChartCriterion,
  timeGrouping: TimeGrouping,
): ChartDataPoint[] => {
  const groups = new Map<string, ChartDataPoint>();

  const addToGroup = (
    key: string,
    income: number,
    expense: number,
    sortKey?: string,
  ) => {
    if (!groups.has(key)) {
      groups.set(key, { name: key, income: 0, expense: 0, sortKey });
    }

    const group = groups.get(key)!;
    group.income += income;
    group.expense += expense;
  };

  items.forEach((item) => {
    const income = item.cashType === "Income" ? item.amountOfMoney : 0;
    const expense =
      item.cashType === "Expense" ? Math.abs(item.amountOfMoney) : 0;

    switch (criterion) {
      case "type": {
        addToGroup(
          item.cashType === "Income" ? "Thu nhập" : "Chi tiêu",
          income,
          expense,
        );
        break;
      }
      case "source": {
        addToGroup(
          item.source?.sourceName ?? "Không xác định",
          income,
          expense,
        );
        break;
      }
      case "primaryCategory": {
        addToGroup(
          item.primaryCategory?.categoryName ?? "Không có nhãn chính",
          income,
          expense,
        );
        break;
      }
      case "secondaryCategory": {
        if (item.secondaryCategories.length === 0) {
          addToGroup("Không có nhãn phụ", income, expense);
        } else {
          item.secondaryCategories.forEach(({ secondaryCategory }) => {
            addToGroup(secondaryCategory.categoryName, income, expense);
          });
        }
        break;
      }
      case "time": {
        const date = parseISO(item.datetime);
        const key =
          timeGrouping === "day"
            ? format(date, "dd/MM/yyyy")
            : format(date, "MM/yyyy");
        const label =
          timeGrouping === "day"
            ? format(date, "dd/MM/yyyy")
            : format(date, "MMM yyyy");
        const sortKey =
          timeGrouping === "day"
            ? format(date, "yyyy-MM-dd")
            : format(date, "yyyy-MM");
        addToGroup(label, income, expense, sortKey);
        break;
      }
    }
  });

  const data = Array.from(groups.values());

  return data.sort((a, b) => {
    if (criterion === "time") {
      return a.sortKey && b.sortKey ? a.sortKey.localeCompare(b.sortKey) : 0;
    }

    const totalA = a.income + a.expense;
    const totalB = b.income + b.expense;
    return totalB - totalA;
  });
};

export function CashFlowChartModal({ open, onOpenChange, filters }: Props) {
  const [selectedCriterion, setSelectedCriterion] =
    useState<ChartCriterion>("type");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>("month");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CashFlowItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const fetchChartData = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/cashflow?${buildQuery(filters)}`);
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

    fetchChartData();
  }, [open, filters]);

  const chartData = useMemo(
    () => groupItems(items, selectedCriterion, timeGrouping),
    [items, selectedCriterion, timeGrouping],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!inset-0 !top-0 !left-0 !right-0 !bottom-0 !-translate-x-0 !-translate-y-0 h-screen w-screen !max-w-none rounded-none bg-sky-50 ring-1 ring-gray-400 overflow-hidden block">
        <DialogHeader className="p-6 border-b border-slate-200">
          <DialogTitle className="text-2xl font-bold">
            Biểu đồ chi tiêu
          </DialogTitle>
          <DialogDescription>
            Dữ liệu biểu đồ được xây dựng từ bộ lọc hiện tại và bao gồm tất cả
            bản ghi đã lọc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] items-center">
            <div
              className={`${selectedCriterion === "time" && "grid"} gap-3 sm:grid-cols-[1fr_220px]`}
            >
              <div>
                <p className="text-sm text-muted-foreground">Tiêu chí</p>
                <Select
                  value={selectedCriterion}
                  onValueChange={(value) =>
                    setSelectedCriterion(value as ChartCriterion)
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chartOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCriterion === "time" ? (
                <div>
                  <p className="text-sm text-muted-foreground">Nhóm theo</p>
                  <Select
                    value={timeGrouping}
                    onValueChange={(value) =>
                      setTimeGrouping(value as TimeGrouping)
                    }
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Ngày</SelectItem>
                      <SelectItem value="month">Tháng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Loại biểu đồ</p>
              <Select
                value={chartType}
                onValueChange={(value) => setChartType(value as ChartType)}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chartTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 min-h-[320px]">
            {loading ? (
              <div className="flex h-[calc(100vh-360px)] items-center justify-center">
                <Spinner />
              </div>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Không có dữ liệu phù hợp để hiển thị biểu đồ.
              </p>
            ) : chartType === "bar" ? (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString("vi-VN") + "đ"
                    }
                  />
                  <Legend />
                  <Bar dataKey="income" name="Thu nhập" fill="#22c55e" />
                  <Bar dataKey="expense" name="Chi tiêu" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={480}>
                <PieChart>
                  <Pie
                    data={chartData.map((entry) => ({
                      ...entry,
                      value: entry.income + entry.expense,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={160}
                    label={({ name, percent }) =>
                      `${name} ${Math.round(percent * 100)}%`
                    }
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}-${index}`}
                        fill={
                          [
                            "#22c55e",
                            "#ef4444",
                            "#3b82f6",
                            "#f59e0b",
                            "#8b5cf6",
                            "#0ea5e9",
                            "#a855f7",
                            "#ec4899",
                          ][index % 8]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString("vi-VN") + "đ"
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
