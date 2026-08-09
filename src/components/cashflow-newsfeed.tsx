"use client";

import { useState, useEffect, useCallback } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  Clock,
  Wallet,
  FolderKanban,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  FileText,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, getSecondaryCategoryBadgeClass } from "@/lib/utils";
import { checkIsIncomplete, getMissingFields } from "@/lib/incomplete-checker";
import { useLanguage } from "@/components/language-provider";

export type Category = {
  id: string;
  categoryName: string;
  type?: number | null;
};
export type Source = { id: string; sourceName: string };

export type CashFlowNewsfeedItem = {
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

export type CashFlowNewsfeedFilters = {
  search: string;
  sourceId: string;
  categoryId: string;
  secondaryCategoryIds: string[];
  cashType: string;
  dateFrom: Date;
  dateTo: Date;
  sortOrder: "asc" | "desc";
  refreshKey: number;
};

interface CashFlowNewsfeedProps {
  filters: CashFlowNewsfeedFilters;
  selectedIds: string[];
  toggleOne: (id: string) => void;
  toggleAll: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  handleEdit: (item: CashFlowNewsfeedItem) => void;
  handleDeleteConfirm: (ids: string[]) => void;
  onRefreshNeeded: () => void;
}

export function CashFlowNewsfeed({
  filters,
  selectedIds,
  toggleOne,
  toggleAll,
  isAllSelected,
  isIndeterminate,
  handleEdit,
  handleDeleteConfirm,
  onRefreshNeeded,
}: CashFlowNewsfeedProps) {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<CashFlowNewsfeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const {
    search,
    sourceId,
    categoryId,
    secondaryCategoryIds,
    cashType,
    dateFrom,
    dateTo,
    sortOrder,
    refreshKey,
  } = filters;

  const secCategoryKey = secondaryCategoryIds.join(",");

  const fetchFeed = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: String(pageNum),
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

      try {
        const res = await fetch(`/api/cashflow?${params}`);
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        const newItems: CashFlowNewsfeedItem[] = data.items || [];
        const totalCount = data.total || 0;

        setTotal(totalCount);
        setItems((prev) => {
          const combined = append ? [...prev, ...newItems] : newItems;
          setHasMore(combined.length < totalCount);
          return combined;
        });
      } catch {
        if (!append) setItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      search,
      sourceId,
      categoryId,
      secCategoryKey,
      cashType,
      dateFrom,
      dateTo,
      sortOrder,
      refreshKey,
    ],
  );

  // Fetch page 1 ONLY when filter parameters or refreshKey change
  useEffect(() => {
    setPage(1);
    fetchFeed(1, false);
  }, [fetchFeed, refreshKey]);

  // Infinite Scroll Handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const bottomThreshold = 150;
    const isBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight <=
      bottomThreshold;

    if (isBottom && hasMore && !loading && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeed(nextPage, true);
    }
  };

  const formatDatetimeBadge = (datetimeStr: string) => {
    const d = new Date(datetimeStr);
    let dayPrefix = "";
    if (isToday(d)) {
      dayPrefix = language === "vi" ? "Hôm nay, " : "Today, ";
    } else if (isYesterday(d)) {
      dayPrefix = language === "vi" ? "Hôm qua, " : "Yesterday, ";
    }
    return `${dayPrefix}${format(d, "HH:mm - dd/MM/yyyy")}`;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3">
      {/* Action Header Bar (No pagination buttons, just total info & batch delete) */}
      <div className="flex items-center justify-between gap-3 shrink-0 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Sparkles className="h-4 w-4 text-sky-500" />
          <span>
            {t("financial.newsfeedHeader")} (<strong>{items.length}</strong> /{" "}
            <strong>{total}</strong>)
          </span>
        </div>

        {/* Delete Selected Button */}
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs font-bold gap-1.5 px-3 rounded-xl animate-in fade-in duration-200"
            onClick={() => handleDeleteConfirm(selectedIds)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("financial.btnDeleteSelected", { count: selectedIds.length })}
          </Button>
        )}
      </div>

      {/* Feed Area (Single Item Per Row, Infinite Scroll) */}
      <div
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3"
      >
        {loading && page === 1 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner className="h-8 w-8 text-sky-500" />
            <p className="text-xs text-slate-400">{t("common.loading")}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            {t("financial.newsfeedEmpty")}
          </div>
        ) : (
          <div className="flex flex-col space-y-3.5 w-full pb-4">
            {items.map((item) => {
              const isIncome = item.cashType === "Income";
              const isSelected = selectedIds.includes(item.id);
              const isIncomplete = checkIsIncomplete(item);
              const missingFields = isIncomplete
                ? getMissingFields(item, language)
                : [];

              return (
                <div
                  key={item.id}
                  className={cn(
                    "bg-white dark:bg-slate-900 border shadow-2xs hover:shadow-md rounded-2xl p-4 transition-all duration-200 space-y-3 relative group w-full",
                    isSelected
                      ? "border-sky-500/80 ring-2 ring-sky-500/20 bg-sky-50/40 dark:bg-sky-950/30"
                      : isIncomplete
                        ? "border-2 border-amber-500 dark:border-amber-400 ring-4 ring-amber-500/20 dark:ring-amber-400/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 shadow-md shadow-amber-500/10"
                        : isIncome
                          ? "border-slate-200/80 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/50"
                          : "border-slate-200/80 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/50",
                  )}
                >
                  {/* Warning Callout Banner for Incomplete Transactions */}
                  {isIncomplete && (
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 text-xs font-black shadow-md hover:brightness-110 transition-all cursor-pointer group/banner border border-amber-300 ring-2 ring-amber-400/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="bg-slate-950 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 animate-bounce">
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                          {language === "vi"
                            ? "CẦN BỔ SUNG"
                            : "ACTION REQUIRED"}
                        </span>
                        <span className="truncate text-slate-950 font-bold">
                          {language === "vi" ? "Thiếu:" : "Missing:"}{" "}
                          <strong className="underline decoration-slate-950 font-black">
                            {missingFields.join(", ")}
                          </strong>
                        </span>
                      </div>
                      <span className="text-[11px] bg-slate-950 text-white px-2.5 py-1 rounded-lg font-extrabold flex items-center gap-1 shrink-0 group-hover/banner:scale-105 transition-transform shadow-xs">
                        {language === "vi"
                          ? "Cập nhật ngay ✏️"
                          : "Update now ✏️"}
                      </span>
                    </button>
                  )}
                  {/* Row 1: Header (Avatar, Title, Datetime, Right Checkbox & Popover Menu) */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                          isIncome
                            ? "bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-emerald-500/20"
                            : "bg-gradient-to-br from-rose-400 to-red-600 text-white shadow-rose-500/20",
                        )}
                      >
                        {isIncome ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {item.title}
                          </h4>
                          {isIncomplete && (
                            <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md shadow-xs animate-pulse border-none">
                              {language === "vi"
                                ? "⚠️ THIẾU THÔNG TIN"
                                : "⚠️ INCOMPLETE"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-400 mt-0.5">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{formatDatetimeBadge(item.datetime)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Controls: Selection Checkbox & Actions Popover */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(item.id)}
                        className="h-4.5 w-4.5 rounded-md"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                          >
                            <MoreVertical className="h-4.5 w-4.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          className="w-38 p-1 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
                        >
                          <button
                            onClick={() => handleEdit(item)}
                            className="w-full flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5 text-sky-500" />
                            {t("financial.modalEditTitle")
                              ? language === "vi"
                                ? "Sửa giao dịch"
                                : "Edit"
                              : language === "vi"
                                ? "Sửa giao dịch"
                                : "Edit"}
                          </button>
                          <button
                            onClick={() => handleDeleteConfirm([item.id])}
                            className="w-full flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            {language === "vi" ? "Xóa giao dịch" : "Delete"}
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Row 2: Prominent Amount */}
                  <div className="py-0.5">
                    <div
                      className={cn(
                        "text-2xl sm:text-3xl font-black tracking-tight",
                        isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {isIncome ? "+" : "-"}
                      {item.amountOfMoney.toLocaleString("vi-VN")} ₫
                    </div>
                  </div>

                  {/* Row 3: Badges (Nguồn tiền, Nhãn chính, Nhãn phụ) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {/* Nguồn tiền */}
                    <Badge
                      variant="outline"
                      className="text-xs font-medium gap-1 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-1 px-2.5"
                    >
                      <Wallet className="h-3.5 w-3.5 text-sky-500" />
                      {item.source?.sourceName ??
                        (language === "vi" ? "Tiền mặt" : "Cash")}
                    </Badge>

                    {/* Nhãn chính */}
                    <Badge
                      variant="outline"
                      className="text-xs font-medium gap-1 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-1 px-2.5"
                    >
                      <FolderKanban className="h-3.5 w-3.5 text-purple-500" />
                      {item.primaryCategory?.categoryName ??
                        (language === "vi" ? "Khác" : "Other")}
                    </Badge>

                    {/* Nhãn phụ */}
                    {item.secondaryCategories.map(({ secondaryCategory }) => (
                      <Badge
                        key={secondaryCategory.id}
                        variant="outline"
                        className={cn(
                          "text-xs font-normal border py-1 px-2.5 rounded-lg",
                          getSecondaryCategoryBadgeClass(
                            secondaryCategory.type,
                          ),
                        )}
                      >
                        {secondaryCategory.categoryName}
                        {secondaryCategory.type !== undefined &&
                          secondaryCategory.type !== null && (
                            <span className="ml-1 opacity-80 font-semibold">
                              [{secondaryCategory.type}]
                            </span>
                          )}
                      </Badge>
                    ))}
                  </div>

                  {/* Row 4: Description Quote Box with Prominent Styling */}
                  {item.description && (
                    <div className="bg-sky-50/80 dark:bg-slate-800/80 p-3.5 rounded-xl border-l-4 border-sky-500 text-sm font-medium text-slate-800 dark:text-slate-100 flex items-start gap-2.5 mt-2 shadow-2xs">
                      <FileText className="h-4.5 w-4.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                      <span className="whitespace-pre-wrap leading-relaxed">
                        {item.description}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom Infinite Scroll Loading Indicator / End Indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4 gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
                <Spinner className="h-4 w-4 text-sky-500" />
                <span>
                  {language === "vi"
                    ? "Đang tải thêm giao dịch..."
                    : "Loading more transactions..."}
                </span>
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <div className="text-center py-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                🎉{" "}
                {language === "vi"
                  ? `Đã hiển thị tất cả ${total} bản tin giao dịch`
                  : `Displayed all ${total} transactions`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
