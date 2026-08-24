import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchClosingPriceDetailsForSymbol } from "@/lib/market-ticker-service";
import { ASSET_CATEGORY_TYPES } from "@/lib/asset-category-types";
import { getOrCreateLiquidHolding, recordDailyAssetSnapshot } from "@/lib/wealth-service";
import { buildAndSendDailySnapshotEmail } from "@/lib/daily-snapshot-email";

/**
 * Automated Cron Endpoint for Daily Asset Snapshot Recording & Email Reporting.
 * Scheduled to run automatically at 00:00:00 VNT (Vietnam Time GMT+7) every midnight.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET || "mymoney_daily_snapshot_cron_secret";

    // Optional secret key verification for production security
    if (secret && secret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron key" }, { status: 401 });
    }

    const users = await prisma.user.findMany({ select: { id: true, email: true, username: true } });
    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No users found for daily snapshot" });
    }

    const results = [];

    for (const user of users) {
      try {
        const userId = user.id;

        // 1. Fetch user holdings, liabilities
        const [_, rawHoldings, liabilities] = await Promise.all([
          getOrCreateLiquidHolding(userId),
          prisma.holding.findMany({
            where: { userId },
            include: { asset: true, linkedLiability: true },
          }),
          prisma.liability.findMany({
            where: { userId },
          }),
        ]);

        // 2. Fetch closing market prices
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

        // 3. Calculate totals
        let totalAssets = 0;
        let totalInvestableAssets = 0;

        const breakdownByCategoryType: Record<number, { type: number; name: string; value: number; count: number }> = {
          0: { type: 0, name: ASSET_CATEGORY_TYPES[0].name, value: 0, count: 0 },
          1: { type: 1, name: ASSET_CATEGORY_TYPES[1].name, value: 0, count: 0 },
          2: { type: 2, name: ASSET_CATEGORY_TYPES[2].name, value: 0, count: 0 },
          3: { type: 3, name: ASSET_CATEGORY_TYPES[3].name, value: 0, count: 0 },
          4: { type: 4, name: ASSET_CATEGORY_TYPES[4].name, value: 0, count: 0 },
        };

        holdings.forEach((h) => {
          totalAssets += h.currentValue;
          const catType = h.categoryType >= 0 && h.categoryType <= 4 ? h.categoryType : 0;
          if (catType === 0) totalInvestableAssets += h.currentValue;

          if (breakdownByCategoryType[catType]) {
            breakdownByCategoryType[catType].value += h.currentValue;
            breakdownByCategoryType[catType].count += 1;
          }
        });

        const totalLiabilities = liabilities.reduce((acc, l) => acc + l.totalDebt, 0);
        const netWorth = totalAssets - totalLiabilities;
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

        // 4. Record daily asset snapshot in PostgreSQL
        await recordDailyAssetSnapshot(userId, {
          totalAssets,
          totalLiabilities,
          netWorth,
          totalInvestableAssets,
          breakdownJson: {
            byCategory: breakdownList,
            holdings: holdingsSnapshot,
          },
        });

        // 5. Send automated daily snapshot email report to user
        const emailResult = await buildAndSendDailySnapshotEmail({
          userId,
          userEmail: user.email,
        });

        results.push({
          userId,
          email: user.email,
          netWorth,
          emailSent: emailResult.success,
        });
      } catch (err: any) {
        console.error(`Error processing cron snapshot for user ${user.id}:`, err);
        results.push({ userId: user.id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processedCount: results.length,
      details: results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute daily cron snapshot" }, { status: 500 });
  }
}
