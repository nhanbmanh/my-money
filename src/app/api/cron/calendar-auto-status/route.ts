import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Auto update all Todo (0) plans to In Progress (1) if date <= end of today
    const result = await prisma.calendarPlan.updateMany({
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
      message: `Successfully auto-updated ${result.count} plans to In Progress`,
      updatedCount: result.count,
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
