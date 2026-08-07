"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, subMonths, startOfDay, endOfDay } from "date-fns";
import {
  CalendarIcon,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  X,
  Trash2,
  List,
  BarChart3,
  Newspaper,
  Sparkles,
  Filter,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
} from "lucide-react";
import { checkIsIncomplete, getMissingFields } from "@/lib/incomplete-checker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardSummaryCards } from "@/components/dashboard-summary-cards";
import { DashboardAnalytics, CashFlowChartFilters } from "@/components/dashboard-analytics";
import { CashFlowNewsfeed } from "@/components/cashflow-newsfeed";
import { FinancialInsights } from "@/components/financial-insights";
import { BudgetModal } from "@/components/budget-modal";
import { CashFlowChartModal } from "@/components/cashflow-chart-modal";
import { CashFlowModal } from "@/components/cashflow-modal";
import { cn, getSecondaryCategoryBadgeClass } from "@/lib/utils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./ui/accordion";

type Category = { id: string; categoryName: string; type?: number | null };
type Source = { id: string; sourceName: string };
type CashFlowItem = {
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

const DEFAULT_DATE_FROM = startOfDay(subMonths(new Date(), 1));
const DEFAULT_DATE_TO = endOfDay(new Date());

export function CashFlowTable({ refreshKey }: { refreshKey: number }) {
  // Filter states
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date>(DEFAULT_DATE_FROM);
  const [dateTo, setDateTo] = useState<Date>(DEFAULT_DATE_TO);
  const [sourceId, setSourceId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState<string[]>(
    [],
  );
  const [cashType, setCashType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState("25");

  // Data
  const [items, setItems] = useState<CashFlowItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filter options
  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<Category[]>(
    [],
  );

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<CashFlowItem | null>(null);

  // Chart modal
  const [chartOpen, setChartOpen] = useState(false);

  // Budget & Refresh state
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetsUpdatedKey, setBudgetsUpdatedKey] = useState(0);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const combinedRefreshKey = refreshKey + localRefreshKey;
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Delete confirm
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const safeJson = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const text = await res.text();
        if (!text) return [];
        return JSON.parse(text);
      } catch {
        return [];
      }
    };

    safeJson("/api/source").then(setSources);
    safeJson("/api/category").then(setCategories);
    safeJson("/api/secondary-category").then(setSecondaryCategories);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit,
      sortOrder,
      ...(search && { search }),
      ...(sourceId !== "all" && { sourceId }),
      ...(categoryId !== "all" && { categoryId }),
      ...(cashType !== "all" && { cashType }),
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
    });
    secondaryCategoryIds.forEach((id) =>
      params.append("secondaryCategoryId", id),
    );

    try {
      const res = await fetch(`/api/cashflow?${params}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setTotalIncome(data.totalIncome || 0);
      setTotalExpense(data.totalExpense || 0);
    } catch {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setTotalIncome(0);
      setTotalExpense(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    sortOrder,
    search,
    sourceId,
    categoryId,
    cashType,
    dateFrom,
    dateTo,
    secondaryCategoryIds,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const chartFilters: CashFlowChartFilters = useMemo(
    () => ({
      search,
      sourceId,
      categoryId,
      secondaryCategoryIds,
      cashType,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      sortOrder,
    }),
    [
      search,
      sourceId,
      categoryId,
      secondaryCategoryIds,
      cashType,
      dateFrom,
      dateTo,
      sortOrder,
    ],
  );

  useEffect(() => {
    setSelectedIds([]);
  }, [
    search,
    sourceId,
    categoryId,
    cashType,
    dateFrom,
    dateTo,
    secondaryCategoryIds,
    limit,
  ]);

  const toggleSecondaryCategory = (id: string) => {
    setSecondaryCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const resetFilters = () => {
    setSearch("");
    setDateFrom(DEFAULT_DATE_FROM);
    setDateTo(DEFAULT_DATE_TO);
    setSourceId("all");
    setCategoryId("all");
    setSecondaryCategoryIds([]);
    setCashType("all");
  };

  // Checkbox handlers
  const isAllSelected =
    items.length > 0 && items.every((i) => selectedIds.includes(i.id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  const toggleAll = () => {
    setSelectedIds(isAllSelected ? [] : items.map((i) => i.id));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleMutationSuccess = useCallback(() => {
    fetchData();
    setLocalRefreshKey((k) => k + 1);
    setBudgetsUpdatedKey((k) => k + 1);
    window.dispatchEvent(
      new CustomEvent("refresh-budget-alerts", {
        detail: { triggerModal: false },
      })
    );
  }, [fetchData]);

  // Delete handlers
  const handleDeleteConfirm = (ids: string[]) => {
    setDeleteIds(ids);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const isBulk = deleteIds.length > 1;

    if (isBulk) {
      await fetch("/api/cashflow/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: deleteIds }),
      });
    } else {
      await fetch(`/api/cashflow/${deleteIds[0]}`, { method: "DELETE" });
    }

    setDeleting(false);
    setConfirmOpen(false);
    setSelectedIds([]);
    handleMutationSuccess();
  };

  // Edit handler
  const handleEdit = (item: CashFlowItem) => {
    setEditData(item);
    setEditModalOpen(true);
  };

  const formatMoney = (amount: number, type: "Income" | "Expense") => {
    const formatted = amount.toLocaleString("vi-VN") + "đ";
    return type === "Income" ? `+${formatted}` : `-${formatted}`;
  };

  const renderFilterContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-sky-500" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Bộ Lọc Tìm Kiếm
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsDesktopSidebarOpen(false);
            setIsMobileFilterOpen(false);
          }}
          className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          title="Thu gọn bộ lọc"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-white"
            placeholder="Tìm theo tên giao dịch, mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal bg-white"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Từ: {format(dateFrom, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(d) => d && setDateFrom(startOfDay(d))}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-sky-600 dark:text-sky-400" />
              Đến: {format(dateTo, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(d) => d && setDateTo(endOfDay(d))}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Select value={cashType} onValueChange={setCashType}>
          <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full">
            <SelectValue placeholder="Loại giao dịch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại giao dịch</SelectItem>
            <SelectItem value="Income">💰 Thu nhập</SelectItem>
            <SelectItem value="Expense">💸 Chi tiêu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full">
            <SelectValue placeholder="Nguồn tiền" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nguồn tiền</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.sourceName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full">
            <SelectValue placeholder="Nhãn chính" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhãn chính</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.categoryName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Nhãn phân loại phụ</p>
        <div className="flex flex-wrap gap-2 min-h-9 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 items-center">
          {secondaryCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có nhãn phụ</p>
          ) : (
            [...secondaryCategories]
              .sort((a, b) => (a.type ?? 0) - (b.type ?? 0))
              .map((c) => {
                const isSelected = secondaryCategoryIds.includes(c.id);

                return (
                  <Badge
                    key={c.id}
                    variant="outline"
                    className={cn(
                      "cursor-pointer select-none border transition-all",
                      getSecondaryCategoryBadgeClass(c.type),
                      isSelected &&
                        "shadow-xs scale-[1.03] border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold",
                    )}
                    onClick={() => toggleSecondaryCategory(c.id)}
                  >
                    {c.categoryName}
                  </Badge>
                );
              })
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={resetFilters}
          className="gap-1 w-full sm:w-auto justify-center text-muted-foreground"
        >
          <X className="h-3 w-3" />
          Xóa bộ lọc
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 flex flex-col flex-1 min-h-0">
      {/* Top Summary Cards */}
      <DashboardSummaryCards
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        totalTransactions={total}
        loading={loading}
      />

      {/* Main Layout: Left = Shared Filter Sidebar, Right = View Switcher (Table vs Chart) */}
      <div className="flex flex-col gap-3 w-full xl:flex-row xl:h-[calc(100vh-14rem)] flex-1 min-h-0">
        {/* Mobile Filter Panel (Top-Down Smooth Slide Animation) */}
        <div
          className={cn(
            "block xl:hidden w-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
            isMobileFilterOpen
              ? "max-h-[85vh] opacity-100 mb-2 bg-sky-50/90 dark:bg-slate-900/90 ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl p-4 shadow-md overflow-y-auto"
              : "max-h-0 opacity-0 p-0 border-0 pointer-events-none"
          )}
        >
          {renderFilterContent()}
        </div>

        {/* Desktop Filter Sidebar (Collapsible for Desktop >= 1200px) */}
        <div
          className={cn(
            "hidden xl:block transition-all duration-300 ease-in-out shrink-0 xl:sticky xl:top-4",
            isDesktopSidebarOpen
              ? "xl:w-[360px] xl:min-w-[360px] xl:h-full xl:min-h-0 xl:overflow-y-auto bg-sky-50/60 dark:bg-slate-900/90 ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl px-4 py-4 space-y-4 shadow-xs"
              : "xl:w-0 xl:min-w-0 p-0 ring-0 overflow-hidden opacity-0 border-0 pointer-events-none"
          )}
        >
          {renderFilterContent()}
        </div>

        {/* Right Content Area: View Switcher (Newsfeed, Table, Chart) */}
        <div className="flex-1 min-w-0 w-full xl:h-full xl:min-h-0 flex flex-col transition-all duration-300">
          <Tabs defaultValue="newsfeed" className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 p-2 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-2xs shrink-0 w-full overflow-hidden">
              {/* Standalone Dedicated Toggle Button Block */}
              <div className="shrink-0">
                {/* Desktop Toggle Button */}
                {!isDesktopSidebarOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDesktopSidebarOpen(true)}
                    className="hidden xl:flex items-center gap-1.5 h-8.5 px-3 rounded-xl border-sky-200 dark:border-slate-700 bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 text-xs font-bold text-sky-700 dark:text-sky-300 shrink-0 shadow-2xs transition-all"
                    title="Mở thanh bộ lọc"
                  >
                    <PanelLeftOpen className="h-4 w-4 text-sky-500" />
                    Hiện Bộ Lọc
                  </Button>
                )}

                {/* Mobile Toggle Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                  className="flex xl:hidden items-center gap-1.5 h-8.5 px-3 rounded-xl border-sky-200 dark:border-slate-700 bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 text-xs font-bold text-sky-700 dark:text-sky-300 shrink-0 shadow-2xs transition-all"
                >
                  <Filter className="h-3.5 w-3.5 text-sky-500" />
                  {isMobileFilterOpen ? "Thu Gọn" : "Bộ Lọc"}
                  {isMobileFilterOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>

              {/* Dedicated Scrollable Tabs Bar */}
              <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5 pr-2">
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl h-auto inline-flex items-center flex-nowrap min-w-max shrink-0 space-x-1">
                  <TabsTrigger
                    value="newsfeed"
                    className="text-xs font-bold gap-1.5 px-3.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs transition-all text-sky-600 dark:text-sky-400"
                  >
                    <Newspaper className="h-4 w-4 shrink-0" />
                    Bản Tin Giao Dịch
                  </TabsTrigger>
                  <TabsTrigger
                    value="list"
                    className="text-xs font-bold gap-1.5 px-3.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs transition-all"
                  >
                    <List className="h-4 w-4 shrink-0" />
                    Danh Sách Bảng
                  </TabsTrigger>
                  <TabsTrigger
                    value="chart"
                    className="text-xs font-bold gap-1.5 px-3.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs transition-all text-purple-600 dark:text-purple-400"
                  >
                    <BarChart3 className="h-4 w-4 shrink-0" />
                    Biểu Đồ Thống Kê
                  </TabsTrigger>
                  <TabsTrigger
                    value="insights"
                    className="text-xs font-bold gap-1.5 px-3.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs transition-all text-emerald-600 dark:text-emerald-400"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                    Phân Tích & Ngân Sách
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* TAB 1: NEWSFEED VIEW (DEFAULT - 1 ITEM PER ROW, INFINITE SCROLL) */}
            <TabsContent value="newsfeed" className="mt-0 flex-1 min-h-0 flex flex-col">
              <CashFlowNewsfeed
                filters={{
                  search,
                  sourceId,
                  categoryId,
                  secondaryCategoryIds,
                  cashType,
                  dateFrom,
                  dateTo,
                  sortOrder,
                  refreshKey: combinedRefreshKey,
                }}
                selectedIds={selectedIds}
                toggleOne={toggleOne}
                toggleAll={toggleAll}
                isAllSelected={isAllSelected}
                isIndeterminate={isIndeterminate}
                handleEdit={handleEdit}
                handleDeleteConfirm={handleDeleteConfirm}
                onRefreshNeeded={handleMutationSuccess}
              />
            </TabsContent>

            {/* TAB 2: LIST VIEW */}
            <TabsContent value="list" className="mt-0 flex-1 min-h-0 flex flex-col space-y-3">
              {/* Top Controls Bar: Pagination (Left) & Actions (Right) */}
              <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white/60 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                {/* Left: Pagination Controls */}
                {limit !== "all" && totalPages > 1 ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8 text-xs font-medium px-2.5"
                    >
                      Trước
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (p) =>
                            p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                        )
                        .reduce<(number | "...")[]>((acc, p, i, arr) => {
                          if (i > 0 && p - (arr[i - 1] as number) > 1)
                            acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "..." ? (
                            <span
                              key={`ellipsis-${i}`}
                              className="px-1 text-muted-foreground text-xs"
                            >
                              ...
                            </span>
                          ) : (
                            <Button
                              key={p}
                              variant={page === p ? "default" : "outline"}
                              size="sm"
                              className="w-7 h-7 p-0 text-xs font-bold"
                              onClick={() => setPage(p as number)}
                            >
                              {p}
                            </Button>
                          ),
                        )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-8 text-xs font-medium px-2.5"
                    >
                      Sau
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground font-medium px-1">
                    Hiển thị <strong>{total}</strong> giao dịch
                  </div>
                )}

                {/* Right: Actions (Limit Selector & Delete Button) */}
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Hiển thị</span>
                    <Select
                      value={limit}
                      onValueChange={(value) => {
                        setLimit(value);
                        setPage(1);
                        setSelectedIds([]);
                      }}
                    >
                      <SelectTrigger className="w-[65px] h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs font-bold gap-1.5 px-3"
                    disabled={selectedIds.length === 0}
                    onClick={() => handleDeleteConfirm(selectedIds)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa giao dịch
                    {selectedIds.length > 0 && ` (${selectedIds.length})`}
                  </Button>
                </div>
              </div>

              {/* Table Area */}
              <div className="flex-1 min-h-0 overflow-auto ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl shadow-xs max-h-[calc(100vh-25rem)] xl:max-h-[calc(100vh-22rem)] bg-white dark:bg-slate-900">
                <Table>
                  <TableHeader className="bg-slate-900 dark:bg-slate-950">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) (el as any).indeterminate = isIndeterminate;
                          }}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className="font-bold text-white">
                        Tên
                      </TableHead>
                      <TableHead className="font-bold text-white">
                        Loại
                      </TableHead>
                      <TableHead className="font-bold text-white">
                        Số tiền
                      </TableHead>
                      <TableHead className="font-bold text-white">
                        Nguồn
                      </TableHead>
                      <TableHead className="font-bold text-white">
                        Nhãn chính
                      </TableHead>
                      <TableHead className="font-bold text-white">
                        Nhãn phụ
                      </TableHead>
                      <TableHead className="font-bold text-white">
                        Thời gian
                      </TableHead>
                      <TableHead className="font-bold text-white">
                        Mô tả
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <Spinner className="mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-12 text-muted-foreground"
                        >
                          Không có dữ liệu
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => {
                        const isIncomplete = checkIsIncomplete(item);
                        const missingFields = isIncomplete ? getMissingFields(item) : [];

                        return (
                          <ContextMenu key={item.id}>
                            <ContextMenuTrigger asChild>
                              <TableRow
                                className={cn(
                                  "bg-white dark:bg-slate-900 hover:bg-sky-50/60 dark:hover:bg-slate-800/80 cursor-context-menu border-b border-slate-100 dark:border-slate-800/60 transition-colors",
                                  isIncomplete &&
                                    "bg-amber-500/15 dark:bg-amber-950/50 border-l-8 border-l-amber-500 border-amber-300 dark:border-amber-700/80",
                                  selectedIds.includes(item.id) &&
                                    "bg-sky-100/70 dark:bg-sky-950/60 hover:bg-sky-100/80 dark:hover:bg-sky-900/60",
                                )}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedIds.includes(item.id)}
                                    onCheckedChange={() => toggleOne(item.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn(isIncomplete && "font-extrabold text-amber-950 dark:text-amber-200")}>{item.title}</span>
                                    {isIncomplete && (
                                      <Badge
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(item);
                                        }}
                                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] gap-1 transition-all cursor-pointer shrink-0 shadow-xs border-none animate-pulse"
                                        title={`Bổ sung: ${missingFields.join(", ")}`}
                                      >
                                        <AlertTriangle className="h-3 w-3 text-slate-950" />
                                        THIẾU: {missingFields.join(", ").toUpperCase()} ✏️
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      item.cashType === "Income"
                                        ? "default"
                                        : "destructive"
                                    }
                                  >
                                    {item.cashType === "Income"
                                      ? "💰 Thu"
                                      : "💸 Chi"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-semibold whitespace-nowrap">
                                  {item.amountOfMoney.toLocaleString("vi-VN")} ₫
                                </TableCell>
                                <TableCell>
                                  {item.source?.sourceName ? (
                                    item.source.sourceName
                                  ) : (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(item);
                                      }}
                                      className="text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 px-2 py-0.5 rounded-md shadow-xs cursor-pointer transition-colors inline-block"
                                    >
                                      ⚠️ CHỌN NGUỒN
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {item.primaryCategory?.categoryName ? (
                                    item.primaryCategory.categoryName
                                  ) : (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(item);
                                      }}
                                      className="text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 px-2 py-0.5 rounded-md shadow-xs cursor-pointer transition-colors inline-block"
                                    >
                                      ⚠️ CHỌN NHÃN CHÍNH
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {item.secondaryCategories && item.secondaryCategories.length > 0 ? (
                                      item.secondaryCategories.map(
                                        ({ secondaryCategory }) => (
                                          <Badge
                                            key={secondaryCategory.id}
                                            variant="outline"
                                            className={cn(
                                              "text-xs font-normal border",
                                              getSecondaryCategoryBadgeClass(
                                                secondaryCategory.type,
                                              ),
                                            )}
                                          >
                                            {secondaryCategory.categoryName}
                                            {secondaryCategory.type !==
                                              undefined &&
                                              secondaryCategory.type !== null && (
                                                <span className="ml-1 opacity-80">
                                                  [{secondaryCategory.type}]
                                                </span>
                                              )}
                                          </Badge>
                                        ),
                                      )
                                    ) : (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(item);
                                        }}
                                        className="text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 px-2 py-0.5 rounded-md shadow-xs cursor-pointer transition-colors inline-block"
                                      >
                                        ⚠️ CHỌN NHÃN PHỤ
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                  {item.datetime ? (
                                    format(
                                      new Date(item.datetime),
                                      "HH:mm dd/MM/yyyy",
                                    )
                                  ) : (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(item);
                                      }}
                                      className="text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 px-2 py-0.5 rounded-md shadow-xs cursor-pointer transition-colors inline-block"
                                    >
                                      ⚠️ CHỌN THỜI GIAN
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                                  {item.description ?? "—"}
                                </TableCell>
                              </TableRow>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => handleEdit(item)}>
                              ✏️ Sửa giao dịch
                            </ContextMenuItem>
                            <ContextMenuItem
                              className="text-red-500 focus:text-red-500"
                              onClick={() => handleDeleteConfirm([item.id])}
                            >
                              🗑️ Xóa giao dịch
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })
                  )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB 3: CHART VIEW */}
            <TabsContent value="chart" className="mt-0 flex-1 min-h-0 overflow-y-auto">
              <DashboardAnalytics filters={chartFilters} refreshKey={refreshKey} />
            </TabsContent>

            {/* TAB 4: FINANCIAL INSIGHTS & BUDGET TRACKING */}
            <TabsContent value="insights" className="mt-0 flex-1 min-h-0 overflow-y-auto pr-1">
              <FinancialInsights
                items={items}
                categories={categories}
                secondaryCategories={secondaryCategories}
                sources={sources}
                onOpenBudgetModal={() => setBudgetModalOpen(true)}
                budgetsUpdatedKey={budgetsUpdatedKey}
                onMutationNeeded={handleMutationSuccess}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Budget Modal */}
      <BudgetModal
        open={budgetModalOpen}
        onOpenChange={setBudgetModalOpen}
        categories={categories}
        secondaryCategories={secondaryCategories}
        onBudgetsUpdated={() => setBudgetsUpdatedKey((k) => k + 1)}
      />

      {/* Edit Modal */}
      <CashFlowModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={handleMutationSuccess}
        editData={editData}
      />

      <CashFlowChartModal
        open={chartOpen}
        onOpenChange={setChartOpen}
        filters={chartFilters}
      />

      {/* Confirm Delete Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteIds.length > 1
                ? `Bạn có chắc muốn xóa ${deleteIds.length} giao dịch đã chọn không? Hành động này không thể hoàn tác.`
                : "Bạn có chắc muốn xóa giao dịch này không? Hành động này không thể hoàn tác."}
            </AlertDialogDescription>
          </AlertDialogHeader>
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
