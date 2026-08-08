"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusCircle,
  MinusCircle,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  TrendingUp,
  Building2,
  ShieldCheck,
  ExternalLink,
  ArrowUpDown,
  AlertCircle,
  History
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface TableProps {
  holdings?: any[];
  macroCategories?: any[];
  transactions?: any[];
  isLoading?: boolean;
  onOpenFlowA: () => void;
  onOpenFlowB: () => void;
  onOpenImportExport: () => void;
  onRefreshData: () => void;
}

export function AssetManagementTable({
  holdings = [],
  macroCategories = [],
  transactions = [],
  isLoading = false,
  onOpenFlowA,
  onOpenFlowB,
  onOpenImportExport,
  onRefreshData
}: TableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMacroId, setSelectedMacroId] = useState("ALL");
  const [eodSyncing, setEodSyncing] = useState(false);

  // Edit / Revaluation Modal State
  const [editHolding, setEditHolding] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newValuationPrice, setNewValuationPrice] = useState("");
  const [tradeType, setTradeType] = useState<"REVALUATION" | "BUY" | "SELL">("REVALUATION");
  const [tradeQty, setTradeQty] = useState("");
  const [liquidAdjustMode, setLiquidAdjustMode] = useState<"SET" | "ADD" | "SUB">("SET");
  const [liquidDeltaAmount, setLiquidDeltaAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  // Delete / Notification States
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTxTarget, setDeleteTxTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletingTarget, setDeletingTarget] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
  };

  // Filtering
  const filteredHoldings = holdings.filter((h) => {
    const matchesSearch =
      h.asset.symbolOrTicker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.asset.assetName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMacro = selectedMacroId === "ALL" || h.macroCategoryId === selectedMacroId;

    return matchesSearch && matchesMacro;
  });

  const activeHoldings = filteredHoldings.filter((h) => h.quantity > 0);
  const closedHoldings = filteredHoldings.filter((h) => h.quantity <= 0);

  const formatNumberWithDots = (val: string | number) => {
    if (!val && val !== 0) return "";
    const clean = val.toString().replace(/\D/g, "");
    if (!clean) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(clean));
  };

  const parseRawNumber = (val: string) => {
    if (!val) return 0;
    const clean = val.replace(/\D/g, "");
    return Number(clean) || 0;
  };

  // Open Edit Modal
  const handleOpenEdit = (holding: any) => {
    setEditHolding(holding);
    setNewValuationPrice(formatNumberWithDots(holding.averageCostBasis));
    setTradeQty(holding.quantity.toString());
    setTradeType("REVALUATION");
    setLiquidAdjustMode("SET");
    setLiquidDeltaAmount("");
    setEditModalOpen(true);
  };

  const handleTradeTypeChange = (newType: "REVALUATION" | "BUY" | "SELL") => {
    setTradeType(newType);
    if (!editHolding) return;

    if (newType === "REVALUATION") {
      setNewValuationPrice(formatNumberWithDots(editHolding.averageCostBasis));
    } else if (newType === "BUY") {
      setNewValuationPrice(formatNumberWithDots(editHolding.currentMarketPrice || editHolding.averageCostBasis));
    } else if (newType === "SELL") {
      const isStock = editHolding.macroCategory?.code === "STOCKS";
      const sellDefaultPrice = isStock
        ? (editHolding.currentMarketPrice || editHolding.averageCostBasis)
        : editHolding.averageCostBasis;
      setNewValuationPrice(formatNumberWithDots(sellDefaultPrice));
    }
  };

  // Submit Edit
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHolding) return;

    setSavingEdit(true);
    setNotificationBanner(null);
    try {
      const isCustomSingleUnit = editHolding.macroCategory?.code !== "STOCKS";
      const isLiquid = editHolding.macroCategory?.code === "LIQUID";

      let parsedPrice = parseRawNumber(newValuationPrice);

      if (isLiquid) {
        const baseBalance = editHolding.averageCostBasis || 0;
        const delta = parseRawNumber(liquidDeltaAmount);
        if (liquidAdjustMode === "ADD") {
          parsedPrice = baseBalance + delta;
        } else if (liquidAdjustMode === "SUB") {
          parsedPrice = Math.max(0, baseBalance - delta);
        }
      }

      const parsedQty = isCustomSingleUnit ? 1 : parseFloat(tradeQty.replace(",", ".")) || 0;

      const payload =
        tradeType === "REVALUATION"
          ? {
              holdingId: editHolding.id,
              actionType: "REVALUATION",
              newPrice: parsedPrice,
              newQuantity: isLiquid ? 1 : editHolding.quantity
            }
          : {
              holdingId: editHolding.id,
              actionType: "TRADE",
              tradeType,
              tradePrice: parsedPrice,
              tradeQuantity: parsedQty
            };

      const res = await fetch("/api/wealth/holdings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEditModalOpen(false);
      setNotificationBanner({
        type: "success",
        text: `Đã cập nhật ${tradeType === "SELL" ? "giao dịch BÁN" : "định giá"} tài sản ${editHolding.asset.assetName} thành công!`
      });
      onRefreshData();
    } catch (err: any) {
      setNotificationBanner({
        type: "error",
        text: err.message || "Lỗi khi cập nhật tài sản"
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // Execute delete holding after confirmation modal
  const handleConfirmDeleteHolding = async () => {
    if (!deleteConfirmTarget) return;

    setDeletingTarget(true);
    setNotificationBanner(null);
    try {
      const res = await fetch(`/api/wealth/holdings?id=${deleteConfirmTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotificationBanner({
        type: "success",
        text: `Đã xóa tài sản "${deleteConfirmTarget.name}" khỏi danh mục!`
      });
      setDeleteConfirmTarget(null);
      onRefreshData();
    } catch (err: any) {
      setNotificationBanner({
        type: "error",
        text: err.message || "Lỗi khi xóa tài sản"
      });
    } finally {
      setDeletingTarget(false);
    }
  };

  // Execute delete transaction history after confirmation modal
  const handleConfirmDeleteTx = async () => {
    if (!deleteTxTarget) return;

    setDeletingTarget(true);
    setNotificationBanner(null);
    try {
      const res = await fetch(`/api/wealth/transactions?id=${deleteTxTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotificationBanner({
        type: "success",
        text: `Đã xóa lịch sử giao dịch bán của "${deleteTxTarget.name}" khỏi Database!`
      });
      setDeleteTxTarget(null);
      onRefreshData();
    } catch (err: any) {
      setNotificationBanner({
        type: "error",
        text: err.message || "Lỗi khi xóa lịch sử giao dịch"
      });
    } finally {
      setDeletingTarget(false);
    }
  };

  const sellTransactions = (transactions || []).filter((t) => t.transactionType === "SELL");

  return (
    <div className="space-y-4">
      {/* Notification Banner */}
      {notificationBanner && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-3 border shadow-xs animate-in fade-in slide-in-from-top-1 ${
            notificationBanner.type === "success"
              ? "bg-emerald-500/10 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationBanner.type === "success" ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{notificationBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificationBanner(null)}
            className="text-xs font-bold shrink-0 px-1 cursor-pointer opacity-80 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-2 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm tài sản theo Ticker hoặc Tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <select
              value={selectedMacroId}
              onChange={(e) => setSelectedMacroId(e.target.value)}
              className="h-9 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-sky-500 font-semibold"
            >
              <option value="ALL">Tất cả Cấp Macro</option>
              {macroCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/80">
              <TableRow>
                <TableHead className="text-xs font-extrabold uppercase">Mã / Tên Tài Sản</TableHead>
                <TableHead className="text-xs font-extrabold uppercase">Cấp Danh Mục</TableHead>
                <TableHead className="text-xs font-extrabold uppercase text-right">Số Lượng</TableHead>
                <TableHead className="text-xs font-extrabold uppercase text-right">Giá Vốn TB</TableHead>
                <TableHead className="text-xs font-extrabold uppercase text-right">Giá Thị Trường EOD</TableHead>
                <TableHead className="text-xs font-extrabold uppercase text-right">Tổng Giá Trị Hiện Tại</TableHead>
                <TableHead className="text-xs font-extrabold uppercase text-center">Trạng Thái</TableHead>
                <TableHead className="text-xs font-extrabold uppercase text-center">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="animate-pulse">
                    <TableCell className="py-3"><Skeleton className="h-8 w-36 rounded-xl" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-5 w-24 rounded-lg bg-sky-500/20" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-5 w-16 rounded-lg ms-auto" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-5 w-24 rounded-lg ms-auto" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-5 w-24 rounded-lg ms-auto" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-5 w-28 rounded-lg ms-auto" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-5 w-16 rounded-lg ms-auto" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-8 w-20 rounded-xl ms-auto" /></TableCell>
                  </TableRow>
                ))
              ) : activeHoldings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground font-medium">
                    Chưa có tài sản đang sở hữu nào phù hợp điều kiện lọc. Vui lòng nhấn nút "+ Thêm tài sản" để thêm mới!
                  </TableCell>
                </TableRow>
              ) : (
                activeHoldings.map((h) => {
                  const pnl = (h.currentMarketPrice - h.averageCostBasis) * h.quantity;
                  const isProfit = pnl >= 0;

                  return (
                    <TableRow key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="font-bold text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {h.asset.symbolOrTicker.slice(0, 3)}
                          </div>
                          <div>
                            <div className="text-slate-900 dark:text-slate-100 flex items-center gap-1">
                              <span>{h.asset.symbolOrTicker}</span>
                              {h.asset.isMarketDriven ? (
                                <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-extrabold">
                                  MARKET
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold">
                                  CUSTOM
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-normal truncate max-w-[180px]">
                              {h.asset.assetName}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-bold text-sky-700 dark:text-sky-400">{h.macroCategory?.name || "Gia sản"}</div>
                      </TableCell>

                      <TableCell className="text-xs font-bold text-right">
                        {h.quantity.toLocaleString("vi-VN", { maximumFractionDigits: 6 })}
                      </TableCell>

                      <TableCell className="text-xs text-right font-medium">
                        {formatVND(h.averageCostBasis)}
                      </TableCell>

                      <TableCell className="text-xs text-right font-bold">
                        {h.macroCategory?.code === "STOCKS" ? (
                          formatVND(h.currentMarketPrice)
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-right">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">
                          {formatVND(h.macroCategory?.code === "STOCKS" ? h.currentValue : h.quantity * h.averageCostBasis)}
                        </div>
                        {h.macroCategory?.code === "STOCKS" && (
                          <div className={`text-[10px] font-bold ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {isProfit ? "+" : ""}{formatVND(pnl)}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {h.linkedLiability ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            Thế chấp nợ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Rảnh rỗi
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            onClick={() => handleOpenEdit(h)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirmTarget({ id: h.id, name: h.asset.assetName || h.asset.symbolOrTicker })}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Sell Transaction History Section */}
      {sellTransactions.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-md overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-600 shrink-0" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Lịch Sử Giao Dịch Bán / Tất Toán Tài Sản
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {sellTransactions.length}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-normal">
              Bảng lưu trữ giao dịch bán: Ghi nhận Giá vốn TB, Giá bán khớp & Lời/Lỗ thực tế (PnL).
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100/80 dark:bg-slate-800/80">
                <TableRow>
                  <TableHead className="text-xs font-extrabold uppercase">Ngày GD</TableHead>
                  <TableHead className="text-xs font-extrabold uppercase">Mã / Tên Tài Sản Bán</TableHead>
                  <TableHead className="text-xs font-extrabold uppercase">Cấp Danh Mục Macro</TableHead>
                  <TableHead className="text-xs font-extrabold uppercase text-right">SL Bán</TableHead>
                  <TableHead className="text-xs font-extrabold uppercase text-right">Giá Vốn TB Ban Đầu</TableHead>
                  <TableHead className="text-xs font-extrabold uppercase text-right">Giá Bán Khớp</TableHead>
                  <TableHead className="text-xs font-extrabold uppercase text-right">Lời / Lỗ (Realized PnL)</TableHead>
                  <TableHead className="text-xs font-extrabold uppercase text-center">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sellTransactions.map((tx) => {
                  const qty = tx.quantity || 1;
                  const price = tx.price || 0;
                  const cost = tx.costBasis || 0;
                  const pnl = (price - cost) * qty;
                  const isProfit = pnl >= 0;

                  return (
                    <TableRow key={tx.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {new Date(tx.date || tx.createdAt).toLocaleDateString("vi-VN")}
                      </TableCell>

                      <TableCell className="font-bold text-xs">
                        <div className="text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{tx.asset?.assetName || tx.asset?.symbolOrTicker || "Tài sản"}</span>
                          <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold">
                            BÁN
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {tx.asset?.symbolOrTicker}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-semibold text-sky-700 dark:text-sky-400">
                          {tx.macroCategory?.name || "Gia sản"}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-bold text-right">
                        {qty.toLocaleString()}
                      </TableCell>

                      <TableCell className="text-xs text-right font-medium">
                        {formatVND(cost)}
                      </TableCell>

                      <TableCell className="text-xs text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatVND(price)}
                      </TableCell>

                      <TableCell className="text-xs text-right">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
                          isProfit ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}>
                          {isProfit ? "+" : ""}{formatVND(pnl)}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        <Button
                          onClick={() => setDeleteTxTarget({ id: tx.id, name: tx.asset?.assetName || tx.asset?.symbolOrTicker })}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold gap-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                          title="Xóa lịch sử giao dịch này khỏi Database"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Xóa lịch sử</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Edit / Revaluation Modal */}
      {editHolding && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Edit className="h-5 w-5 text-sky-600" />
                <span>Cập Nhật / Giao Dịch: {editHolding.asset.assetName}</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmitEdit} className="space-y-4 pt-2">
              {/* Dynamic Action Tabs per Macro Category */}
              {editHolding.macroCategory?.code === "STOCKS" ? (
                <div className="grid grid-cols-3 p-1 bg-muted rounded-xl gap-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleTradeTypeChange("REVALUATION")}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                      tradeType === "REVALUATION" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    Định Giá Lại
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTradeTypeChange("BUY")}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                      tradeType === "BUY" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    Mua Thêm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTradeTypeChange("SELL")}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                      tradeType === "SELL" ? "bg-rose-600 text-white shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    Bán Bớt
                  </button>
                </div>
              ) : editHolding.macroCategory?.code === "LIQUID" ? (
                <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs font-bold text-sky-600 dark:text-sky-400 text-center">
                  Tài Sản Thanh Khoản (Tiền Mặt/Tiền Gửi) — Điều Chỉnh & Định Giá Lại
                </div>
              ) : (
                <div className="grid grid-cols-2 p-1 bg-muted rounded-xl gap-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleTradeTypeChange("REVALUATION")}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                      tradeType === "REVALUATION" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    Định Giá Lại
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTradeTypeChange("SELL")}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                      tradeType === "SELL" ? "bg-rose-600 text-white shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    Bán Bớt
                  </button>
                </div>
              )}

              {/* Form Input Controls */}
              {editHolding.macroCategory?.code === "LIQUID" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 p-1 bg-slate-900/60 rounded-xl gap-1 text-xs font-bold border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setLiquidAdjustMode("SET");
                        setLiquidDeltaAmount("");
                      }}
                      className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        liquidAdjustMode === "SET"
                          ? "bg-sky-500 text-white shadow-md font-extrabold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Đặt Số Dư Mới</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLiquidAdjustMode("ADD");
                        setLiquidDeltaAmount("");
                      }}
                      className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        liquidAdjustMode === "ADD"
                          ? "bg-emerald-500 text-white shadow-md font-extrabold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>+ Cộng Thêm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLiquidAdjustMode("SUB");
                        setLiquidDeltaAmount("");
                      }}
                      className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        liquidAdjustMode === "SUB"
                          ? "bg-rose-500 text-white shadow-md font-extrabold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <MinusCircle className="h-3.5 w-3.5" />
                      <span>- Trừ Bớt</span>
                    </button>
                  </div>

                  {liquidAdjustMode === "SET" ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Số Dư Tiền Mặt / Tiền Gửi Mới (VND)
                      </label>
                      <Input
                        type="text"
                        value={newValuationPrice}
                        onChange={(e) => setNewValuationPrice(formatNumberWithDots(e.target.value))}
                        className="h-11 text-xs rounded-xl font-bold text-sky-600 dark:text-sky-400"
                        required
                      />
                    </div>
                  ) : liquidAdjustMode === "ADD" ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Số Tiền Nạp / Cộng Thêm (+)
                        </label>
                        <Input
                          type="text"
                          placeholder="Ví dụ: 5.000.000"
                          value={liquidDeltaAmount}
                          onChange={(e) => setLiquidDeltaAmount(formatNumberWithDots(e.target.value))}
                          className="h-11 text-xs rounded-xl font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 focus:border-emerald-500"
                          required
                        />
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium space-y-1.5">
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Số dư hiện tại:</span>
                          <span className="font-bold">{formatVND(editHolding.averageCostBasis)}</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                          <span>Cộng thêm (+):</span>
                          <span className="font-extrabold">+ {formatVND(parseRawNumber(liquidDeltaAmount))}</span>
                        </div>
                        <div className="border-t border-emerald-500/20 pt-1.5 flex justify-between items-center font-extrabold text-sm">
                          <span className="text-slate-800 dark:text-slate-200">Số dư mới sau khi cộng:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatVND(editHolding.averageCostBasis + parseRawNumber(liquidDeltaAmount))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          Số Tiền Rút / Trừ Bớt (-)
                        </label>
                        <Input
                          type="text"
                          placeholder="Ví dụ: 2.000.000"
                          value={liquidDeltaAmount}
                          onChange={(e) => setLiquidDeltaAmount(formatNumberWithDots(e.target.value))}
                          className="h-11 text-xs rounded-xl font-bold text-rose-600 dark:text-rose-400 border-rose-500/40 focus:border-rose-500"
                          required
                        />
                      </div>

                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium space-y-1.5">
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Số dư hiện tại:</span>
                          <span className="font-bold">{formatVND(editHolding.averageCostBasis)}</span>
                        </div>
                        <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                          <span>Trừ bớt (-):</span>
                          <span className="font-extrabold">- {formatVND(parseRawNumber(liquidDeltaAmount))}</span>
                        </div>
                        <div className="border-t border-rose-500/20 pt-1.5 flex justify-between items-center font-extrabold text-sm">
                          <span className="text-slate-800 dark:text-slate-200">Số dư mới sau khi trừ:</span>
                          <span className="text-rose-600 dark:text-rose-400">
                            {formatVND(Math.max(0, editHolding.averageCostBasis - parseRawNumber(liquidDeltaAmount)))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : tradeType === "REVALUATION" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">
                    Định Giá Hiện Tại Ước Tính
                  </label>
                  <Input
                    type="text"
                    value={newValuationPrice}
                    onChange={(e) => setNewValuationPrice(formatNumberWithDots(e.target.value))}
                    className="h-10 text-xs rounded-xl font-bold"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {editHolding.macroCategory?.code === "STOCKS" && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold">Số Lượng {tradeType === "BUY" ? "Mua Thêm" : "Bán Bớt"}</label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ví dụ: 820.5 hoặc 0.05"
                        value={tradeQty}
                        onChange={(e) => setTradeQty(e.target.value.replace(",", "."))}
                        className="h-10 text-xs rounded-xl font-bold"
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold">Giá Khớp Giao Dịch</label>
                    <Input
                      type="text"
                      value={newValuationPrice}
                      onChange={(e) => setNewValuationPrice(formatNumberWithDots(e.target.value))}
                      className="h-10 text-xs rounded-xl font-bold"
                      required
                    />
                    {tradeType === "SELL" && (
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                        💡 Số tiền bán thu về sẽ được tự động cộng + vào Tài sản thanh khoản.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={savingEdit}
                className="w-full h-10 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-md cursor-pointer"
              >
                {savingEdit ? "Đang lưu..." : "Xác Nhận Cập Nhật"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <Dialog open={!!deleteConfirmTarget} onOpenChange={(open) => !open && setDeleteConfirmTarget(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
                <span>Xác Nhận Xóa Tài Sản</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Bạn có chắc chắn muốn xóa tài sản <strong className="text-rose-600 dark:text-rose-400">{deleteConfirmTarget.name}</strong> khỏi danh mục không?
                Hành động này sẽ xóa toàn bộ số dư và lịch sử giao dịch liên quan đến tài sản này.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteConfirmTarget(null)}
                  disabled={deletingTarget}
                  className="h-9 px-4 text-xs font-bold rounded-xl"
                >
                  Hủy Thao Tác
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDeleteHolding}
                  disabled={deletingTarget}
                  className="h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer"
                >
                  {deletingTarget ? "Đang xóa..." : "Xác Nhận Xóa Vĩnh Viễn"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Transaction History Modal */}
      {deleteTxTarget && (
        <Dialog open={!!deleteTxTarget} onOpenChange={(open) => !open && setDeleteTxTarget(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
                <span>Xóa Lịch Sử Giao Dịch Bán</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Bạn có chắc chắn muốn xóa bản ghi lịch sử bán tài sản <strong className="text-rose-600 dark:text-rose-400">{deleteTxTarget.name}</strong> khỏi Database không?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteTxTarget(null)}
                  disabled={deletingTarget}
                  className="h-9 px-4 text-xs font-bold rounded-xl"
                >
                  Hủy Thao Tác
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDeleteTx}
                  disabled={deletingTarget}
                  className="h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer"
                >
                  {deletingTarget ? "Đang xóa..." : "Xóa Lịch Sử"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
