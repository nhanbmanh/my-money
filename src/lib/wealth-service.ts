import { prisma } from "@/lib/prisma";
import { getStartOfTodayVN } from "@/lib/date-utils";

export const DEFAULT_MACRO_CATEGORIES = [
  {
    code: "LIQUID",
    name: "Tài sản thanh khoản (tiền mặt/tiền gửi)",
    description: "Tiền mặt, tài khoản ngân hàng, ví điện tử, tiền gửi tiết kiệm",
    orderIndex: 1,
  },
  {
    code: "REAL_ESTATE",
    name: "Bất động sản & vật thể (đất/tài sản trên đất)",
    description: "Nhà ở, đất đai, bất động sản cho thuê, tài sản gắn liền với đất",
    orderIndex: 2,
  },
  {
    code: "PHYSICAL_ASSETS",
    name: "Tài sản vật chất (xe cộ, hàng hóa)",
    description: "Xe cộ, vàng miếng, trang sức, hàng hóa, thiết bị có giá trị",
    orderIndex: 3,
  },
  {
    code: "STOCKS",
    name: "Cổ phiếu & tăng trưởng",
    description: "Cổ phiếu niêm yết, chứng chỉ quỹ (CCQ), Crypto",
    orderIndex: 4,
  },
];

export async function ensureDefaultMacroCategories() {
  const activeCodes = DEFAULT_MACRO_CATEGORIES.map((c) => c.code);

  for (const cat of DEFAULT_MACRO_CATEGORIES) {
    await prisma.macroCategory.upsert({
      where: { code: cat.code },
      update: {
        name: cat.name,
        description: cat.description,
        orderIndex: cat.orderIndex,
      },
      create: cat,
    });
  }

  return prisma.macroCategory.findMany({
    where: { code: { in: activeCodes } },
    orderBy: { orderIndex: "asc" },
  });
}

/**
  Retrieves or creates the single unified Liquid Cash asset holding (categoryType: 0) for a user.
 * Automatically merges any duplicate liquid holdings created previously.
 */
export async function getOrCreateLiquidHolding(userId: string) {
  // Find all liquid holdings for user (categoryType 0, CASH_VND, or macroCategory LIQUID)
  const liquidHoldings = await prisma.holding.findMany({
    where: {
      userId,
      OR: [
        { categoryType: 0 },
        { asset: { symbolOrTicker: "CASH_VND" } },
        { macroCategory: { code: "LIQUID" } },
      ],
    },
    include: { asset: true },
    orderBy: { createdAt: "asc" },
  });

  if (liquidHoldings.length > 0) {
    const primary = liquidHoldings[0];

    // If there are duplicate liquid holdings, merge their balances into primary and delete duplicates
    if (liquidHoldings.length > 1) {
      let mergedBalance = primary.currentValue || primary.averageCostBasis || 0;
      for (let i = 1; i < liquidHoldings.length; i++) {
        mergedBalance += liquidHoldings[i].currentValue || liquidHoldings[i].averageCostBasis || 0;
        await prisma.holding.delete({ where: { id: liquidHoldings[i].id } });
      }

      return prisma.holding.update({
        where: { id: primary.id },
        data: {
          categoryType: 0,
          quantity: 1,
          averageCostBasis: mergedBalance,
          currentValue: mergedBalance,
          investableFlag: true,
        },
        include: { asset: true },
      });
    }

    // Ensure primary has categoryType: 0
    if (primary.categoryType !== 0) {
      return prisma.holding.update({
        where: { id: primary.id },
        data: { categoryType: 0, investableFlag: true },
        include: { asset: true },
      });
    }

    return primary;
  }

  // Create default CASH_VND asset if missing
  let defaultAsset = await prisma.asset.findFirst({
    where: { symbolOrTicker: "CASH_VND" },
  });

  if (!defaultAsset) {
    defaultAsset = await prisma.asset.create({
      data: {
        symbolOrTicker: "CASH_VND",
        assetName: "Tài sản thanh khoản",
        assetClass: "CASH",
        isMarketDriven: false,
      },
    });
  }

  return prisma.holding.create({
    data: {
      userId,
      categoryType: 0,
      assetId: defaultAsset.id,
      quantity: 1,
      averageCostBasis: 0,
      currentValue: 0,
      investableFlag: true,
    },
    include: { asset: true },
  });
}

/**
 * Synchronizes Cashflow transactions (Income / Expense) with Wealth Management Liquid Assets.
 * Automatically adjusts liquid asset balance on create, edit, and delete actions.
 */
export async function adjustLiquidAssetBalance(
  userId: string,
  delta: number,
  sourceId?: string | null
) {
  if (!delta || delta === 0) return;

  try {
    const targetHolding = await getOrCreateLiquidHolding(userId);

    const currentBalance = targetHolding.currentValue || targetHolding.averageCostBasis || 0;
    const newBalance = Math.max(0, currentBalance + delta);

    await prisma.holding.update({
      where: { id: targetHolding.id },
      data: {
        quantity: 1,
        averageCostBasis: newBalance,
        currentValue: newBalance,
        investableFlag: true,
      },
    });
  } catch (err) {
    console.error("Error in adjustLiquidAssetBalance:", err);
  }
}

/**
 * Automatically records or updates today's Asset Snapshot for a user in PostgreSQL.
 */
export async function recordDailyAssetSnapshot(
  userId: string,
  totals: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    totalInvestableAssets: number;
    breakdownJson?: any;
  }
) {
  try {
    // Normalize date to 00:00:00.000 Vietnam Time (GMT+7)
    const today = getStartOfTodayVN();

    await prisma.assetSnapshot.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        totalAssetsValue: totals.totalAssets,
        totalLiabilitiesValue: totals.totalLiabilities,
        netWorthValue: totals.netWorth,
        totalLiquidValue: totals.totalInvestableAssets,
        breakdownJson: totals.breakdownJson || undefined,
      },
      create: {
        userId,
        date: today,
        totalAssetsValue: totals.totalAssets,
        totalLiabilitiesValue: totals.totalLiabilities,
        netWorthValue: totals.netWorth,
        totalLiquidValue: totals.totalInvestableAssets,
        breakdownJson: totals.breakdownJson || undefined,
      },
    });
  } catch (err) {
    console.error("Error recording daily asset snapshot:", err);
  }
}

/**
 * Dynamic Time-Series Generator & Backfiller.
 * Calculates Net Worth at any past date X using the exact formula:
 * A = Liquid Cash Today - CashFlows logged strictly after Date X
 * B = Sum(Quantity of Growth Asset * Closing Price at Date X)
 * C = Other Fixed Assets - Total Liabilities
 * Net Worth at Date X = A + B + C
 */
export async function getWealthTimeSeriesAndSnapshots(
  userId: string,
  currentTotals: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    totalInvestableAssets: number;
    holdingsSnapshot: any[];
  },
  daysBack: number = 30
) {
  try {
    const today = getStartOfTodayVN();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysBack);

    // 1. Fetch existing snapshots in the date range
    const existingSnapshots = await prisma.assetSnapshot.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });

    const snapshotMap = new Map<string, any>();
    existingSnapshots.forEach((s) => {
      const dateKey = new Date(s.date).toISOString().split("T")[0];
      snapshotMap.set(dateKey, s);
    });

    // 2. Fetch all cashFlows after startDate
    const cashFlows = await prisma.cashFlow.findMany({
      where: {
        userId,
        datetime: { gte: startDate },
      },
      select: {
        datetime: true,
        cashType: true,
        amountOfMoney: true,
      },
      orderBy: { datetime: "asc" },
    });

    // 3. Separate holdings into Growth Assets (B), Liquid Assets (A), and Other Assets (C)
    const currentLiquid = currentTotals.totalInvestableAssets;
    const currentHoldings = currentTotals.holdingsSnapshot || [];

    // Filter growth items (categoryType === 1 or non-cash market driven)
    const growthHoldings = currentHoldings.filter(
      (h) => h.categoryType === 1 || (h.asset && h.asset.isMarketDriven)
    );

    // Filter other assets (categoryType === 2, 3, 4)
    const otherAssetsValue = currentHoldings
      .filter((h) => h.categoryType > 1)
      .reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);

    const totalLiabilities = currentTotals.totalLiabilities;
    const C = otherAssetsValue - totalLiabilities; // Other Assets - Debt

    // 4. Build continuous daily series going from daysBack to 0 (today)
    const continuousSnapshots: any[] = [];
    const missingUpserts: any[] = [];

    for (let i = daysBack; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];

      if (i === 0) {
        // Today's live snapshot
        const todaySnapshot = {
          userId,
          date: d,
          totalAssetsValue: currentTotals.totalAssets,
          totalLiabilitiesValue: currentTotals.totalLiabilities,
          netWorthValue: currentTotals.netWorth,
          totalLiquidValue: currentTotals.totalInvestableAssets,
          breakdownJson: { holdings: currentHoldings },
        };
        continuousSnapshots.push(todaySnapshot);
        missingUpserts.push(todaySnapshot);
        continue;
      }

      const dayEOD = new Date(d);
      dayEOD.setHours(23, 59, 59, 999);

      // A = Liquid Cash - Net CashFlows strictly AFTER dayEOD
      let netFlowAfterDay = 0;
      cashFlows.forEach((cf) => {
        const cfTime = new Date(cf.datetime);
        if (cfTime > dayEOD) {
          if (cf.cashType === "Income") netFlowAfterDay += cf.amountOfMoney;
          else netFlowAfterDay -= cf.amountOfMoney;
        }
      });
      const A = currentLiquid - netFlowAfterDay;

      // B = Sum(Quantity of Growth Asset * Closing Price at Date X)
      const existing = snapshotMap.get(dateKey);
      let B = 0;

      let snapshotHoldingsMap: Record<string, any> = {};
      if (existing && existing.breakdownJson) {
        const json = existing.breakdownJson;
        const list = Array.isArray(json) ? json : json.holdings || [];
        if (Array.isArray(list)) {
          list.forEach((item: any) => {
            if (item.id) snapshotHoldingsMap[item.id] = item;
            if (item.assetId) snapshotHoldingsMap[item.assetId] = item;
          });
        }
      }

      growthHoldings.forEach((h) => {
        const qty = Number(h.quantity || 0);
        const snapItem = snapshotHoldingsMap[h.id] || snapshotHoldingsMap[h.assetId];

        // Closing price at Date X: from DB snapshot if recorded, otherwise current market price
        const priceAtX = snapItem
          ? Number(snapItem.currentMarketPrice || snapItem.averageCostBasis || h.currentMarketPrice || 0)
          : Number(h.currentMarketPrice || h.averageCostBasis || 0);

        B += qty * priceAtX;
      });

      // Net Worth at Date X = A + B + C
      const netWorthAtX = A + B + C;
      const totalAssetsAtX = A + B + otherAssetsValue;

      const generatedSnapshot = {
        userId,
        date: d,
        totalAssetsValue: Math.max(0, totalAssetsAtX),
        totalLiabilitiesValue: totalLiabilities,
        netWorthValue: netWorthAtX,
        totalLiquidValue: Math.max(0, A),
        breakdownJson: { holdings: currentHoldings, isGenerated: true },
      };

      continuousSnapshots.push(generatedSnapshot);
      if (!existing) {
        missingUpserts.push(generatedSnapshot);
      }
    }

    // 5. Async batch backfill missing snapshots to PostgreSQL in background
    if (missingUpserts.length > 0) {
      Promise.all(
        missingUpserts.map((s) =>
          prisma.assetSnapshot.upsert({
            where: {
              userId_date: {
                userId: s.userId,
                date: s.date,
              },
            },
            update: {
              totalAssetsValue: s.totalAssetsValue,
              totalLiabilitiesValue: s.totalLiabilitiesValue,
              netWorthValue: s.netWorthValue,
              totalLiquidValue: s.totalLiquidValue,
              breakdownJson: s.breakdownJson,
            },
            create: s,
          })
        )
      ).catch((err) => console.error("Async backfill snapshot error:", err));
    }

    return continuousSnapshots;
  } catch (err) {
    console.error("Error in getWealthTimeSeriesAndSnapshots:", err);
    return [];
  }
}
