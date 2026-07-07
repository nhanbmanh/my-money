import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "Không có ID nào được chọn" },
      { status: 400 },
    );
  }

  await prisma.cashFlow.deleteMany({
    where: { id: { in: ids }, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
