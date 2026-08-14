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

        // 3. Record Daily Asset Snapshots for all users in Vietnam Time
        const users = await prisma.user.findMany({ select: { id: true } });
        for (const user of users) {
          try {
            // Fetch total holdings value
            const holdings = await prisma.holding.findMany({ where: { userId: user.id } });
            const totalAssets = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
            const totalInvestable = holdings.reduce(
              (sum, h) => sum + (h.investableFlag ? (h.currentValue || 0) : 0),
              0
            );

            // Fetch liabilities
            const liabilities = await prisma.liability.findMany({ where: { userId: user.id } });
            const totalLiabilities = liabilities.reduce((sum, l) => sum + (l.totalDebt || 0), 0);

            const netWorth = totalAssets - totalLiabilities;

            await recordDailyAssetSnapshot(user.id, {
              totalAssets,
              totalLiabilities,
              netWorth,
              totalInvestableAssets: totalInvestable,
            });
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
