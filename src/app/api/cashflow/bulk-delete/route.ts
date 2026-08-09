import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { adjustLiquidAssetBalance } from "@/lib/wealth-service";

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

  const itemsToDelete = await prisma.cashFlow.findMany({
    where: { id: { in: ids }, userId: session.user.id },
  });

  await prisma.cashFlow.deleteMany({
    where: { id: { in: ids }, userId: session.user.id },
  });

  for (const item of itemsToDelete) {
    const oldImpact = item.cashType === "Income" ? item.amountOfMoney : -item.amountOfMoney;
    await adjustLiquidAssetBalance(session.user.id, -oldImpact, item.sourceId);
  }

  return NextResponse.json({ success: true });
}
