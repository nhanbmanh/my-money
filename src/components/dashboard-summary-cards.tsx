"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface DashboardSummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  totalTransactions: number;
  loading?: boolean;
}

export function DashboardSummaryCards({
  totalIncome,
  totalExpense,
  totalTransactions,
  loading = false,
}: DashboardSummaryCardsProps) {
  const [showAmounts, setShowAmounts] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("my_money_show_amounts");
      if (stored !== null) {
        setShowAmounts(JSON.parse(stored));
      } else {
        setShowAmounts(false);
      }
    } catch {
      setShowAmounts(false);
    }
  }, []);

  const toggleShowAmounts = () => {
    setShowAmounts((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("my_money_show_amounts", JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const netBalance = totalIncome - totalExpense;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  const renderValue = (val: number) => {
    if (!showAmounts) {
      return "•••••••• ₫";
    }
    return formatCurrency(val);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-sky-100 dark:border-slate-800 shadow-xs rounded-xl dark:bg-slate-900">
            <CardContent className="p-2.5 sm:px-4 sm:py-3 flex items-center justify-between">
              <div className="space-y-1.5 w-full">
                <Skeleton className="h-3 w-16 sm:w-20" />
                <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 shrink-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Total Income */}
        <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-emerald-100 dark:border-emerald-900/40 shadow-xs hover:shadow-sm transition-shadow rounded-xl relative group">
          <CardContent className="p-2.5 sm:px-4 sm:py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                  Thu nhập
                </p>
                <button
                  type="button"
                  onClick={toggleShowAmounts}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                  title={showAmounts ? "Ẩn số tiền nhạy cảm" : "Hiển thị số tiền"}
                >
                  {showAmounts ? (
                    <Eye className="h-3 w-3 text-slate-400" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-rose-500" />
                  )}
                </button>
              </div>
              <h3 className="text-xs sm:text-base lg:text-xl font-bold text-emerald-700 dark:text-emerald-300 truncate">
                {renderValue(totalIncome)}
              </h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60 shrink-0 ml-1.5">
              <TrendingUp className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Expense */}
        <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-rose-100 dark:border-rose-900/40 shadow-xs hover:shadow-sm transition-shadow rounded-xl relative group">
          <CardContent className="p-2.5 sm:px-4 sm:py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
                  Chi tiêu
                </p>
                <button
                  type="button"
                  onClick={toggleShowAmounts}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                  title={showAmounts ? "Ẩn số tiền nhạy cảm" : "Hiển thị số tiền"}
                >
                  {showAmounts ? (
                    <Eye className="h-3 w-3 text-slate-400" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-rose-500" />
                  )}
                </button>
              </div>
              <h3 className="text-xs sm:text-base lg:text-xl font-bold text-rose-700 dark:text-rose-300 truncate">
                {renderValue(totalExpense)}
              </h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-rose-50 dark:bg-rose-950/60 rounded-lg text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/60 shrink-0 ml-1.5">
              <TrendingDown className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-sky-100 dark:border-sky-900/40 shadow-xs hover:shadow-sm transition-shadow rounded-xl relative group">
          <CardContent className="p-2.5 sm:px-4 sm:py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 truncate">
                  Số dư
                </p>
                <button
                  type="button"
                  onClick={toggleShowAmounts}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                  title={showAmounts ? "Ẩn số tiền nhạy cảm" : "Hiển thị số tiền"}
                >
                  {showAmounts ? (
                    <Eye className="h-3 w-3 text-slate-400" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-rose-500" />
                  )}
                </button>
              </div>
              <h3
                className={`text-xs sm:text-base lg:text-xl font-bold truncate ${
                  !showAmounts
                    ? "text-slate-700 dark:text-slate-200"
                    : netBalance >= 0
                    ? "text-sky-700 dark:text-sky-300"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {renderValue(netBalance)}
              </h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-sky-50 dark:bg-sky-950/60 rounded-lg text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800/60 shrink-0 ml-1.5">
              <Wallet className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-sm transition-shadow rounded-xl">
          <CardContent className="p-2.5 sm:px-4 sm:py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5 truncate">
                Giao dịch
              </p>
              <h3 className="text-xs sm:text-base lg:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {totalTransactions.toLocaleString("vi-VN")}
              </h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 ml-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
