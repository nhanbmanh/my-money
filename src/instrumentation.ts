/**
 * Next.js Instrumentation Hook
 * Executes automatically when the Next.js server starts up.
 * 
 * Synchronizes ALL background tasks to execute precisely at 00:00:00 Vietnam Time (GMT+7):
 * 1. Calendar Plan Auto-Status Transition (Todo -> In Progress)
 * 2. Wealth Management Daily Asset Snapshots & Fluctuations
 * 3. Scheduled Email Reports
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("@/lib/prisma");
    const { getEndOfTodayVN, getStartOfTodayVN, getMsUntilMidnightVN } = await import("@/lib/date-utils");
    const { recordDailyAssetSnapshot } = await import("@/lib/wealth-service");

    const runMidnightVietnamTasks = async () => {
      try {
        const endOfToday = getEndOfTodayVN();
        const startOfToday = getStartOfTodayVN();

        console.log(`[Background Task] Running Vietnam 00:00 Midnight Tasks at ${new Date().toISOString()} (VN Date: ${startOfToday.toISOString()})`);

        // 1. Calendar Plan Auto-Status Transition (Todo -> In Progress for dates <= today)
        await prisma.calendarPlan.updateMany({
          where: {
            status: 0,
            date: {
              lte: endOfToday,
            },
          },
          data: {
            status: 1,
          },
        });

        // 2. Revert future plans (date > endOfToday) back to Todo (0)
        await prisma.calendarPlan.updateMany({
          where: {
            status: 1,
            date: {
              gt: endOfToday,
            },
          },
          data: {
            status: 0,
          },
        });

        // 3. Record Daily Asset Snapshots & send daily email report for all users in Vietnam Time
        const { buildAndSendDailySnapshotEmail } = await import("@/lib/daily-snapshot-email");
        const users = await prisma.user.findMany({ select: { id: true, email: true } });
        const { fetchClosingPriceDetailsForSymbol } = await import("@/lib/market-ticker-service");

        for (const user of users) {
          try {
            // Fetch holdings with asset info
            const rawHoldings = await prisma.holding.findMany({
              where: { userId: user.id },
              include: { asset: true },
            });

            // Enrich with live market closing prices
            const holdings = await Promise.all(
              rawHoldings.map(async (h) => {
                let currentMarketPrice = 0;
                let currentValue = h.quantity * h.averageCostBasis;

                if (h.asset.isMarketDriven || h.categoryType === 1) {
                  const details = await fetchClosingPriceDetailsForSymbol(
                    h.asset.symbolOrTicker,
                    h.averageCostBasis
                  );
                  currentMarketPrice = details.price || h.averageCostBasis;
                  currentValue = h.quantity * currentMarketPrice;
                }

                return {
                  ...h,
                  currentMarketPrice,
                  currentValue,
                };
              })
            );

            const totalAssets = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
            const totalInvestable = holdings.reduce(
              (sum, h) => sum + (h.investableFlag ? (h.currentValue || 0) : 0),
              0
            );

            // Fetch liabilities
            const liabilities = await prisma.liability.findMany({ where: { userId: user.id } });
            const totalLiabilities = liabilities.reduce((sum, l) => sum + (l.totalDebt || 0), 0);

            const netWorth = totalAssets - totalLiabilities;

            const holdingsSnapshot = holdings.map((h) => ({
              id: h.id,
              assetId: h.assetId,
              symbolOrTicker: h.asset?.symbolOrTicker || "",
              name: h.asset?.assetName || "",
              quantity: h.quantity,
              averageCostBasis: h.averageCostBasis,
              currentMarketPrice: h.currentMarketPrice,
              currentValue: h.currentValue,
              categoryType: h.categoryType,
            }));

            await recordDailyAssetSnapshot(user.id, {
              totalAssets,
              totalLiabilities,
              netWorth,
              totalInvestableAssets: totalInvestable,
              breakdownJson: {
                holdings: holdingsSnapshot,
              },
            });

            // Automatically send daily snapshot email report after successful snapshot creation
            if (user.email) {
              buildAndSendDailySnapshotEmail({
                userId: user.id,
                userEmail: user.email,
              })
                .then((res) => console.log(`[Instrumentation] Successfully sent Daily Snapshot Email to ${res.toEmail}`))
                .catch((emailErr) => console.error(`[Instrumentation] Failed to send Daily Snapshot Email to ${user.email}:`, emailErr));
            }
          } catch (snapshotErr) {
            console.error(`Snapshot error for user ${user.id}:`, snapshotErr);
          }
        }
      } catch (err) {
        console.error("Error running midnight background tasks:", err);
      }
    };

    // Immediate execution on server boot
    runMidnightVietnamTasks();

    // Schedule exact execution at next 00:00:00 Vietnam Time, then every 24 hours
    const msUntilMidnight = getMsUntilMidnightVN();
    console.log(`[Instrumentation] Next Vietnam 00:00:00 task scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);

    setTimeout(() => {
      runMidnightVietnamTasks();
      // Repeat every 24 hours (86,400,000 ms)
      setInterval(runMidnightVietnamTasks, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    // Also run an hourly check as a fallback
    setInterval(runMidnightVietnamTasks, 60 * 60 * 1000);
  }
}
