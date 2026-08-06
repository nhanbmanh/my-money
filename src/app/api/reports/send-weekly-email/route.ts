import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildAndSendWeeklyReportEmail } from "@/lib/weekly-report-email";
import { subWeeks } from "date-fns";

export async function POST(req: Request) {
  const session = await auth();

  let targetEmail = session?.user?.email;
  let targetUserId = session?.user?.id;
  let targetDate = subWeeks(new Date(), 1);

  try {
    const body = await req.json().catch(() => ({}));
    if (body.email) {
      targetEmail = body.email;
    }
    if (body.targetDate) {
      targetDate = new Date(body.targetDate);
    }
  } catch {
    // default to session or body
  }

  if (!targetEmail) {
    return NextResponse.json(
      { error: "Vui lòng cung cấp email nhận báo cáo" },
      { status: 400 }
    );
  }

  try {
    const result = await buildAndSendWeeklyReportEmail({
      userId: targetUserId,
      userEmail: targetEmail,
      targetDate,
    });

    return NextResponse.json({
      message: `Đã gửi báo cáo tuần (${result.weekRangeStr}) tới ${targetEmail} thành công!`,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Không thể gửi email báo cáo tuần" },
      { status: 500 }
    );
  }
}
