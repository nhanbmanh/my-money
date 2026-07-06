"use client";

import { useEffect, useState, useCallback } from "react";
import { format, subMonths, startOfDay, endOfDay } from "date-fns";
import {
  CalendarIcon,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

type Category = { id: string; categoryName: string };
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

  // Sort & Pagination
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // Data
  const [items, setItems] = useState<CashFlowItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  // Filter options
  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<Category[]>(
    [],
  );

  useEffect(() => {
    fetch("/api/source")
      .then((r) => r.json())
      .then(setSources);
    fetch("/api/category")
      .then((r) => r.json())
      .then(setCategories);
    fetch("/api/secondary-category")
      .then((r) => r.json())
      .then(setSecondaryCategories);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "10",
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

    const res = await fetch(`/api/cashflow?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setTotalIncome(data.totalIncome || 0);
    setTotalExpense(data.totalExpense || 0);
    setLoading(false);
  }, [
    page,
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

  // Reset về page 1 khi filter thay đổi
  useEffect(() => {
    setPage(1);
  }, [
    search,
    sourceId,
    categoryId,
    cashType,
    dateFrom,
    dateTo,
    secondaryCategoryIds,
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
    setPage(1);
  };

  const formatMoney = (amount: number, type: "Income" | "Expense") => {
    const formatted = amount.toLocaleString("vi-VN") + "đ";
    return type === "Income" ? `+${formatted}` : `-${formatted}`;
  };

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <div className="bg-sky-50 ring-1 ring-gray-300 rounded-xl p-4 space-y-4 shadow-md shadow-sky-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Bộ lọc</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Xóa bộ lọc
          </Button>
        </div>

        {/* Row 1: Search + Date range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-white"
              placeholder="Tìm theo tên, mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Date From */}
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

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal bg-white"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
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

        {/* Row 2: CashType + Source + Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={cashType} onValueChange={setCashType}>
            <SelectTrigger className="bg-white w-full">
              <SelectValue placeholder="Loại giao dịch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="Income">💰 Thu nhập</SelectItem>
              <SelectItem value="Expense">💸 Chi tiêu</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger className="bg-white w-full">
              <SelectValue placeholder="Nguồn tiền" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nguồn</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.sourceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="bg-white w-full">
              <SelectValue placeholder="Nhãn chính" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhãn</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.categoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 3: Secondary categories */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Nhãn phụ</p>
          <div className="flex flex-wrap gap-2">
            {secondaryCategories.map((c) => (
              <Badge
                key={c.id}
                variant={
                  secondaryCategoryIds.includes(c.id) ? "default" : "outline"
                }
                className="cursor-pointer select-none"
                onClick={() => toggleSecondaryCategory(c.id)}
              >
                {c.categoryName}
              </Badge>
            ))}
            {secondaryCategories.length === 0 && (
              <p className="text-xs text-muted-foreground">Chưa có nhãn phụ</p>
            )}
          </div>
        </div>
      </div>

      {/* Result info */}
      <div className="flex justify-between text-sm text-muted-foreground">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
          <span className="text-green-600">
            Thu: <strong>+{totalIncome.toLocaleString("vi-VN")}đ</strong>
          </span>
          <span className="text-red-500">
            Chi: <strong>-{totalExpense.toLocaleString("vi-VN")}đ</strong>
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-sm">
          <span>
            Tổng: <strong className="text-foreground">{total}</strong> giao dịch
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() =>
              setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
            }
          >
            Ngày giao dịch
            {sortOrder === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : sortOrder === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden ring-1 ring-gray-300 shadow-md shadow-sky-100">
        <Table>
          <TableHeader className="bg-sky-100">
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Nhãn chính</TableHead>
              <TableHead>Nhãn phụ</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Mô tả</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground"
                >
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="bg-white hover:bg-sky-50">
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.cashType === "Income" ? "default" : "destructive"
                      }
                    >
                      {item.cashType === "Income" ? "💰 Thu" : "💸 Chi"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-semibold",
                      item.cashType === "Income"
                        ? "text-green-600"
                        : "text-red-500",
                    )}
                  >
                    {formatMoney(item.amountOfMoney, item.cashType)}
                  </TableCell>
                  <TableCell>{item.source?.sourceName ?? "—"}</TableCell>
                  <TableCell>
                    {item.primaryCategory?.categoryName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.secondaryCategories.length > 0
                        ? item.secondaryCategories.map(
                            ({ secondaryCategory }) => (
                              <Badge
                                key={secondaryCategory.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {secondaryCategory.categoryName}
                              </Badge>
                            ),
                          )
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.datetime), "HH:mm dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                    {item.description ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trước
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
              )
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-2 text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={page === p ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
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
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
