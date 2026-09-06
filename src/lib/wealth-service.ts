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
  // Snapshot mechanism completely removed as per user directive.
  return;
}

/**
 * Dynamic Time-Series Generator (100% Snapshot-Free).
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

    // Fetch all cashFlows and wealthTransactions after startDate
    const [cashFlows, wealthTransactions] = await Promise.all([
      prisma.cashFlow.findMany({
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
      }),
      prisma.wealthTransaction.findMany({
        where: {
          userId,
          date: { gte: startDate },
        },
        select: {
          date: true,
          assetId: true,
          transactionType: true,
          quantity: true,
        },
        orderBy: { date: "asc" },
      }),
    ]);

    const currentLiquid = currentTotals.totalInvestableAssets;
    const currentHoldings = currentTotals.holdingsSnapshot || [];

    const otherAssetsValue = currentHoldings
      .filter((h) => h.categoryType > 1)
      .reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);

    const totalLiabilities = currentTotals.totalLiabilities;
    const C = otherAssetsValue - totalLiabilities; // Other Assets - Debt

    const continuousSeries: any[] = [];

    for (let i = daysBack; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      if (i === 0) {
        // Today's live data
        continuousSeries.push({
          userId,
          date: d,
          totalAssetsValue: currentTotals.totalAssets,
          totalLiabilitiesValue: currentTotals.totalLiabilities,
          netWorthValue: currentTotals.netWorth,
          totalLiquidValue: currentTotals.totalInvestableAssets,
          breakdownJson: { holdings: currentHoldings },
        });
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

      // B = Sum(Quantity of Growth Asset at Date X * Closing Price at Date X)
      let B = 0;
      const historicalHoldingsForDateX = currentHoldings.map((h) => {
        const currentQty = Number(h.quantity || 0);

        // Backward Quantity Revaluation: Quantity(Date X) = Current Quantity - TxDeltas(after Date X)
        let qtyDeltaAfterDay = 0;
        let hasTxOnOrBeforeDay = false;

        wealthTransactions.forEach((tx) => {
          if (tx.assetId === h.assetId) {
            const txTime = new Date(tx.date);
            if (txTime > dayEOD) {
              const txQty = Number(tx.quantity || 0);
              const txType = (tx.transactionType || "").toUpperCase();
              if (txType === "BUY" || txType === "DEPOSIT" || txType === "TRANSFER_IN") {
                qtyDeltaAfterDay += txQty;
              } else if (txType === "SELL" || txType === "WITHDRAW" || txType === "TRANSFER_OUT") {
                qtyDeltaAfterDay -= txQty;
              }
            } else {
              hasTxOnOrBeforeDay = true;
            }
          }
        });

        let qtyAtX = Math.max(0, currentQty - qtyDeltaAfterDay);

        // Fallback: If date X is strictly before holding creation date and user has no transactions on/before date X, qtyAtX = 0
        if (h.createdAt && !hasTxOnOrBeforeDay) {
          const createdAtTime = new Date(h.createdAt);
          if (dayEOD < createdAtTime) {
            qtyAtX = 0;
          }
        }

        const currentUnitPrice = Number(h.currentMarketPrice || h.averageCostBasis || 0);
        const yesterdayUnitPrice = Number(h.yesterdayPrice || currentUnitPrice);

        let priceAtX = currentUnitPrice;

        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
          yesterday.getDate()
        ).padStart(2, "0")}`;

        if (h.historyMap && Object.keys(h.historyMap).length > 0) {
          if (h.historyMap[dateStr] !== undefined) {
            priceAtX = Number(h.historyMap[dateStr]);
          } else {
            const sortedHistoryDates = Object.keys(h.historyMap).sort();
            let foundPrice: number | null = null;
            for (let k = sortedHistoryDates.length - 1; k >= 0; k--) {
              if (sortedHistoryDates[k] <= dateStr) {
                foundPrice = Number(h.historyMap[sortedHistoryDates[k]]);
                break;
              }
            }
            if (foundPrice !== null) {
              priceAtX = foundPrice;
            } else {
              priceAtX = Number(h.historyMap[sortedHistoryDates[0]]) || currentUnitPrice;
            }
          }
        } else if (dateStr < yesterdayStr) {
          priceAtX = yesterdayUnitPrice;
        } else {
          priceAtX = currentUnitPrice;
        }

        const valAtX = qtyAtX * priceAtX;
        if (h.categoryType === 1 || (h.asset && h.asset.isMarketDriven)) {
          B += valAtX;
        }

        return {
          ...h,
          quantity: qtyAtX,
          currentMarketPrice: priceAtX,
          currentValue: valAtX,
        };
      });

      const netWorthAtX = A + B + C;
      const totalAssetsAtX = A + B + otherAssetsValue;

      continuousSeries.push({
        userId,
        date: d,
        totalAssetsValue: Math.max(0, totalAssetsAtX),
        totalLiabilitiesValue: totalLiabilities,
        netWorthValue: netWorthAtX,
        totalLiquidValue: Math.max(0, A),
        breakdownJson: { holdings: historicalHoldingsForDateX, isGenerated: true },
      });
    }

    return continuousSeries;
  } catch (error) {
    console.error("Error generating wealth time series:", error);
    return [];
  }
}
