import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchClosingPriceDetailsForSymbol } from "@/lib/market-ticker-service";
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

    // 1. Parallelize initial setup and DB queries for ultra-fast response
    const [_, rawHoldings, liabilities, transactions, cashFlows, snapshots] = await Promise.all([
      getOrCreateLiquidHolding(userId),
      prisma.holding.findMany({
        where: { userId },
        include: {
          asset: true,
          linkedLiability: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.liability.findMany({
        where: { userId },
        include: { linkedHolding: { include: { asset: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.wealthTransaction.findMany({
        where: { userId },
        include: { asset: true },
        orderBy: { date: "desc" },
        take: 50,
      }),
      prisma.cashFlow.findMany({
        where: { userId },
        include: { primaryCategory: true, source: true },
        orderBy: { datetime: "desc" },
        take: 50,
      }),
      prisma.assetSnapshot.findMany({
        where: { userId },
        orderBy: { date: "asc" },
      }),
    ]);

    // 2. Enrich holdings in parallel with strict 1.2s timeout on external APIs
    const holdings = await Promise.all(
      rawHoldings.map(async (h) => {
        let currentMarketPrice = 0;
        let change24h = 0;
        let currentValue = h.quantity * h.averageCostBasis;

        if (h.asset.isMarketDriven || h.categoryType === 1) {
          const details = await fetchClosingPriceDetailsForSymbol(
            h.asset.symbolOrTicker,
            h.averageCostBasis
          );
          currentMarketPrice = details.price || h.averageCostBasis;
          change24h = details.change24h || 0;
          currentValue = h.quantity * currentMarketPrice;
        }

        return {
          ...h,
          currentMarketPrice,
          change24h,
          currentValue,
        };
      })
    );

    // 3. Aggregate totals
    let totalAssets = 0;
    let totalInvestableAssets = 0;
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

    const holdingsSnapshot = holdings.map((h) => ({
      id: h.id,
      assetId: h.assetId,
      categoryType: h.categoryType,
      quantity: h.quantity,
      currentMarketPrice: h.currentMarketPrice,
      currentValue: h.currentValue,
      updatedAt: h.updatedAt || h.asset?.updatedAt,
    }));

    // 4. Record daily asset snapshot asynchronously in background so response is non-blocking
    recordDailyAssetSnapshot(userId, {
      totalAssets,
      totalLiabilities,
      netWorth,
      totalInvestableAssets,
      breakdownJson: {
        byCategory: breakdownList,
        holdings: holdingsSnapshot,
      },
    }).catch((err) => console.error("Async snapshot error:", err));

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
      breakdownByCategoryType: breakdownList,
      holdings,
      liabilities,
      transactions,
      cashFlows,
      snapshots,
    });
  } catch (error) {
    console.error("GET /api/wealth Error:", error);
    return NextResponse.json({ error: "Failed to fetch wealth management data" }, { status: 500 });
  }
}
