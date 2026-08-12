"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Table as TableIcon,
  RefreshCw,
  PieChart as PieIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewBalanceSheet } from "@/components/wealth/overview-balance-sheet";
import { InvestmentPortfolioView } from "@/components/wealth/investment-portfolio-view";
import { AssetManagementTable } from "@/components/wealth/asset-management-table";
import { AssetCreationModal } from "@/components/wealth/asset-creation-modal";
import { AssetCategoryType } from "@/lib/asset-category-types";

export default function WealthManagementPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Tab State
  const [activeView, setActiveView] = useState<"OVERVIEW" | "PORTFOLIO" | "HOLDINGS">("OVERVIEW");

  // Modals
  const [creationModalOpen, setCreationModalOpen] = useState(false);
  const [selectedCategoryType, setSelectedCategoryType] = useState<AssetCategoryType>(0);

  // Fetch wealth data from backend API
  const fetchWealthData = async () => {
    if (data) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/wealth");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Error loading wealth data:", err);
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  };

  useEffect(() => {
    fetchWealthData();
  }, [refreshKey]);

  const handleOpenCreation = (catType: AssetCategoryType = 0) => {
    setSelectedCategoryType(catType);
    setCreationModalOpen(true);
  };

  useEffect(() => {
    const handleOpenCreationEvent = (e: any) => {
      const catType = e.detail?.categoryType !== undefined ? e.detail.categoryType : 0;
      handleOpenCreation(catType);
    };
    window.addEventListener("open-wealth-creation-modal", handleOpenCreationEvent);
    return () => {
      window.removeEventListener("open-wealth-creation-modal", handleOpenCreationEvent);
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="w-full space-y-6 animate-pulse py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-32 rounded-2xl bg-muted/60 p-5 space-y-3 border border-slate-200/50 dark:border-slate-800/50"
            >
              <Skeleton className="h-4 w-32 rounded-lg" />
              <Skeleton className="h-8 w-48 rounded-xl bg-sky-500/20" />
              <Skeleton className="h-4 w-24 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-muted/60 p-6 space-y-4 border border-slate-200/50 dark:border-slate-800/50">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    totalInvestableAssets: 0,
    totalInvestedCostBasis: 0,
    totalMarketValueInvestments: 0,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
  };

  const macroCategories = data?.macroCategories || [];
  const holdings = data?.holdings || [];
  const liabilities = data?.liabilities || [];
  const breakdownByMacro = data?.breakdownByMacro || [];

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 pb-12 relative">
      {/* Top Animated Loading Bar & Floating Badge */}
      {isRefetching && (
        <div className="fixed top-0 left-0 right-0 z-[300] pointer-events-none">
          <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 animate-pulse" />
          <div className="absolute top-4 right-6 backdrop-blur-md bg-slate-900/90 border border-sky-500/30 text-sky-400 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-400" />
            <span>Đang cập nhật dữ liệu gia sản...</span>
          </div>
        </div>
      )}

      {/* Main Container Content */}
      <div
        className={`space-y-6 transition-opacity duration-200 ${
          isRefetching ? "opacity-60 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Main View Tabs Bar */}
        <div className="grid grid-cols-3 gap-1 bg-muted/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full">
          <button
            onClick={() => setActiveView("OVERVIEW")}
            className={`flex items-center justify-center gap-2 px-2 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeView === "OVERVIEW"
                ? "bg-background text-foreground shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Bảng Cân Đối Gia Sản"
          >
            <ShieldCheck className="h-4.5 w-4.5 text-sky-500 shrink-0" />
            <span className="hidden sm:inline truncate">Bảng Cân Đối Gia Sản</span>
          </button>

          <button
            onClick={() => setActiveView("PORTFOLIO")}
            className={`flex items-center justify-center gap-2 px-2 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeView === "PORTFOLIO"
                ? "bg-background text-foreground shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Danh Mục Đầu Tư"
          >
            <PieIcon className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
            <span className="hidden sm:inline truncate">Danh Mục Đầu Tư</span>
          </button>

          <button
            onClick={() => setActiveView("HOLDINGS")}
            className={`flex items-center justify-center gap-2 px-2 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeView === "HOLDINGS"
                ? "bg-background text-foreground shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Bảng Số Dư & Quản Lý Tài Sản"
          >
            <TableIcon className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            <span className="hidden sm:inline truncate">Bảng Số Dư & Quản Lý Tài Sản</span>
          </button>
        </div>

        {/* Tab Content Display */}
        {activeView === "OVERVIEW" && (
          <OverviewBalanceSheet
            summary={summary}
            macroCategories={macroCategories}
            breakdownByMacro={breakdownByMacro}
            liabilities={liabilities}
            snapshots={data?.snapshots || []}
            holdings={holdings}
            transactions={data?.transactions || []}
            cashFlows={data?.cashFlows || []}
          />
        )}

        {activeView === "PORTFOLIO" && (
          <InvestmentPortfolioView summary={summary} holdings={holdings} />
        )}

        {activeView === "HOLDINGS" && (
          <AssetManagementTable
            holdings={holdings}
            transactions={data?.transactions || []}
            isLoading={loading || isRefetching}
            onOpenCreationModal={(catType) => handleOpenCreation(catType)}
            onRefreshData={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </div>

      {/* Asset Creation Modal */}
      <AssetCreationModal
        open={creationModalOpen}
        onOpenChange={setCreationModalOpen}
        selectedCategoryType={selectedCategoryType}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
