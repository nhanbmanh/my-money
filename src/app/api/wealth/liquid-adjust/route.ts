import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateLiquidHolding } from "@/lib/wealth-service";

export async function POST(req: Request) {
  try {
    const session = await auth();
    let userId = session?.user?.id;

    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) userId = firstUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, amount } = await req.json();

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Số tiền giao dịch không hợp lệ." },
        { status: 400 }
      );
    }

    const liquidHolding = await getOrCreateLiquidHolding(userId);

    const currentBalance = liquidHolding.currentValue || liquidHolding.averageCostBasis || 0;
    let newBalance = currentBalance;

    if (action === "ADD") {
      newBalance = currentBalance + numericAmount;
    } else if (action === "DEDUCT") {
      newBalance = Math.max(0, currentBalance - numericAmount);
    } else {
      return NextResponse.json(
        { error: "Hành động điều chỉnh không hợp lệ (ADD / DEDUCT)." },
        { status: 400 }
      );
    }

    const updated = await prisma.holding.update({
      where: { id: liquidHolding.id },
      data: {
        quantity: 1,
        averageCostBasis: newBalance,
        currentValue: newBalance,
        investableFlag: true,
      },
    });

    return NextResponse.json({
      success: true,
      holding: updated,
      newBalance,
    });
  } catch (error: any) {
    console.error("Error adjusting liquid asset balance:", error);
    return NextResponse.json(
      { error: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
