"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  History,
  Info,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransactionsTableProps {
  transactions?: any[];
  holdings?: any[];
  isLoading?: boolean;
  onRefreshData?: () => void;
}

export function TransactionsManagementTable({
  transactions = [],
  holdings = [],
  isLoading = false,
  onRefreshData,
}: TransactionsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");

  // Delete transaction state
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (dateStr: string | Date) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper map for Asset Lookup
  const assetMap = useMemo(() => {
    const map = new Map<string, any>();
    holdings.forEach((h: any) => {
      if (h.assetId) map.set(h.assetId, h.asset);
    });
    return map;
  }, [holdings]);

  // Statistics calculation
  const stats = useMemo(() => {
    let buyCount = 0;
    let buyValue = 0;
    let sellCount = 0;
    let sellValue = 0;
    let revalCount = 0;

    transactions.forEach((tx: any) => {
      const type = (tx.transactionType || "").toUpperCase();
      const qty = Number(tx.quantity || 0);
      const price = Number(tx.price || 0);
      const val = qty > 0 && price > 0 ? qty * price : price;

      if (type === "BUY" || type === "DEPOSIT" || type === "TRANSFER_IN") {
        buyCount++;
        buyValue += val;
      } else if (type === "SELL" || type === "WITHDRAW" || type === "TRANSFER_OUT") {
        sellCount++;
        sellValue += val;
      } else {
        revalCount++;
      }
    });

    return {
      total: transactions.length,
      buyCount,
      buyValue,
      sellCount,
      sellValue,
      revalCount,
    };
  }, [transactions]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx: any) => {
        const asset = tx.asset || assetMap.get(tx.assetId);
        const ticker = (asset?.symbolOrTicker || "").toLowerCase();
        const assetName = (asset?.assetName || "").toLowerCase();
        const notes = (tx.notes || "").toLowerCase();
        const search = searchQuery.toLowerCase().trim();

        const matchesSearch =
          !search ||
          ticker.includes(search) ||
          assetName.includes(search) ||
          notes.includes(search);

        const type = (tx.transactionType || "").toUpperCase();
        let matchesType = true;
        if (typeFilter !== "ALL") {
          if (typeFilter === "BUY") matchesType = type === "BUY" || type === "DEPOSIT" || type === "TRANSFER_IN";
          else if (typeFilter === "SELL") matchesType = type === "SELL" || type === "WITHDRAW" || type === "TRANSFER_OUT";
          else if (typeFilter === "REVALUATION") matchesType = type === "REVALUATION";
          else if (typeFilter === "DEBT") matchesType = type === "BORROW" || type === "REPAY";
          else if (typeFilter === "LEND") matchesType = type === "LEND" || type === "COLLECT";
        }

        return matchesSearch && matchesType;
      })
      .sort((a: any, b: any) => {
        const timeA = new Date(a.date || a.createdAt).getTime();
        const timeB = new Date(b.date || b.createdAt).getTime();
        return sortOrder === "DESC" ? timeB - timeA : timeA - timeB;
      });
  }, [transactions, searchQuery, typeFilter, sortOrder, assetMap]);

  // Handle Delete Confirmation
  const handleDeleteTransaction = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/wealth/transactions?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          type: "success",
          text: "Đã xóa lịch sử giao dịch thành công!",
        });
        setDeleteTarget(null);
        if (onRefreshData) onRefreshData();
      } else {
        setNotification({
          type: "error",
          text: data.error || "Xóa thất bại. Vui lòng thử lại.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err.message || "Lỗi kết nối khi xóa giao dịch.",
      });
    } finally {
      setDeleting(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const renderBadgeType = (txType: string) => {
    const type = (txType || "").toUpperCase();
    if (type === "BUY" || type === "DEPOSIT" || type === "TRANSFER_IN") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
          <TrendingUp className="h-3 w-3" />
          MUA THÊM
        </span>
      );
    }
    if (type === "SELL" || type === "WITHDRAW" || type === "TRANSFER_OUT") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 w-max">
          <TrendingDown className="h-3 w-3" />
          BÁN BỚT
        </span>
      );
    }
    if (type === "BORROW") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 w-max">
          TẠO KHOẢN NỢ
        </span>
      );
    }
    if (type === "LEND") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1 w-max">
          CHO VAY / TIỀN GỬI
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1 w-max">
        ĐỊNH GIÁ LẠI
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <span>{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary Cards Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Transactions */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-card shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Tổng Giao Dịch
              </div>
              <div className="text-2xl font-black text-foreground mt-1">
                {stats.total}{" "}
                <span className="text-xs font-normal text-muted-foreground">lượt</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center">
              <History className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Buy Volume */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-card shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Tổng Giá Trị Mua ({stats.buyCount})
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatVND(stats.buyValue)}
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Sell Volume */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-card shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Tổng Giá Trị Bán ({stats.sellCount})
              </div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {formatVND(stats.sellValue)}
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Revaluations */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-card shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Định Giá & Khác
              </div>
              <div className="text-2xl font-black text-foreground mt-1">
                {stats.revalCount}{" "}
                <span className="text-xs font-normal text-muted-foreground">bản ghi</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center">
              <Tag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo Ticker, tên tài sản hoặc ghi chú..."
              className="pl-9 bg-background border-slate-200 dark:border-slate-800 text-xs rounded-xl h-9"
            />
          </div>

          {/* Type Filter Selector */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-background border border-slate-200 dark:border-slate-800 text-foreground text-xs rounded-xl px-3 h-9 font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">Tất cả loại giao dịch</option>
            <option value="BUY">🟢 Mua thêm / Nạp vào</option>
            <option value="SELL">🔴 Bán bớt / Rút ra</option>
            <option value="REVALUATION">🔵 Định giá lại</option>
            <option value="DEBT">🟠 Khoản Nợ</option>
            <option value="LEND">🟣 Cho Vay / Tiền Gửi</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Order Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder((prev) => (prev === "DESC" ? "ASC" : "DESC"))}
            className="text-xs font-semibold rounded-xl h-9 gap-1.5 cursor-pointer border-slate-200 dark:border-slate-800"
            title="Đảo chiều sắp xếp thời gian"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{sortOrder === "DESC" ? "Mới nhất trước" : "Cũ nhất trước"}</span>
          </Button>

          {/* Refresh Button */}
          {onRefreshData && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshData}
              disabled={isLoading}
              className="text-xs font-semibold rounded-xl h-9 gap-1.5 cursor-pointer border-slate-200 dark:border-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 pl-4">
                  Thời Gian
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                  Mã / Tên Tài Sản
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                  Loại Giao Dịch
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 text-right">
                  Số Lượng
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 text-right">
                  Đơn Giá
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 text-right">
                  Tổng Giá Trị
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                  Ghi Chú
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider py-3.5 text-center pr-4">
                  Thao Tác
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={8} className="py-4">
                      <Skeleton className="h-6 w-full rounded-lg" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-xs font-medium">
                    {searchQuery || typeFilter !== "ALL"
                      ? "Không tìm thấy giao dịch nào phù hợp với bộ lọc."
                      : "Chưa có lịch sử giao dịch nào được ghi nhận."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx: any) => {
                  const asset = tx.asset || assetMap.get(tx.assetId);
                  const ticker = asset?.symbolOrTicker || tx.assetId?.slice(0, 8) || "N/A";
                  const name = asset?.assetName || "Tài sản";
                  const qty = Number(tx.quantity || 0);
                  const price = Number(tx.price || 0);
                  const totalVal = qty > 0 && price > 0 ? qty * price : price;

                  return (
                    <TableRow
                      key={tx.id}
                      className="border-b border-slate-200/60 dark:border-slate-800/60 hover:bg-muted/40 transition-colors"
                    >
                      {/* Date */}
                      <TableCell className="py-3.5 pl-4 text-xs font-semibold whitespace-nowrap text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          <span>{formatDate(tx.date || tx.createdAt)}</span>
                        </div>
                      </TableCell>

                      {/* Asset Info */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-black">
                            {ticker}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate max-w-[160px]" title={name}>
                            {name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell className="py-3.5">
                        {renderBadgeType(tx.transactionType)}
                      </TableCell>

                      {/* Quantity */}
                      <TableCell className="py-3.5 text-right text-xs font-extrabold text-foreground">
                        {qty > 0 ? qty.toLocaleString("vi-VN") : "-"}
                      </TableCell>

                      {/* Unit Price */}
                      <TableCell className="py-3.5 text-right text-xs font-bold text-muted-foreground whitespace-nowrap">
                        {price > 0 ? formatVND(price) : "-"}
                      </TableCell>

                      {/* Total Value */}
                      <TableCell className="py-3.5 text-right text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {totalVal > 0 ? formatVND(totalVal) : "-"}
                      </TableCell>

                      {/* Notes */}
                      <TableCell className="py-3.5 text-xs text-muted-foreground max-w-[200px] truncate" title={tx.notes || ""}>
                        {tx.notes || "-"}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="py-3.5 pr-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget({ id: tx.id, name: `${ticker} (${formatDate(tx.date)})` })}
                          className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                          title="Xóa bản ghi giao dịch này"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 rounded-2xl p-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase tracking-wider">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <span>Xác Nhận Xóa Giao Dịch</span>
            </div>
            <DialogTitle className="text-base font-bold text-slate-100">
              Bạn có chắc chắn muốn xóa bản ghi giao dịch này không?
            </DialogTitle>
          </DialogHeader>

          {deleteTarget && (
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 space-y-1">
              <div>
                <strong>Giao dịch:</strong> {deleteTarget.name}
              </div>
              <div className="text-[11px] text-amber-400 pt-1 border-t border-slate-700/40">
                ⚠️ Việc xóa bản ghi giao dịch này sẽ ảnh hưởng tới tính toán số lượng lịch sử của tài sản tương ứng.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
              className="text-xs font-bold rounded-xl border-slate-700 hover:bg-slate-800 text-slate-300 cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              size="sm"
              disabled={deleting}
              onClick={handleDeleteTransaction}
              className="text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer gap-1.5"
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xác nhận xóa</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
