"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Wallet,
  TrendingUp,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Scale,
} from "lucide-react";

interface ChartPointDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pointData: {
    dateLabel: string;
    formattedDate: string;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    A: number; // Liquid cash
    B: number; // Growth holdings total
    C: number; // Other assets - liabilities
    growthItems: Array<{
      id: string;
      name: string;
      symbol: string;
      quantity: number;
      priceAtX: number;
      totalValueAtX: number;
    }>;
    otherAssetsValue: number;
    netCashFlowAfter: number;
  } | null;
}

export function ChartPointDetailModal({
  open,
  onOpenChange,
  pointData,
}: ChartPointDetailModalProps) {
  if (!pointData) return null;

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const {
    dateLabel,
    formattedDate,
    netWorth,
    totalAssets,
    totalLiabilities,
    A,
    B,
    C,
    growthItems,
    otherAssetsValue,
    netCashFlowAfter,
  } = pointData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <DialogHeader className="space-y-1.5 text-left pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-extrabold uppercase tracking-wider">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Chi Tiết Điểm Dữ Liệu Gia Sản ({dateLabel})</span>
          </div>
          <DialogTitle className="text-base sm:text-xl font-black text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Báo Cáo Bóc Tách Định Giá tại {formattedDate}</span>
          </DialogTitle>
          <p className="text-xs text-slate-400 font-medium">
            Minh bạch chi tiết từng thành phần tài sản thanh khoản, danh mục đầu tư và các khoản nợ để tính ra con số chốt tại mốc này.
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Main Net Worth Banner Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-950/60 via-slate-900 to-blue-950/40 border border-sky-800/40 shadow-inner space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-sky-300 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                Tổng Gia Sản Ròng Chốt Mốc
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Công thức: A + B + C
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatVND(netWorth)}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 pt-1 border-t border-sky-900/40">
              <div>
                <span>Tổng Tài Sản: </span>
                <span className="text-slate-200">{formatVND(totalAssets)}</span>
              </div>
              <div>
                <span>Tổng Nợ: </span>
                <span className="text-rose-400">{formatVND(totalLiabilities)}</span>
              </div>
            </div>
          </div>

          {/* Component A: Liquid Cash */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="h-4 w-4" />
                1. Thành phần A: Tài Sản Thanh Khoản (Tiền mặt & Ngân hàng)
              </h3>
              <span className="text-xs font-black text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {formatVND(A)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Số dư khả dụng chốt tại mốc này:</span>
                <span className="font-bold text-slate-100">{formatVND(A)}</span>
              </div>
              {netCashFlowAfter !== 0 && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/40">
                  <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>
                    Đã trừ {formatVND(Math.abs(netCashFlowAfter))} dòng tiền {netCashFlowAfter > 0 ? "Thu" : "Chi"} ròng phát sinh từ mốc này đến nay.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Component B: Growth Assets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                2. Thành phần B: Danh Mục Đầu Tư Tăng Trưởng (Định giá Mark-to-Market)
              </h3>
              <span className="text-xs font-black text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {formatVND(B)}
              </span>
            </div>

            {growthItems.length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {growthItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs hover:border-slate-600 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.symbol && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-700 text-[10px] text-emerald-400 font-mono font-extrabold">
                            {item.symbol}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Số lượng: <strong className="text-slate-300">{item.quantity.toLocaleString("vi-VN")}</strong> • Đơn giá chốt mốc: <strong className="text-slate-300">{formatVND(item.priceAtX)}</strong>
                      </div>
                    </div>
                    <div className="font-extrabold text-emerald-400 text-sm">
                      {formatVND(item.totalValueAtX)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 text-center">
                Không có tài sản đầu tư tăng trưởng tại mốc này.
              </div>
            )}
          </div>

          {/* Component C: Other Assets & Liabilities */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                3. Thành phần C: Tài Sản Cố Định Khác & Nợ Phải Trả
              </h3>
              <span className="text-xs font-black text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                {formatVND(C)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span>Tài sản cố định khác (Nhà đất / Xe / Phải thu):</span>
                <span className="font-bold text-slate-100">{formatVND(otherAssetsValue)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Tổng nợ phải trả tại mốc:</span>
                <span className="font-bold text-rose-400">-{formatVND(totalLiabilities)}</span>
              </div>
            </div>
          </div>

          {/* Reconciliation Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-sky-400 uppercase tracking-wider">
              <Scale className="h-4 w-4" />
              <span>Tổng Kết Cân Bằng Định Giá (A + B + C)</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>+ Thành phần A (Thanh khoản):</span>
                <span className="font-mono font-bold text-amber-400">{formatVND(A)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>+ Thành phần B (Đầu tư tăng trưởng):</span>
                <span className="font-mono font-bold text-emerald-400">{formatVND(B)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>+ Thành phần C (Tài sản khác & Nợ):</span>
                <span className="font-mono font-bold text-purple-400">{formatVND(C)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-black text-sm text-slate-100">
                <span>🎯 TỔNG GIA SẢN RÒNG CHỐT:</span>
                <span className="font-mono text-sky-400">{formatVND(netWorth)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
