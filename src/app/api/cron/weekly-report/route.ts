import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAndSendWeeklyReportEmail } from "@/lib/weekly-report-email";
import { subWeeks } from "date-fns";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    const targetDate = subWeeks(new Date(), 1); // Ending week
    const results = [];

    for (const user of users) {
      if (!user.email) continue;
      try {
        const res = await buildAndSendWeeklyReportEmail({
          userId: user.id,
          userEmail: user.email,
          targetDate,
        });
        results.push({ email: user.email, status: "sent", week: res.weekRangeStr });
      } catch (err: any) {
        results.push({ email: user.email, status: "failed", error: err?.message });
      }
    }

    return NextResponse.json({
      message: `Đã gửi báo cáo tuần cho ${results.length} người dùng`,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lỗi tự động gửi báo cáo tuần" },
      { status: 500 }
    );
  }
}
