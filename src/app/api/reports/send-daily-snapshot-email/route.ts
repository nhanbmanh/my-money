import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildAndSendDailySnapshotEmail } from "@/lib/daily-snapshot-email";

export async function POST(req: Request) {
  try {
    const session = await auth();
    let userId = session?.user?.id;
    let targetEmail = session?.user?.email;

    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) {
        userId = firstUser.id;
        targetEmail = firstUser.email;
      }
    }

    if (!userId || !targetEmail) {
      return NextResponse.json({ error: "Không tìm thấy thông tin email của tài khoản" }, { status: 400 });
    }

    const result = await buildAndSendDailySnapshotEmail({
      userId,
      userEmail: targetEmail,
    });

    return NextResponse.json({
      success: true,
      message: `Đã gửi Báo báo Snapshot Chốt Sổ Ngày ${result.dateStrStr} tới email ${result.toEmail} thành công!`,
      details: result,
    });
  } catch (error: any) {
    console.error("Failed to send daily snapshot email:", error);
    return NextResponse.json(
      { error: error?.message || "Đã xảy ra lỗi khi gửi email báo cáo snapshot" },
      { status: 500 }
    );
  }
}
