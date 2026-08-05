import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildAndSendMonthlyReportEmail } from "@/lib/monthly-report-email";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = session.user.id;
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true },
    });

    if (!dbUser || !dbUser.email) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin email của tài khoản" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { month, storedBudgets } = body;

    if (!month || typeof month !== "string") {
      return NextResponse.json(
        { error: "Vui lòng chọn tháng hợp lệ (YYYY-MM)" },
        { status: 400 }
      );
    }

    const result = await buildAndSendMonthlyReportEmail({
      userId,
      userEmail: dbUser.email,
      monthStr: month,
      storedBudgets: storedBudgets || {},
    });

    return NextResponse.json({
      success: true,
      message: `Đã gửi báo cáo Tháng ${result.displayMonth} tới ${result.toEmail} thành công!`,
      details: result,
    });
  } catch (error: any) {
    console.error("Failed to send monthly report email:", error);
    return NextResponse.json(
      { error: error?.message || "Đã xảy ra lỗi khi gửi email báo cáo" },
      { status: 500 }
    );
  }
}
