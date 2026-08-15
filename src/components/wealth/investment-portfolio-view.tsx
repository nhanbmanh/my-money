"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";

import { getStartOfTodayVN } from "@/lib/date-utils";

interface PortfolioProps {
  summary: {
    totalInvestedCostBasis: number;
    totalMarketValueInvestments: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
  };
  holdings?: any[];
  snapshots?: any[];
}

const COLOR_PALETTE = [
  "#0284c7", // Sky blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#64748b"  // Slate
];

export function InvestmentPortfolioView({ summary, holdings = [], snapshots = [] }: PortfolioProps) {
  const { t, language } = useLanguage();

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
  };

  const startOfToday = useMemo(() => getStartOfTodayVN(), []);
  const midnightTimestamp = useMemo(() => startOfToday.getTime(), [startOfToday]);

  // Find 00:00 VNT Today Baseline Snapshot (or latest past snapshot before 00:00 VNT today)
  const baselineSnapshot = useMemo(() => {
    const todaySnapshots = (snapshots || []).filter(
      (s: any) => new Date(s.date) >= startOfToday
    );
    if (todaySnapshots.length > 0) return todaySnapshots[0];

    const pastSnapshots = (snapshots || []).filter(
      (s: any) => new Date(s.date) < startOfToday
    );
    return pastSnapshots.length > 0 ? pastSnapshots[pastSnapshots.length - 1] : null;
  }, [snapshots, startOfToday]);

  // Calculate intraday market valuation change for portfolio holdings relative to 00:00 VNT today baseline
  const { oneDayPortfolioMarketChange, portfolioMarketChangePercent } = useMemo(() => {
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

    let changeVND = 0;

    (holdings || []).forEach((h: any) => {
      const quantity = Number(h.quantity || 0);
      const currentVal = Number(h.currentValue || 0);
      const currentUnitPrice = Number(h.currentMarketPrice || h.averageCostBasis || 0);
      const change24hPercent = Number(h.change24h || 0);

      let intradayChange = 0;

      // Method A: Check snapshot holdings breakdown at 00:00 VNT baseline
      const snapItem = snapshotHoldingsMap[h.id] || snapshotHoldingsMap[h.assetId];
      if (snapItem && Number(snapItem.currentMarketPrice || 0) > 0) {
        const snapPrice = Number(snapItem.currentMarketPrice);
        const priceDelta = currentUnitPrice - snapPrice;
        intradayChange = Math.round(priceDelta * quantity);
      } else {
        // Method B: Check whether price update occurred AFTER 00:00:00 VNT today
        const holdingUpdated = h.updatedAt ? new Date(h.updatedAt).getTime() : 0;
        const assetUpdated = h.asset?.updatedAt ? new Date(h.asset?.updatedAt).getTime() : 0;
        const lastUpdated = Math.max(holdingUpdated, assetUpdated);

        const isUpdatedToday = lastUpdated >= midnightTimestamp;

        if (isUpdatedToday && change24hPercent !== 0 && currentUnitPrice > 0) {
          const previousUnitPrice = currentUnitPrice / (1 + change24hPercent / 100);
          const navDeltaPerUnit = currentUnitPrice - previousUnitPrice;
          if (quantity > 0) {
            intradayChange = Math.round(navDeltaPerUnit * quantity);
          } else {
            intradayChange = Math.round(currentVal - currentVal / (1 + change24hPercent / 100));
          }
        } else {
          // If price did NOT update after 00:00:00 VNT today
          intradayChange = 0;
        }
      }

      changeVND += intradayChange;
    });

    const marketValue = Number(summary?.totalMarketValueInvestments || 0);
    const prevMarketValue = marketValue - changeVND;
    const percent = prevMarketValue > 0 ? (changeVND / prevMarketValue) * 100 : 0;

    return {
      oneDayPortfolioMarketChange: changeVND,
      portfolioMarketChangePercent: percent,
    };
  }, [holdings, summary, baselineSnapshot, midnightTimestamp]);

  const isMarketChangePositive = oneDayPortfolioMarketChange >= 0;

  // Group holdings by Asset Class
  const assetClassMap: Record<string, number> = {};
  const riskProfileMap: Record<string, number> = {};
  const liquidityMap: Record<string, number> = {};

  holdings.forEach((h: any) => {
    const cls = h.asset?.assetClass || "STOCKS";
    assetClassMap[cls] = (assetClassMap[cls] || 0) + h.currentValue;

    const meta = h.asset?.metadata || {};
    const risk = meta.riskProfile || (cls === "CRYPTO" ? (language === "vi" ? "Rủi ro cao" : "High Risk") : cls === "STOCKS" ? (language === "vi" ? "Tăng trưởng" : "Growth") : (language === "vi" ? "An toàn" : "Safe"));
    riskProfileMap[risk] = (riskProfileMap[risk] || 0) + h.currentValue;

    const liq = meta.liquidityIndex || (cls === "REAL_ESTATE" ? "T30+" : cls === "CASH" ? "T0" : "T2.5");
    liquidityMap[liq] = (liquidityMap[liq] || 0) + h.currentValue;
  });

  const assetClassData = Object.keys(assetClassMap).map((k) => ({ name: k, value: assetClassMap[k] }));
  const riskProfileData = Object.keys(riskProfileMap).map((k) => ({ name: k, value: riskProfileMap[k] }));
  const liquidityData = Object.keys(liquidityMap).map((k) => ({ name: k, value: liquidityMap[k] }));

  const isProfit = summary.unrealizedPnL >= 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Performance Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Cost Basis */}
        <Card className="border-sky-200/60 dark:border-sky-900/50 bg-gradient-to-br from-sky-500/10 via-background to-blue-600/5 shadow-md">
          <CardHeader className="pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
              {t("wealth.totalCostBasis")}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {formatVND(summary.totalInvestedCostBasis)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{language === "vi" ? "Số tiền vốn thực tế đã bỏ ra" : "Actual capital invested"}</p>
          </CardContent>
        </Card>

        {/* Card 2: Current Market Value with 1-Day Change Comparison */}
        <Card className="border-emerald-200/60 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-500/10 via-background to-teal-600/5 shadow-md">
          <CardHeader className="pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {t("wealth.currentMarketValue")}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {formatVND(summary.totalMarketValueInvestments)}
            </div>
            
            {/* 1-Day Comparison vs 00:00 VNT Midnight Baseline */}
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px]",
                  isMarketChangePositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {isMarketChangePositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                <span>{oneDayPortfolioMarketChange >= 0 ? "+" : ""}{formatVND(oneDayPortfolioMarketChange)}</span>
                <span className="opacity-90">({portfolioMarketChangePercent >= 0 ? "+" : ""}{portfolioMarketChangePercent.toFixed(1)}%)</span>
              </span>
              <span className="text-muted-foreground font-medium text-[11px]">
                {language === "vi" ? "trong ngày (từ 00:00 VNT)" : "intraday (since 00:00 VNT)"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Unrealized PnL with 1-Day Change Comparison */}
        <Card
          className={`border-${isProfit ? "emerald" : "rose"}-200/60 dark:border-${isProfit ? "emerald" : "rose"}-900/50 bg-gradient-to-br from-${
            isProfit ? "emerald" : "rose"
          }-500/10 via-background to-slate-900 shadow-md`}
        >
          <CardHeader className="pb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isProfit ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
              {t("wealth.unrealizedPnl")}
            </span>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-extrabold flex items-center gap-1 ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {isProfit ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
              <span>{isProfit ? "+" : ""}{formatVND(summary.unrealizedPnL)}</span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs font-bold">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${isProfit ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                {summary.unrealizedPnLPercent >= 0 ? "+" : ""}{summary.unrealizedPnLPercent.toFixed(2)}% ROI
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px]",
                  isMarketChangePositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {isMarketChangePositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{oneDayPortfolioMarketChange >= 0 ? "+" : ""}{formatVND(oneDayPortfolioMarketChange)}</span>
              </span>
              <span className="text-muted-foreground font-medium text-[11px]">
                {language === "vi" ? "trong ngày (từ 00:00 VNT)" : "intraday (since 00:00 VNT)"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Allocation Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chart 1: By Asset Class */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>{t("wealth.assetAllocation")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetClassData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {assetClassData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatVND(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs space-y-1 w-full">
              {assetClassData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }} />
                    <span className="text-muted-foreground font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold">{formatVND(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Risk Profile */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === "vi" ? "Phân Phối Theo Khẩu Vị Rủi Ro" : "Risk Profile Breakdown"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskProfileData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {riskProfileData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLOR_PALETTE[(index + 2) % COLOR_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatVND(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs space-y-1 w-full">
              {riskProfileData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_PALETTE[(idx + 2) % COLOR_PALETTE.length] }} />
                    <span className="text-muted-foreground font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold">{formatVND(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Liquidity Horizon */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>{language === "vi" ? "Kỳ Hạn Thanh Khoản (T+)" : "Liquidity Horizon"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liquidityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {liquidityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLOR_PALETTE[(index + 4) % COLOR_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatVND(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs space-y-1 w-full">
              {liquidityData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_PALETTE[(idx + 4) % COLOR_PALETTE.length] }} />
                    <span className="text-muted-foreground font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold">{formatVND(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
