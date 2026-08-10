import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchClosingPriceForSymbol } from "@/lib/market-ticker-service";
import { ASSET_CATEGORY_TYPES } from "@/lib/asset-category-types";
import { getOrCreateLiquidHolding, recordDailyAssetSnapshot } from "@/lib/wealth-service";

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

    // Ensure single merged liquid holding for user
    await getOrCreateLiquidHolding(userId);

    // Fetch user holdings
    const rawHoldings = await prisma.holding.findMany({
      where: { userId },
      include: {
        asset: true,
        linkedLiability: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Enrich holdings dynamically with realtime market price for STOCKS / Type 1
    const holdings = await Promise.all(
      rawHoldings.map(async (h) => {
        let currentMarketPrice = 0;
        let currentValue = h.quantity * h.averageCostBasis;

        if (h.asset.isMarketDriven || h.categoryType === 1) {
          const livePrice = await fetchClosingPriceForSymbol(
            h.asset.symbolOrTicker,
            h.averageCostBasis
          );
          currentMarketPrice = livePrice || h.averageCostBasis;
          currentValue = h.quantity * currentMarketPrice;
        }

        return {
          ...h,
          currentMarketPrice,
          currentValue,
        };
      })
    );

    // Fetch liabilities
    const liabilities = await prisma.liability.findMany({
      where: { userId },
      include: { linkedHolding: { include: { asset: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Fetch recent wealth transactions
    const transactions = await prisma.wealthTransaction.findMany({
      where: { userId },
      include: { asset: true },
      orderBy: { date: "desc" },
      take: 50,
    });

    // Calculate aggregated totals
    let totalAssets = 0;
    let totalInvestableAssets = 0; // Strictly Type 0 (Tài sản thanh khoản / Tiền mặt)
    let totalInvestedCostBasis = 0;
    let totalMarketValueInvestments = 0;

    const breakdownByCategoryType: Record<
      number,
      { type: number; code: string; name: string; value: number; count: number }
    > = {
      0: { type: 0, code: "LIQUID", name: ASSET_CATEGORY_TYPES[0].name, value: 0, count: 0 },
      1: { type: 1, code: "GROWTH", name: ASSET_CATEGORY_TYPES[1].name, value: 0, count: 0 },
      2: { type: 2, code: "PHYSICAL", name: ASSET_CATEGORY_TYPES[2].name, value: 0, count: 0 },
      3: { type: 3, code: "DEBT_MORTGAGE", name: ASSET_CATEGORY_TYPES[3].name, value: 0, count: 0 },
      4: { type: 4, code: "LENDING", name: ASSET_CATEGORY_TYPES[4].name, value: 0, count: 0 },
    };

    holdings.forEach((h) => {
      totalAssets += h.currentValue;

      const catType = h.categoryType >= 0 && h.categoryType <= 4 ? h.categoryType : 0;

      // Tài sản thanh khoản KPI: Strictly Type 0 (Tiền mặt / Thanh khoản)
      if (catType === 0) {
        totalInvestableAssets += h.currentValue;
      }

      if (h.asset.assetClass !== "CASH" && catType !== 0) {
        totalInvestedCostBasis += h.quantity * h.averageCostBasis;
        totalMarketValueInvestments += h.currentValue;
      }

      if (breakdownByCategoryType[catType]) {
        breakdownByCategoryType[catType].value += h.currentValue;
        breakdownByCategoryType[catType].count += 1;
      }
    });

    const totalLiabilities = liabilities.reduce((acc, l) => acc + l.totalDebt, 0);
    const netWorth = totalAssets - totalLiabilities;
    const unrealizedPnL = totalMarketValueInvestments - totalInvestedCostBasis;
    const unrealizedPnLPercent =
      totalInvestedCostBasis > 0 ? (unrealizedPnL / totalInvestedCostBasis) * 100 : 0;

    const breakdownList = Object.values(breakdownByCategoryType);

    // Auto-record today's Asset Snapshot in PostgreSQL
    await recordDailyAssetSnapshot(userId, {
      totalAssets,
      totalLiabilities,
      netWorth,
      totalInvestableAssets,
      breakdownJson: breakdownList,
    });

    // Fetch all historical daily snapshots for user
    const snapshots = await prisma.assetSnapshot.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    });

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
        unrealizedPnLPercent,
      },
      holdings,
      liabilities,
      transactions,
      snapshots,
      breakdownByCategoryType: breakdownList,
      breakdownByMacro: breakdownList, // Backwards compatibility for breakdown rendering
    });
  } catch (error: any) {
    console.error("Error fetching wealth data:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
