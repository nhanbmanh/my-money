import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getEndOfTodayVN } from "@/lib/date-utils";

export async function GET(req: Request) {
  try {
    const endOfToday = getEndOfTodayVN();

    // Auto update Todo (0) to In Progress (1) for plans that reached execution date
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

    return NextResponse.json({
      success: true,
      updatedToInProgress: updatedCount.count,
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
