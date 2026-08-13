/**
 * Next.js Instrumentation Hook
 * Executes automatically when the Next.js server starts up.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("@/lib/prisma");

    const runAutoStatusUpdate = async () => {
      try {
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

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
      } catch (err) {
        console.error("Background auto status update error:", err);
      }
    };

    // Immediate execution on server boot
    runAutoStatusUpdate();

    // Periodic execution every 1 hour (3600000 ms)
    setInterval(runAutoStatusUpdate, 60 * 60 * 1000);
  }
}
