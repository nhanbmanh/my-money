import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    let userId = session?.user?.id;

    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) userId = firstUser.id;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu transaction id" }, { status: 400 });
    }

    const tx = await prisma.wealthTransaction.findUnique({
      where: { id }
    });

    if (!tx || (userId && tx.userId !== userId)) {
      return NextResponse.json({ error: "Giao dịch không tìm thấy" }, { status: 404 });
    }

    await prisma.wealthTransaction.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Đã xóa lịch sử giao dịch thành công." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
