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
