import { NextResponse } from "next/server";
import { format, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { buildAndSendMonthlyReportEmail } from "@/lib/monthly-report-email";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { email: { not: "" } },
      select: { id: true, email: true },
    });

    const now = new Date();
    // Default: Previous month or current month report
    const targetMonthStr = format(subMonths(now, 0), "yyyy-MM");

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        await buildAndSendMonthlyReportEmail({
          userId: user.id,
          userEmail: user.email,
          monthStr: targetMonthStr,
        });
        sentCount++;
      } catch (err: any) {
        errors.push(`User ${user.email}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      targetMonthStr,
      totalUsers: users.length,
      errors,
    });
  } catch (error: any) {
    console.error("Cron monthly report failed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
