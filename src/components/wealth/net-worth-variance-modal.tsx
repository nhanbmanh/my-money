"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryConfig } from "@/lib/asset-category-types";
import { getStartOfTodayVN } from "@/lib/date-utils";

interface NetWorthVarianceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: any;
  previousNetWorth: number;
  netWorthChangeAmount: number;
  netWorthChangePercent: number;
  compareLabel: string;
  holdings?: any[];
  liabilities?: any[];
  transactions?: any[];
  cashFlows?: any[];
  snapshots?: any[];
}

export function NetWorthVarianceModal({
  open,
  onOpenChange,
  summary,
  previousNetWorth: propsPreviousNetWorth,
  netWorthChangeAmount: propsNetWorthChangeAmount,
  netWorthChangePercent: propsNetWorthChangePercent,
  compareLabel: propsCompareLabel,
  holdings = [],
  liabilities = [],
  transactions = [],
  cashFlows = [],
  snapshots = [],
}: NetWorthVarianceModalProps) {
  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // 1. Baseline start of today (00:00:00 Vietnam Time)
  const startOfToday = useMemo(() => getStartOfTodayVN(), []);

  const compareLabel = propsCompareLabel || "Trong ngày (từ 00:00 VNT)";

  // 2. Filter Cashflows created TODAY (since 00:00:00 local time today)
  const { todayIncome, todayExpense, todayNetCashFlow, timeframeCashFlows } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const list: any[] = [];

    (cashFlows || []).forEach((cf: any) => {
      const cfDate = new Date(cf.datetime || cf.createdAt);
      if (cfDate >= startOfToday) {
        const amt = Number(cf.amountOfMoney || 0);
        if (cf.cashType === "Income") {
          income += amt;
        } else {
          expense += amt;
        }
        list.push(cf);
      }
    });

    return {
      todayIncome: income,
      todayExpense: expense,
      todayNetCashFlow: income - expense,
      timeframeCashFlows: list,
    };
  }, [cashFlows, startOfToday]);

  const todaySnapshot = useMemo(() => {
    const list = (snapshots || []).filter((s: any) => new Date(s.date) >= startOfToday);
    return list.length > 0 ? list[0] : null;
  }, [snapshots, startOfToday]);

  // 3. Yesterday's Snapshot (recorded before 00:00:00 VNT today)
  const yesterdaySnapshot = useMemo(() => {
    const list = (snapshots || []).filter((s: any) => new Date(s.date) < startOfToday);
    return list.length > 0 ? list[list.length - 1] : null;
  }, [snapshots, startOfToday]);

  const currentNetWorth = Number(summary?.netWorth || 0);

  // 4. Map holdings and calculate actual 24h market price variance (Day T vs Day T-1 closing price)
  const allHoldingItems = useMemo(() => {
    const baselineSnapshot = yesterdaySnapshot;

    let snapshotHoldingsMap: Record<string, any> = {};
    if (baselineSnapshot && baselineSnapshot.breakdownJson) {
      const json = baselineSnapshot.breakdownJson;
      const list = Array.isArray(json) ? json : json.holdings || [];
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          if (item.id) snapshotHoldingsMap[item.id] = item;
          if (item.assetId) snapshotHoldingsMap[item.assetId] = item;
        });
      }
    }

    return (holdings || []).map((h) => {
      const quantity = Number(h.quantity || 0);
      const currentVal = Number(h.currentValue || 0);
      const currentUnitPrice = Number(h.currentMarketPrice || h.averageCostBasis || 0);
      const catCfg = getCategoryConfig(h.categoryType ?? 0);
      const snapItem = snapshotHoldingsMap[h.id] || snapshotHoldingsMap[h.assetId];

      let oneDayChange = 0;
      let oneDayChangePercent = 0;

      if (snapItem) {
        const yesterdayPrice = Number(snapItem.currentMarketPrice || snapItem.averageCostBasis || 0);
        if (yesterdayPrice > 0 && currentUnitPrice > 0) {
          const priceDelta = currentUnitPrice - yesterdayPrice;
          oneDayChange = Math.round(priceDelta * quantity);
          oneDayChangePercent = (priceDelta / yesterdayPrice) * 100;
        } else {
          const snapVal = Number(snapItem.currentValue || 0);
          let diff = currentVal - snapVal;
          if (h.categoryType === 0) diff -= todayNetCashFlow;
          oneDayChange = Math.round(diff);
          oneDayChangePercent = snapVal > 0 ? (diff / snapVal) * 100 : 0;
        }
      } else {
        // Fallback to 24h ticker change if no yesterday snapshot item exists for this holding
        const change24hPercent = Number(h.change24h || 0);
        if (change24hPercent !== 0 && currentUnitPrice > 0) {
          const previousUnitPrice = currentUnitPrice / (1 + change24hPercent / 100);
          const navDeltaPerUnit = currentUnitPrice - previousUnitPrice;
          oneDayChange = Math.round(navDeltaPerUnit * quantity);
          oneDayChangePercent = change24hPercent;
        }
      }

      return {
        id: h.id,
        name: h.asset?.assetName || h.asset?.symbolOrTicker || "Tài sản",
        symbol: h.asset?.symbolOrTicker || "",
        categoryType: h.categoryType,
        catCfg,
        oneDayChange,
        change24hPercent: oneDayChangePercent,
      };
    });
  }, [holdings, yesterdaySnapshot, todayNetCashFlow]);

  // Filter ONLY market-driven investment items (categoryType !== 0) to avoid double-counting cashflows
  const portfolioAttribution = useMemo(() => {
    return allHoldingItems
      .filter((item) => item.categoryType !== 0 && item.symbol !== "CASH_VND" && item.oneDayChange !== 0)
      .sort((a, b) => Math.abs(b.oneDayChange) - Math.abs(a.oneDayChange));
  }, [allHoldingItems]);

  const sumPortfolioAttribution = useMemo(() => {
    return portfolioAttribution.reduce((sum, item) => sum + item.oneDayChange, 0);
  }, [portfolioAttribution]);

  // 5. Absolute Net Worth Reconciliation
  const { previousNetWorth, netWorthChangeAmount, portfolioMarketChange } = useMemo(() => {
    const totalChange = sumPortfolioAttribution + todayNetCashFlow;
    const prev = currentNetWorth - totalChange;

    return {
      previousNetWorth: prev,
      netWorthChangeAmount: totalChange,
      portfolioMarketChange: sumPortfolioAttribution,
    };
  }, [currentNetWorth, todayNetCashFlow, sumPortfolioAttribution]);

  const rawChangePercent = previousNetWorth > 0 ? (netWorthChangeAmount / previousNetWorth) * 100 : 0;
  const netWorthChangePercent = Math.abs(rawChangePercent) < 0.01 ? 0 : rawChangePercent;

  const isPositive = netWorthChangeAmount >= 0;
  const isPortfolioPositive = sumPortfolioAttribution >= 0;
  const isCashFlowPositive = todayNetCashFlow >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="space-y-1.5 text-left pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-extrabold uppercase tracking-wider">
            <Scale className="h-4 w-4 shrink-0" />
            <span>Báo Cáo Bóc Tách Biến Động Gia Sản Ròng</span>
          </div>
          <DialogTitle className="text-base sm:text-xl font-black text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Chi Tiết Biến Động ({compareLabel})</span>
            <span
              className={cn(
                "w-fit text-xs sm:text-sm font-extrabold px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1 shrink-0 self-start sm:self-auto",
                isPositive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
              )}
            >
              {isPositive ? <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              {isPositive ? "+" : ""}
              {formatVND(netWorthChangeAmount)} ({netWorthChangePercent >= 0 ? "+" : ""}
              {netWorthChangePercent.toFixed(1)}%)
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Minh bạch thực tế các tài sản biến động định giá và dòng tiền phát sinh trong kỳ.
          </DialogDescription>
        </DialogHeader>

        {/* Period Comparison Bar - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 my-3 sm:my-4 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-800/60 border border-slate-800 text-center">
          <div className="flex sm:flex-col justify-between sm:justify-center items-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Snapshot kỳ trước</div>
            <div className="text-xs font-bold text-slate-200">{formatVND(previousNetWorth)}</div>
          </div>
          <div className="border-y sm:border-y-0 sm:border-x border-slate-700/60 py-1.5 sm:py-0 px-2 flex sm:flex-col justify-between sm:justify-center items-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Tổng biến động ròng</div>
            <div
              className={cn(
                "text-xs font-extrabold",
                isPositive ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {isPositive ? "+" : ""}
              {formatVND(netWorthChangeAmount)}
            </div>
          </div>
          <div className="flex sm:flex-col justify-between sm:justify-center items-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Gia sản hiện tại</div>
            <div className="text-xs font-bold text-sky-400">{formatVND(currentNetWorth)}</div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {/* Section 1: Portfolio Market Variance */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>1. Định Giá Thị Trường ({portfolioAttribution.length} Mục Có Biến Động)</span>
              </span>
              <span
                className={cn(
                  "w-fit text-[11px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-lg border self-start sm:self-auto",
                  isPortfolioPositive
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                )}
              >
                Tác động định giá: {isPortfolioPositive ? "+" : ""}
                {formatVND(sumPortfolioAttribution)}
              </span>
            </div>

            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              {portfolioAttribution.length === 0 ? (
                <div className="text-[11px] text-slate-400 text-center py-2.5">
                  Không có tài sản nào biến động giá trị trong kỳ này.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {portfolioAttribution.map((item) => {
                    const isGain = item.oneDayChange >= 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs py-2 px-2.5 sm:px-3 rounded-xl bg-slate-900/80 border border-slate-800/50 gap-2"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 truncate pr-1 min-w-0 flex-1">
                          <span className={cn("px-1.5 py-0.5 rounded text-[9px] border font-bold shrink-0", item.catCfg.badgeBg)}>
                            {item.catCfg.type}. {item.catCfg.shortName}
                          </span>
                          <span className="text-slate-100 font-extrabold text-xs shrink-0">{item.symbol}</span>
                          <span className="text-[11px] text-slate-400 font-normal truncate max-w-[120px] sm:max-w-[180px] hidden xs:inline">
                            ({item.name})
                          </span>
                        </div>

                        <div className="text-right shrink-0 ml-auto">
                          <div
                            className={cn(
                              "font-extrabold text-xs flex items-center justify-end gap-0.5",
                              isGain ? "text-emerald-400" : "text-rose-400"
                            )}
                          >
                            {isGain ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0" /> : <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />}
                            {isGain ? "+" : ""}
                            {formatVND(item.oneDayChange)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {item.change24hPercent >= 0 ? "+" : ""}{item.change24hPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Cashflows in Timeframe */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Wallet className="h-4 w-4 shrink-0" />
                <span>2. Giao Dịch Thu / Chi Mới Phát Sinh Trong Kỳ</span>
              </span>
              <span
                className={cn(
                  "w-fit text-[11px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-lg border self-start sm:self-auto",
                  isCashFlowPositive
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                )}
              >
                Dòng tiền ròng trong kỳ: {isCashFlowPositive ? "+" : ""}
                {formatVND(todayNetCashFlow)}
              </span>
            </div>

            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              {timeframeCashFlows.length === 0 ? (
                <div className="text-[11px] text-slate-400 text-center py-2 space-y-0.5">
                  <p>Không có giao dịch Thu/Chi mới phát sinh trong kỳ này.</p>
                  <p className="text-[10px] text-slate-500">
                    Toàn bộ biến động gia sản ròng kỳ này do thay đổi định giá thị trường danh mục đầu tư.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {timeframeCashFlows.map((cf: any) => {
                    const isIncome = cf.cashType === "Income";
                    return (
                      <div
                        key={cf.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-900/80 border border-slate-800/50 gap-2"
                      >
                        <div className="flex items-center gap-2 truncate pr-2 min-w-0 flex-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                            {cf.primaryCategory?.categoryName || "Thu/Chi"}
                          </span>
                          <span className="truncate text-slate-300 font-medium">{cf.title}</span>
                        </div>
                        <span
                          className={cn(
                            "font-bold shrink-0 text-xs ml-auto",
                            isIncome ? "text-emerald-400" : "text-rose-400"
                          )}
                        >
                          {isIncome ? "+" : "-"}
                          {formatVND(cf.amountOfMoney)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Summary Reconciliation */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-2">
            <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs sm:text-sm">
              <CheckCircle2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-emerald-400 shrink-0" />
              <span>Tổng Kết Cân Bằng Cân Đối Biến Động</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-0.5 border-b border-sky-500/20 gap-0.5">
                <span>• Biến động định giá thị trường danh mục đầu tư:</span>
                <strong className={isPortfolioPositive ? "text-emerald-400" : "text-rose-400"}>
                  {isPortfolioPositive ? "+" : ""}{formatVND(sumPortfolioAttribution)}
                </strong>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-0.5 border-b border-sky-500/20 gap-0.5">
                <span>• Dòng tiền Thu/Chi mới phát sinh trong kỳ:</span>
                <strong className={isCashFlowPositive ? "text-emerald-400" : "text-rose-400"}>
                  {isCashFlowPositive ? "+" : ""}{formatVND(todayNetCashFlow)}
                </strong>
              </div>
              {Math.abs(netWorthChangeAmount - (sumPortfolioAttribution + todayNetCashFlow)) > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-0.5 border-b border-sky-500/20 gap-0.5 text-slate-400">
                  <span>• Chênh lệch điều chỉnh tài sản / nợ khác (Snapshot kỳ trước):</span>
                  <strong className={netWorthChangeAmount - (sumPortfolioAttribution + todayNetCashFlow) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {netWorthChangeAmount - (sumPortfolioAttribution + todayNetCashFlow) >= 0 ? "+" : ""}
                    {formatVND(netWorthChangeAmount - (sumPortfolioAttribution + todayNetCashFlow))}
                  </strong>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 font-bold text-xs gap-0.5">
                <span className="text-sky-300">🎯 Tổng chênh lệch gia sản ròng:</span>
                <strong className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                  {isPositive ? "+" : ""}{formatVND(netWorthChangeAmount)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
