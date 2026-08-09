import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { adjustLiquidAssetBalance, getOrCreateLiquidHolding } from "@/lib/wealth-service";

export async function POST(req: Request) {
  try {
    const session = await auth();
    let userId = session?.user?.id;

    const body = await req.json();
    const { eventType, amount, description, sourceName = "Webhook Expense App" } = body;

    // Fallback: If unauthenticated in webhook simulation, find first user or create default user
    if (!userId) {
      let firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        firstUser = await prisma.user.create({
          data: {
            email: "demo@mymoney.vn",
            username: "demouser",
            password: "hashedpassword123"
          }
        });
      }
      userId = firstUser.id;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ error: "Số tiền không hợp lệ" }, { status: 400 });
    }

    if (eventType === "EXPENSE") {
      // EVENT 1: EXPENSE
      // Deduct balance from unified liquid holding (categoryType: 0)
      await adjustLiquidAssetBalance(userId, -numericAmount);

      const liquidHolding = await getOrCreateLiquidHolding(userId);

      // Log Wealth Transaction
      await prisma.wealthTransaction.create({
        data: {
          userId,
          transactionType: "EXPENSE",
          assetId: liquidHolding.assetId,
          quantity: numericAmount,
          price: 1,
          fee: 0,
          currency: "VND",
          notes: `[Sync EXPENSE Webhook] ${description || "Chi tiêu cá nhân"}`
        }
      });

      // Cross-sync with core CashFlow table
      let source = await prisma.source.findFirst({ where: { userId } });
      if (!source) {
        source = await prisma.source.create({
          data: { userId, sourceName: sourceName || "Tài khoản thanh toán" }
        });
      }

      await prisma.cashFlow.create({
        data: {
          userId,
          sourceId: source.id,
          title: description || "Chi tiêu qua Webhook Sync",
          cashType: "Expense",
          amountOfMoney: numericAmount,
          description: `Đã tự động trừ số dư tài sản thanh khoản gia sản`
        }
      });

      return NextResponse.json({
        success: true,
        event: "EXPENSE",
        deductedAmount: numericAmount,
        targetCategoryName: "Tài sản thanh khoản (Tiền mặt)",
        newBalance: liquidHolding.currentValue,
        netWorthImpact: -numericAmount
      });

    } else if (eventType === "TRANSFER") {
      // Deduct cash from LIQUID holding
      await adjustLiquidAssetBalance(userId, -numericAmount);
      const liquidHolding = await getOrCreateLiquidHolding(userId);

      // Log TRANSFER transaction
      await prisma.wealthTransaction.create({
        data: {
          userId,
          transactionType: "TRANSFER",
          assetId: liquidHolding.assetId,
          quantity: numericAmount,
          price: 1,
          currency: "VND",
          notes: `[Sync TRANSFER Webhook] Chuyển tiền đầu tư`
        }
      });

      return NextResponse.json({
        success: true,
        event: "TRANSFER",
        transferredAmount: numericAmount,
        netWorthImpact: 0
      });
    }

    return NextResponse.json({ error: "EventType không hợp lệ (phải là EXPENSE hoặc TRANSFER)" }, { status: 400 });
  } catch (error: any) {
    console.error("Error processing wealth webhook:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
