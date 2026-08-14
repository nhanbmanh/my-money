import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEndOfTodayVN } from "@/lib/date-utils";

export async function GET(req: Request) {
  try {
    const endOfToday = getEndOfTodayVN();

    // 1. Auto update Todo (0) to In Progress (1) for plans that reached execution date
    const updatedCount = await prisma.calendarPlan.updateMany({
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

    // 2. Revert any future plans back to Todo (0)
    const revertedCount = await prisma.calendarPlan.updateMany({
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

    return NextResponse.json({
      success: true,
      updatedToInProgress: updatedCount.count,
      revertedToTodo: revertedCount.count,
    });
  } catch (error: any) {
    console.error("Cron /api/cron/calendar-auto-status error:", error);
    return NextResponse.json(
      { error: "Server error during calendar status auto transition" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
