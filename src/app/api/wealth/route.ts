import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultMacroCategories } from "@/lib/wealth-service";
import { fetchClosingPriceForSymbol } from "@/lib/market-ticker-service";

export async function GET() {
  try {
    const session = await auth();
    let userId = session?.user?.id;

    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) userId = firstUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure default macro categories
    const macroCategories = await ensureDefaultMacroCategories();

    // Fetch user holdings directly linked to macro categories
    const rawHoldings = await prisma.holding.findMany({
      where: { userId },
      include: {
        macroCategory: true,
        asset: true,
        linkedLiability: true
      },
      orderBy: { createdAt: "asc" }
    });

    // Enrich holdings dynamically with realtime market price for STOCKS
    const holdings = await Promise.all(
      rawHoldings.map(async (h) => {
        let currentMarketPrice = 0;
        let currentValue = h.quantity * h.averageCostBasis;

        if (h.asset.isMarketDriven || h.macroCategory.code === "STOCKS") {
          const livePrice = await fetchClosingPriceForSymbol(h.asset.symbolOrTicker, h.averageCostBasis);
          currentMarketPrice = livePrice || h.averageCostBasis;
          currentValue = h.quantity * currentMarketPrice;
        }

        return {
          ...h,
          currentMarketPrice,
          currentValue
        };
      })
    );

    // Fetch liabilities
    const liabilities = await prisma.liability.findMany({
      where: { userId },
      include: { linkedHolding: { include: { asset: true } } },
      orderBy: { createdAt: "desc" }
    });

    // Fetch recent wealth transactions
    const transactions = await prisma.wealthTransaction.findMany({
      where: { userId },
      include: { macroCategory: true, asset: true },
      orderBy: { date: "desc" },
      take: 50
    });

    // Calculate aggregated totals
    let totalAssets = 0;
    let totalInvestableAssets = 0;
    let totalInvestedCostBasis = 0;
    let totalMarketValueInvestments = 0;

    const breakdownByMacro: Record<string, { code: string; name: string; value: number }> = {};
    macroCategories.forEach((cat) => {
      breakdownByMacro[cat.id] = { code: cat.code, name: cat.name, value: 0 };
    });

    holdings.forEach((h) => {
      totalAssets += h.currentValue;

      // Investable Assets formula: Strictly LIQUID (Tài sản thanh khoản - Tiền mặt / Tiền gửi)
      if (h.macroCategory.code === "LIQUID") {
        totalInvestableAssets += h.currentValue;
      }

      if (h.asset.assetClass !== "CASH") {
        totalInvestedCostBasis += h.quantity * h.averageCostBasis;
        totalMarketValueInvestments += h.currentValue;
      }

      if (breakdownByMacro[h.macroCategoryId]) {
        breakdownByMacro[h.macroCategoryId].value += h.currentValue;
      }
    });

    const totalLiabilities = liabilities.reduce((acc, l) => acc + l.totalDebt, 0);
    const netWorth = totalAssets - totalLiabilities;
    const unrealizedPnL = totalMarketValueInvestments - totalInvestedCostBasis;
    const unrealizedPnLPercent = totalInvestedCostBasis > 0 ? (unrealizedPnL / totalInvestedCostBasis) * 100 : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalAssets,
        totalLiabilities,
        netWorth,
        totalInvestableAssets,
        totalInvestedCostBasis,
        totalMarketValueInvestments,
        unrealizedPnL,
        unrealizedPnLPercent
      },
      macroCategories,
      holdings,
      liabilities,
      transactions,
      breakdownByMacro: Object.values(breakdownByMacro)
    });
  } catch (error: any) {
    console.error("Error fetching wealth data:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
