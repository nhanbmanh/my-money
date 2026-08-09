"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Layers,
  ShieldAlert,
  Clock,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";

interface PortfolioProps {
  summary: {
    totalInvestedCostBasis: number;
    totalMarketValueInvestments: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
  };
  holdings?: any[];
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

export function InvestmentPortfolioView({ summary, holdings = [] }: PortfolioProps) {
  const { t, language } = useLanguage();

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
  };

  // Group holdings by Asset Class
  const assetClassMap: Record<string, number> = {};
  const riskProfileMap: Record<string, number> = {};
  const liquidityMap: Record<string, number> = {};

  holdings.forEach((h: any) => {
    const cls = h.asset.assetClass || "STOCKS";
    assetClassMap[cls] = (assetClassMap[cls] || 0) + h.currentValue;

    const meta = h.asset.metadata || {};
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
            <p className="mt-1 text-xs text-muted-foreground">Mark-to-market</p>
          </CardContent>
        </Card>

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
            <p className={`mt-1 text-xs font-bold ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {isProfit ? "+" : ""}{summary.unrealizedPnLPercent.toFixed(2)}% ROI
            </p>
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
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetClassData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {assetClassData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [formatVND(Number(value)), "Giá trị"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-1 mt-2">
              {assetClassData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }}
                    />
                    <span>{item.name}</span>
                  </span>
                  <span>{formatVND(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: By Risk Profile */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <span>Khẩu Vị Rủi Ro</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskProfileData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskProfileData.map((_, index) => (
                      <Cell key={`cell-risk-${index}`} fill={COLOR_PALETTE[(index + 3) % COLOR_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [formatVND(Number(value)), "Giá trị"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-1 mt-2">
              {riskProfileData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLOR_PALETTE[(idx + 3) % COLOR_PALETTE.length] }}
                    />
                    <span>{item.name}</span>
                  </span>
                  <span>{formatVND(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: By Liquidity Index */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span>Chỉ Số Thanh Khoản</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liquidityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {liquidityData.map((_, index) => (
                      <Cell key={`cell-liq-${index}`} fill={COLOR_PALETTE[(index + 5) % COLOR_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [formatVND(Number(value)), "Giá trị"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-1 mt-2">
              {liquidityData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLOR_PALETTE[(idx + 5) % COLOR_PALETTE.length] }}
                    />
                    <span>{item.name}</span>
                  </span>
                  <span>{formatVND(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
