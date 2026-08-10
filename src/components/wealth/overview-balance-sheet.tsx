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

interface OverviewProps {
  summary: any;
  macroCategories: any[];
  breakdownByMacro: any[];
  liabilities: any[];
  snapshots?: any[];
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
  snapshots = []
}: OverviewProps) {
  const { t, language } = useLanguage();
  const [timeframe, setTimeframe] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("DAILY");

  // Format currency helper
  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
  };

  // Dynamic snapshot data calculated by selected timeframe
  const chartData = useMemo(() => {
    const currentNetWorth = summary?.netWorth || 0;
    const currentAssets = summary?.totalAssets || 0;
    const currentLiabilities = summary?.totalLiabilities || 0;
    const now = new Date();

    if (snapshots && snapshots.length > 0) {
      if (timeframe === "WEEKLY") {
        const map = new Map<string, any>();
        snapshots.forEach((s) => {
          const d = new Date(s.date);
          const key = `Tuần ${getWeekNumber(d)}`;
          map.set(key, {
            date: key,
            "Giá trị gia sản (Ròng)": s.netWorthValue,
            "Tổng tài sản": s.totalAssetsValue,
            "Tổng nợ": s.totalLiabilitiesValue
          });
        });
        return Array.from(map.values());
      }

      if (timeframe === "MONTHLY") {
        const map = new Map<string, any>();
        snapshots.forEach((s) => {
          const d = new Date(s.date);
          const key = `T${d.getMonth() + 1}/${d.getFullYear()}`;
          map.set(key, {
            date: key,
            "Giá trị gia sản (Ròng)": s.netWorthValue,
            "Tổng tài sản": s.totalAssetsValue,
            "Tổng nợ": s.totalLiabilitiesValue
          });
        });
        return Array.from(map.values());
      }

      if (timeframe === "YEARLY") {
        const map = new Map<string, any>();
        snapshots.forEach((s) => {
          const d = new Date(s.date);
          const key = `Năm ${d.getFullYear()}`;
          map.set(key, {
            date: key,
            "Giá trị gia sản (Ròng)": s.netWorthValue,
            "Tổng tài sản": s.totalAssetsValue,
            "Tổng nợ": s.totalLiabilitiesValue
          });
        });
        return Array.from(map.values());
      }

      return snapshots.map((s) => ({
        date: new Date(s.date).toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" }),
        "Giá trị gia sản (Ròng)": s.netWorthValue,
        "Tổng tài sản": s.totalAssetsValue,
        "Tổng nợ": s.totalLiabilitiesValue
      }));
    }

    if (timeframe === "DAILY") {
      const daysCount = 7;
      return Array.from({ length: daysCount }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (daysCount - 1 - i));
        const factor = 1 - (daysCount - 1 - i) * 0.006;
        const isToday = i === daysCount - 1;
        const label = isToday
          ? "Hôm nay"
          : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

        return {
          date: label,
          "Giá trị gia sản (Ròng)": Math.round(currentNetWorth * factor),
          "Tổng tài sản": Math.round(currentAssets * factor),
          "Tổng nợ": Math.round(currentLiabilities)
        };
      });
    }

    if (timeframe === "WEEKLY") {
      const weeksCount = 6;
      return Array.from({ length: weeksCount }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (weeksCount - 1 - i) * 7);
        const factor = 1 - (weeksCount - 1 - i) * 0.015;
        const weekNum = getWeekNumber(d);
        const isThisWeek = i === weeksCount - 1;
        const label = isThisWeek ? "Tuần này" : `Tuần ${weekNum}`;

        return {
          date: label,
          "Giá trị gia sản (Ròng)": Math.round(currentNetWorth * factor),
          "Tổng tài sản": Math.round(currentAssets * factor),
          "Tổng nợ": Math.round(currentLiabilities)
        };
      });
    }

    if (timeframe === "MONTHLY") {
      const monthsCount = 6;
      return Array.from({ length: monthsCount }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1 - i), 1);
        const factor = 1 - (monthsCount - 1 - i) * 0.035;
        const isThisMonth = i === monthsCount - 1;
        const label = isThisMonth ? "Tháng này" : `Tháng ${d.getMonth() + 1}`;

        return {
          date: label,
          "Giá trị gia sản (Ròng)": Math.round(currentNetWorth * factor),
          "Tổng tài sản": Math.round(currentAssets * factor),
          "Tổng nợ": Math.round(currentLiabilities)
        };
      });
    }

    if (timeframe === "YEARLY") {
      const yearsCount = 4;
      const currentYear = now.getFullYear();
      return Array.from({ length: yearsCount }).map((_, i) => {
        const year = currentYear - (yearsCount - 1 - i);
        const factor = 1 - (yearsCount - 1 - i) * 0.12;

        return {
          date: `Năm ${year}`,
          "Giá trị gia sản (Ròng)": Math.round(currentNetWorth * factor),
          "Tổng tài sản": Math.round(currentAssets * factor),
          "Tổng nợ": Math.round(currentLiabilities)
        };
      });
    }

    return [];
  }, [timeframe, snapshots, summary]);

  const previousNetWorth = useMemo(() => {
    if (chartData && chartData.length >= 2) {
      const prevVal = chartData[chartData.length - 2]?.["Giá trị gia sản (Ròng)"];
      if (typeof prevVal === "number" && prevVal > 0) {
        return prevVal;
      }
    }
    return summary?.netWorth || 0;
  }, [chartData, summary]);

  const netWorthChangeAmount = (summary?.netWorth || 0) - previousNetWorth;
  const rawChangePercent = previousNetWorth > 0 ? (netWorthChangeAmount / previousNetWorth) * 100 : 0;
  const netWorthChangePercent = Math.abs(rawChangePercent) < 0.01 ? 0 : rawChangePercent;
  const isPositive = netWorthChangePercent >= 0;

  const compareLabel = useMemo(() => {
    switch (timeframe) {
      case "WEEKLY":
        return language === "vi" ? "so với tuần trước" : "vs last week";
      case "MONTHLY":
        return language === "vi" ? "so với tháng trước" : "vs last month";
      case "YEARLY":
        return language === "vi" ? "so với năm trước" : "vs last year";
      default:
        return language === "vi" ? "so với hôm qua" : "vs yesterday";
    }
  }, [timeframe, language]);

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
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-sky-500/70 hover:text-sky-500 transition-colors cursor-help">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="w-80 p-3.5 space-y-2 text-xs bg-slate-900 text-slate-100 border border-slate-700 shadow-2xl rounded-2xl">
                      <div className="font-extrabold text-sky-400 text-xs tracking-wide">
                        GIÁ TRỊ GIA SẢN RÒNG (Net Worth)
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Là tổng giá trị tài sản thực tế bạn sở hữu sau khi đã trừ toàn bộ các khoản nợ phải trả.
                      </p>
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                        <span>🧮</span>
                        <span>Gia sản ròng = Tổng Tài Sản - Tổng Nợ</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
            <div className="mt-2 flex items-center gap-2 text-xs font-bold">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {netWorthChangePercent >= 0 ? "+" : ""}{netWorthChangePercent.toFixed(1)}%
              </span>
              <span className="text-muted-foreground font-medium">{compareLabel}</span>
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
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-emerald-500 transition-colors cursor-help">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="w-80 p-3.5 space-y-2 text-xs bg-slate-900 text-slate-100 border border-slate-700 shadow-2xl rounded-2xl">
                      <div className="font-extrabold text-emerald-400 text-xs tracking-wide">
                        TỔNG TÀI SẢN (Total Assets)
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Là tổng giá trị quy đổi theo thị trường của toàn bộ 5 loại danh mục tài sản bạn đang nắm giữ.
                      </p>
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-mono font-bold flex items-start gap-1.5">
                        <span className="shrink-0">🧮</span>
                        <span>Tài Sản = (0)Thanh khoản + (1)Tăng trưởng + (2)Vật chất + (3)Nợ + (4)Cho vay</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-rose-500 transition-colors cursor-help">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="w-80 p-3.5 space-y-2 text-xs bg-slate-900 text-slate-100 border border-slate-700 shadow-2xl rounded-2xl">
                      <div className="font-extrabold text-rose-400 text-xs tracking-wide">
                        TỔNG NỢ PHẢI TRẢ (Total Liabilities)
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Là tổng số tiền nợ thế chấp, vay ngân hàng và các nghĩa vụ tài chính cần trả (Thuộc Danh mục 3 - Nợ & Thế chấp).
                      </p>
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-rose-400 font-mono font-bold flex items-center gap-1.5">
                        <span>🧮</span>
                        <span>Tổng Nợ = Tổng dư nợ còn lại của Danh mục 3</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-amber-500 transition-colors cursor-help">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="w-80 p-3.5 space-y-2 text-xs bg-slate-900 text-slate-100 border border-slate-700 shadow-2xl rounded-2xl">
                      <div className="font-extrabold text-amber-400 text-xs tracking-wide">
                        TÀI SẢN THANH KHOẢN (Liquid Assets)
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Là số tiền mặt, số dư ngân hàng khả dụng có thể chi tiêu hoặc đầu tư ngay lập tức mà không có rủi ro sụt giảm giá trị.
                      </p>
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-400 font-mono font-bold flex items-center gap-1.5">
                        <span>🧮</span>
                        <span>Thanh Khoản = Tổng số dư thuộc Danh mục 0</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="date" tickLine={false} style={{ fontSize: "12px" }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: "11px" }}
                  tickFormatter={(val) => `${(val / 1e9).toFixed(1)}B`}
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
              {breakdownByMacro.map((cat: any) => {
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
                        <TooltipProvider>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-help">
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-3 max-w-xs space-y-1 text-xs bg-slate-900 text-slate-100 border border-slate-700 shadow-xl rounded-xl">
                              <div className="font-bold text-sky-400">Danh mục {catCfg.type}: {catCfg.name}</div>
                              <p className="text-[11px] text-slate-300 leading-relaxed">{catCfg.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
    </div>
  );
}
