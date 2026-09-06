"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Building2,
  Wallet,
  ArrowUpRight,
  Sparkles,
  PieChart as PieIcon,
  CreditCard,
  Calendar,
  Info
} from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { MetricHelpInfo } from "@/components/wealth/metric-help-info";
import { ChartPointDetailModal } from "@/components/wealth/chart-point-detail-modal";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import {
  ASSET_CATEGORY_TYPES,
  getCategoryConfig,
} from "@/lib/asset-category-types";

import { NetWorthVarianceModal } from "@/components/wealth/net-worth-variance-modal";
import { getStartOfTodayVN } from "@/lib/date-utils";

interface OverviewProps {
  summary: any;
  macroCategories: any[];
  breakdownByMacro: any[];
  liabilities: any[];
  snapshots?: any[];
  holdings?: any[];
  transactions?: any[];
  cashFlows?: any[];
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function OverviewBalanceSheet({
  summary,
  macroCategories,
  breakdownByMacro,
  liabilities,
  snapshots = [],
  holdings = [],
  transactions = [],
  cashFlows = [],
}: OverviewProps) {
  const { t, language } = useLanguage();
  const [timeframe, setTimeframe] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("DAILY");
  const [varianceModalOpen, setVarianceModalOpen] = useState(false);
  const [selectedChartPoint, setSelectedChartPoint] = useState<any>(null);
  const [pointModalOpen, setPointModalOpen] = useState(false);

  // Format currency helper
  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
  };

  // Precompute 24h market PnL change logged today (Day T vs T-1 closing price)
  const rawMarketChange = useMemo(() => {
    let sum = 0;
    (holdings || []).forEach((h: any) => {
      if (h.categoryType === 0 || h.asset?.symbolOrTicker === "CASH_VND") return;

      const quantity = Number(h.quantity || 0);
      const currentUnitPrice = Number(h.currentMarketPrice || h.averageCostBasis || 0);
      const yesterdayUnitPrice = Number(h.yesterdayPrice || currentUnitPrice);

      if (yesterdayUnitPrice > 0 && currentUnitPrice > 0) {
        const priceDelta = currentUnitPrice - yesterdayUnitPrice;
        sum += Math.round(priceDelta * quantity);
      }
    });

    return sum;
  }, [holdings]);

  // Dynamic timeframe chart data computed strictly via user formula: Net Worth Date X = A + B + C
  // A = Liquid Cash Today - CashFlows logged strictly after Date X
  // B = Sum(Quantity of Growth Asset * Closing Price at Date X)
  // C = Other Assets - Total Liabilities
  const chartData = useMemo(() => {
    const now = new Date();
    const startOfToday = getStartOfTodayVN();

    // 1. Separate holdings into Growth Assets (B), Liquid Assets (A), and Other Assets (C)
    const currentLiquid = Number(summary?.totalInvestableAssets || 0);
    const growthHoldings = (holdings || []).filter(
      (h: any) => h.categoryType === 1 || (h.asset && h.asset.isMarketDriven)
    );
    const otherAssetsValue = (holdings || [])
      .filter((h: any) => h.categoryType > 1)
      .reduce((sum: number, h: any) => sum + (Number(h.currentValue) || 0), 0);

    const totalLiabilities = Number(summary?.totalLiabilities || 0);
    const C = otherAssetsValue - totalLiabilities; // Other Assets - Debt

    // Helper to calculate A, B, C for any date targetEOD
    const calculatePointAtEOD = (targetEOD: Date, dateLabel: string) => {
      // A = Liquid Cash - Net CashFlows strictly AFTER targetEOD
      let netCashFlowAfter = 0;
      (cashFlows || []).forEach((cf: any) => {
        const cfTime = new Date(cf.datetime || cf.createdAt);
        if (cfTime > targetEOD) {
          if (cf.cashType === "Income") netCashFlowAfter += Number(cf.amountOfMoney || 0);
          else netCashFlowAfter -= Number(cf.amountOfMoney || 0);
        }
      });
      const A = currentLiquid - netCashFlowAfter;

      // B = Sum(Quantity of Growth Asset at Date X * Closing Price at Date X)
      let B = 0;
      const growthItems: any[] = [];

      growthHoldings.forEach((h: any) => {
        const currentQty = Number(h.quantity || 0);

        // Backward Quantity Revaluation: Quantity(Date X) = Current Quantity - TxDeltas(after Date X)
        let qtyDeltaAfterDay = 0;
        let hasTxOnOrBeforeDay = false;

        (transactions || []).forEach((tx: any) => {
          if (tx.assetId === h.assetId) {
            const txTime = new Date(tx.date || tx.createdAt);
            if (txTime > targetEOD) {
              const txQty = Number(tx.quantity || 0);
              const txType = String(tx.transactionType || "").toUpperCase();
              if (txType === "BUY" || txType === "DEPOSIT" || txType === "TRANSFER_IN") {
                qtyDeltaAfterDay += txQty;
              } else if (txType === "SELL" || txType === "WITHDRAW" || txType === "TRANSFER_OUT") {
                qtyDeltaAfterDay -= txQty;
              }
            } else {
              hasTxOnOrBeforeDay = true;
            }
          }
        });

        let qtyAtX = Math.max(0, currentQty - qtyDeltaAfterDay);

        // Fallback: If targetEOD is strictly before holding creation date and user has no transactions on/before targetEOD
        if (h.createdAt && !hasTxOnOrBeforeDay) {
          const createdAtTime = new Date(h.createdAt);
          if (targetEOD < createdAtTime) {
            qtyAtX = 0;
          }
        }

        const currentUnitPrice = Number(h.currentMarketPrice || h.averageCostBasis || 0);
        const yesterdayUnitPrice = Number(h.yesterdayPrice || currentUnitPrice);

        let priceAtX = currentUnitPrice;

        const yyyy = targetEOD.getFullYear();
        const mm = String(targetEOD.getMonth() + 1).padStart(2, "0");
        const dd = String(targetEOD.getDate()).padStart(2, "0");
        const dateKey = `${yyyy}-${mm}-${dd}`;

        const yesterday = new Date(startOfToday);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
          yesterday.getDate()
        ).padStart(2, "0")}`;

        if (h.historyMap && Object.keys(h.historyMap).length > 0) {
          if (h.historyMap[dateKey] !== undefined) {
            priceAtX = Number(h.historyMap[dateKey]);
          } else {
            const sortedHistoryDates = Object.keys(h.historyMap).sort();
            let foundPrice: number | null = null;
            for (let k = sortedHistoryDates.length - 1; k >= 0; k--) {
              if (sortedHistoryDates[k] <= dateKey) {
                foundPrice = Number(h.historyMap[sortedHistoryDates[k]]);
                break;
              }
            }
            if (foundPrice !== null) {
              priceAtX = foundPrice;
            } else {
              priceAtX = Number(h.historyMap[sortedHistoryDates[0]]) || currentUnitPrice;
            }
          }
        } else if (dateKey < yesterdayStr) {
          priceAtX = yesterdayUnitPrice;
        } else {
          priceAtX = currentUnitPrice;
        }

        const totalValueAtX = qtyAtX * priceAtX;
        B += totalValueAtX;

        growthItems.push({
          id: h.id,
          name: h.asset?.assetName || h.asset?.symbolOrTicker || "Tài sản đầu tư",
          symbol: h.asset?.symbolOrTicker || "",
          quantity: qtyAtX,
          priceAtX,
          totalValueAtX,
        });
      });

      const dayNetWorth = A + B + C;
      const dayAssets = A + B + otherAssetsValue;

      const formattedDate = targetEOD.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      return {
        netWorth: Math.round(dayNetWorth),
        assets: Math.round(dayAssets),
        liabilities: Math.round(totalLiabilities),
        pointDetails: {
          dateLabel,
          formattedDate,
          netWorth: Math.round(dayNetWorth),
          totalAssets: Math.round(dayAssets),
          totalLiabilities: Math.round(totalLiabilities),
          A: Math.round(A),
          B: Math.round(B),
          C: Math.round(C),
          growthItems,
          otherAssetsValue: Math.round(otherAssetsValue),
          netCashFlowAfter: Math.round(netCashFlowAfter),
        },
      };
    };

    if (timeframe === "DAILY") {
      const daysCount = 7;
      return Array.from({ length: daysCount }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (daysCount - 1 - i));
        d.setHours(23, 59, 59, 999);

        const label = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        const point = calculatePointAtEOD(d, label);

        return {
          date: label,
          "Giá trị gia sản (Ròng)": point.netWorth,
          "Tổng tài sản": point.assets,
          "Tổng nợ": point.liabilities,
          pointDetails: point.pointDetails,
        };
      });
    }

    if (timeframe === "WEEKLY") {
      const weeksCount = 6;
      return Array.from({ length: weeksCount }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (weeksCount - 1 - i) * 7);

        // Find Sunday EOD (end of week)
        const sunday = new Date(d);
        const dayOfWeek = sunday.getDay();
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        sunday.setDate(sunday.getDate() + daysUntilSunday);
        sunday.setHours(23, 59, 59, 999);

        // Cap at current time if Sunday is in the future
        const targetEOD = sunday > now ? now : sunday;

        const weekNum = getWeekNumber(targetEOD);
        const isThisWeek = i === weeksCount - 1;
        const label = isThisWeek ? "Tuần này" : `Tuần ${weekNum}`;
        const point = calculatePointAtEOD(targetEOD, label);

        return {
          date: label,
          "Giá trị gia sản (Ròng)": point.netWorth,
          "Tổng tài sản": point.assets,
          "Tổng nợ": point.liabilities,
          pointDetails: point.pointDetails,
        };
      });
    }

    if (timeframe === "MONTHLY") {
      const monthsCount = 6;
      return Array.from({ length: monthsCount }).map((_, i) => {
        const targetMonthIndex = now.getMonth() - (monthsCount - 1 - i);
        const targetYear = now.getFullYear();
        const endOfMonth = new Date(targetYear, targetMonthIndex + 1, 0, 23, 59, 59, 999);
        const targetEOD = endOfMonth > now ? now : endOfMonth;

        const isThisMonth = i === monthsCount - 1;
        const label = isThisMonth ? "Tháng này" : `T${endOfMonth.getMonth() + 1}/${endOfMonth.getFullYear()}`;
        const point = calculatePointAtEOD(targetEOD, label);

        return {
          date: label,
          "Giá trị gia sản (Ròng)": point.netWorth,
          "Tổng tài sản": point.assets,
          "Tổng nợ": point.liabilities,
          pointDetails: point.pointDetails,
        };
      });
    }

    if (timeframe === "YEARLY") {
      const yearsCount = 4;
      const currentYear = now.getFullYear();
      return Array.from({ length: yearsCount }).map((_, i) => {
        const year = currentYear - (yearsCount - 1 - i);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
        const targetEOD = endOfYear > now ? now : endOfYear;

        const label = `Năm ${year}`;
        const point = calculatePointAtEOD(targetEOD, label);

        return {
          date: label,
          "Giá trị gia sản (Ròng)": point.netWorth,
          "Tổng tài sản": point.assets,
          "Tổng nợ": point.liabilities,
          pointDetails: point.pointDetails,
        };
      });
    }

    return [];
  }, [timeframe, summary, holdings, cashFlows, snapshots]);

  // Dynamic YAxis domain for optimal chart scaling (zooms into fluctuations instead of starting at 0)
  const yDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return ["auto", "auto"];
    const values = chartData
      .map((d: any) => Number(d["Giá trị gia sản (Ròng)"] || 0))
      .filter((v: number) => v > 0);

    if (values.length === 0) return ["auto", "auto"];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const diff = max - min;

    const padding = diff > 0 ? diff * 0.2 : min * 0.01;
    const domainMin = Math.max(0, Math.floor(min - padding));
    const domainMax = Math.ceil(max + padding);

    return [domainMin, domainMax];
  }, [chartData]);

  // 1-day Net Worth Variance Calculation (100% synchronized with NetWorthVarianceModal via Day T vs T-1 closing price)
  const { previousNetWorth, netWorthChangeAmount, netWorthChangePercent, isPositive } = useMemo(() => {
    const currentNetWorth = Number(summary?.netWorth || 0);

    const startOfToday = getStartOfTodayVN();
    let todayNetCashFlow = 0;
    (cashFlows || []).forEach((cf: any) => {
      const cfDate = new Date(cf.datetime || cf.createdAt);
      if (cfDate >= startOfToday) {
        const amt = Number(cf.amountOfMoney || 0);
        if (cf.cashType === "Income") todayNetCashFlow += amt;
        else todayNetCashFlow -= amt;
      }
    });

    const totalChangeAmount = rawMarketChange + todayNetCashFlow;
    const prevNetWorth = currentNetWorth - totalChangeAmount;

    const rawPercent = prevNetWorth > 0 ? (totalChangeAmount / prevNetWorth) * 100 : 0;
    const changePercent = Math.abs(rawPercent) < 0.01 ? 0 : rawPercent;

    return {
      previousNetWorth: prevNetWorth,
      netWorthChangeAmount: totalChangeAmount,
      netWorthChangePercent: changePercent,
      isPositive: totalChangeAmount >= 0,
    };
  }, [summary, cashFlows, rawMarketChange]);

  const compareLabel = useMemo(() => {
    return language === "vi" ? "so với hôm qua" : "vs yesterday";
  }, [language]);

  const timeframeSubtitle = useMemo(() => {
    switch (timeframe) {
      case "WEEKLY":
        return "Theo dõi chốt định giá Mark-to-Market hàng tuần (6 tuần gần nhất)";
      case "MONTHLY":
        return "Theo dõi chốt định giá Mark-to-Market hàng tháng (6 tháng gần nhất)";
      case "YEARLY":
        return "Theo dõi chốt định giá Mark-to-Market hàng năm (4 năm gần nhất)";
      default:
        return "Theo dõi chốt định giá Mark-to-Market hàng ngày (7 ngày gần nhất)";
    }
  }, [timeframe]);

  // Computed Category Breakdown (5 Category Types 0 - 4) with fallback calculation
  const categoryBreakdown = useMemo(() => {
    if (breakdownByMacro && breakdownByMacro.length > 0) {
      return breakdownByMacro;
    }

    const map: Record<number, { type: number; code: string; name: string; value: number; count: number }> = {
      0: { type: 0, code: "LIQUID", name: ASSET_CATEGORY_TYPES[0].name, value: 0, count: 0 },
      1: { type: 1, code: "GROWTH", name: ASSET_CATEGORY_TYPES[1].name, value: 0, count: 0 },
      2: { type: 2, code: "PHYSICAL", name: ASSET_CATEGORY_TYPES[2].name, value: 0, count: 0 },
      3: { type: 3, code: "DEBT_MORTGAGE", name: ASSET_CATEGORY_TYPES[3].name, value: 0, count: 0 },
      4: { type: 4, code: "LENDING", name: ASSET_CATEGORY_TYPES[4].name, value: 0, count: 0 },
    };

    (holdings || []).forEach((h: any) => {
      const catType = h.categoryType >= 0 && h.categoryType <= 4 ? h.categoryType : 0;
      const val = Number(h.currentValue || h.quantity * h.averageCostBasis || 0);
      if (map[catType]) {
        map[catType].value += val;
        map[catType].count += 1;
      }
    });

    return Object.values(map);
  }, [breakdownByMacro, holdings]);

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Net Worth */}
        <Card className="relative overflow-hidden border-sky-200/60 dark:border-sky-900/50 bg-gradient-to-br from-sky-500/10 via-background to-blue-600/5 dark:from-sky-950/40 dark:to-slate-900 shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sparkles className="h-24 w-24 text-sky-600" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                  {t("wealth.totalNetWorth")}
                </span>
                <MetricHelpInfo
                  title="GIÁ TRỊ GIA SẢN RÒNG (Net Worth)"
                  description="Là tổng giá trị tài sản thực tế bạn sở hữu sau khi đã trừ toàn bộ các khoản nợ phải trả."
                  formula="Gia sản ròng = Tổng Tài Sản - Tổng Nợ"
                  titleColorClass="text-sky-400"
                />
              </div>
              <span className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <ShieldCheck className="h-5 w-5" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {formatVND(summary.netWorth)}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span>{netWorthChangeAmount >= 0 ? "+" : ""}{formatVND(netWorthChangeAmount)}</span>
                  <span className="opacity-90">({netWorthChangePercent >= 0 ? "+" : ""}{netWorthChangePercent.toFixed(2)}%)</span>
                </span>
                <span className="text-muted-foreground font-medium text-[11px]">{compareLabel}</span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setVarianceModalOpen(true)}
                className="h-6 px-2 text-[11px] font-extrabold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Xem chi tiết</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Assets */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("wealth.totalAssets")}
                </span>
                <MetricHelpInfo
                  title="TỔNG TÀI SẢN (Total Assets)"
                  description="Là tổng giá trị quy đổi theo thị trường của toàn bộ 5 loại danh mục tài sản bạn đang nắm giữ."
                  formula="Tài Sản = (0)Thanh khoản + (1)Tăng trưởng + (2)Vật chất + (3)Nợ + (4)Cho vay"
                  titleColorClass="text-emerald-400"
                />
              </div>
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Building2 className="h-5 w-5" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {formatVND(summary.totalAssets)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-medium">
              {language === "vi" ? "Gồm " : "Includes "}<strong>5</strong>{language === "vi" ? " loại danh mục tài sản" : " asset category types"}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Liabilities */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("wealth.totalLiabilities")}
                </span>
                <MetricHelpInfo
                  title="TỔNG NỢ PHẢI TRẢ (Total Liabilities)"
                  description="Là tổng số tiền nợ thế chấp, vay ngân hàng và các nghĩa vụ tài chính cần trả (Thuộc Danh mục 3 - Nợ & Thế chấp)."
                  formula="Tổng Nợ = Tổng dư nợ còn lại của Danh mục 3"
                  titleColorClass="text-rose-400"
                />
              </div>
              <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <CreditCard className="h-5 w-5" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {formatVND(summary.totalLiabilities)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-medium">
              {t("wealth.debtToAssetRatio")}: <strong>{summary.totalAssets > 0 ? ((summary.totalLiabilities / summary.totalAssets) * 100).toFixed(1) : 0}%</strong>
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Investable Assets */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("wealth.liquidAssets")}
                </span>
                <MetricHelpInfo
                  title="TÀI SẢN THANH KHOẢN (Liquid Assets)"
                  description="Là số tiền mặt, số dư ngân hàng khả dụng có thể chi tiêu hoặc đầu tư ngay lập tức mà không có rủi ro sụt giảm giá trị."
                  formula="Thanh Khoản = Tổng số dư thuộc Danh mục 0"
                  titleColorClass="text-amber-400"
                />
              </div>
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Wallet className="h-5 w-5" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {formatVND(summary.totalInvestableAssets)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-medium">
              {language === "vi" ? "Chiếm " : "Accounts for "}<strong>{summary.totalAssets > 0 ? ((summary.totalInvestableAssets / summary.totalAssets) * 100).toFixed(1) : 0}%</strong>{language === "vi" ? " tổng tài sản" : " of total assets"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historical Net Worth Chart */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              <span>Biểu Đồ Lịch Sử Tăng Trưởng Gia Sản</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">{timeframeSubtitle}</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl shrink-0 border border-slate-800">
            {(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  timeframe === t
                    ? "bg-sky-500 text-white shadow-md font-extrabold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {t === "DAILY" ? "Ngày" : t === "WEEKLY" ? "Tuần" : t === "MONTHLY" ? "Tháng" : "Năm"}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-xs text-sky-400 font-medium px-1 pb-2">
            <span className="flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              Bấm vào bất kỳ điểm dữ liệu nào trên biểu đồ để xem bóc tách NAV chi tiết (A + B + C)
            </span>
          </div>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const payload = e.activePayload[0].payload;
                    if (payload.pointDetails) {
                      setSelectedChartPoint(payload.pointDetails);
                      setPointModalOpen(true);
                    }
                  }
                }}
                className="cursor-pointer"
              >
                <defs>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="date" tickLine={false} style={{ fontSize: "12px" }} />
                <YAxis
                  domain={yDomain}
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: "11px" }}
                  tickFormatter={(val) => {
                    if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
                    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
                    if (val >= 1e3) return `${(val / 1e3).toFixed(0)}k`;
                    return `${val}`;
                  }}
                />
                <RechartsTooltip
                  formatter={(value: any) => [formatVND(Number(value)), ""]}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Giá trị gia sản (Ròng)"
                  stroke="#0284c7"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#netWorthGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Asset Allocation Breakdown by 5 Category Types & Liabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Types Bar Chart */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>Phân Bổ Giá Trị Theo 5 Loại Danh Mục</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryBreakdown.map((cat: any) => {
                const catCfg = getCategoryConfig(cat.type !== undefined ? cat.type : 0);
                const percent = summary.totalAssets > 0 ? (cat.value / summary.totalAssets) * 100 : 0;
                return (
                  <div key={cat.type ?? cat.code} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] border ${catCfg.badgeBg}`}>
                          {catCfg.type}. {catCfg.shortName}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px] hidden sm:inline">
                          ({catCfg.name})
                        </span>
                        <MetricHelpInfo
                          title={`Danh mục ${catCfg.type}: ${catCfg.name}`}
                          description={catCfg.description || ""}
                          titleColorClass="text-sky-400"
                        />
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-extrabold">
                        {formatVND(cat.value)} ({percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Liabilities Summary Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <CreditCard className="h-5 w-5" />
              <span>Chi Tiết Khoản Nợ & Vay Thế Chấp</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-4">
            {liabilities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs font-medium">
                Bạn chưa có khoản nợ hoặc vay thế chấp nào. Thật tuyệt vời!
              </div>
            ) : (
              <div className="space-y-3">
                {liabilities.map((l: any) => (
                  <div
                    key={l.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{l.name}</div>
                      {l.interestRate > 0 && (
                        <div className="text-[11px] text-muted-foreground">Lãi suất: {l.interestRate}%/năm</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                        {formatVND(l.totalDebt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-200 dark:border-sky-900 text-xs space-y-1">
              <div className="font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span>Chỉ Số Đòn Bẩy</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tỷ lệ Nợ / Tổng Tài Sản:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {summary.totalAssets > 0 ? ((summary.totalLiabilities / summary.totalAssets) * 100).toFixed(1) : 0}%
                </strong>{" "}
                (An toàn &lt; 50%)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Worth Variance Breakdown Modal */}
      <NetWorthVarianceModal
        open={varianceModalOpen}
        onOpenChange={setVarianceModalOpen}
        summary={summary}
        previousNetWorth={previousNetWorth}
        netWorthChangeAmount={netWorthChangeAmount}
        netWorthChangePercent={netWorthChangePercent}
        compareLabel={compareLabel}
        holdings={holdings}
        liabilities={liabilities}
        transactions={transactions}
        cashFlows={cashFlows}
        snapshots={snapshots}
      />

      {/* Chart Point Detail Modal */}
      <ChartPointDetailModal
        open={pointModalOpen}
        onOpenChange={setPointModalOpen}
        pointData={selectedChartPoint}
      />
    </div>
  );
}
