import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    const liquidCat = await prisma.macroCategory.findFirst({ where: { code: "LIQUID" } });
    if (!liquidCat) {
      return NextResponse.json({ error: "Chưa khởi tạo danh mục LIQUID" }, { status: 400 });
    }

    if (eventType === "EXPENSE") {
      // EVENT 1: EXPENSE
      // Deduct balance from cash holding under LIQUID macro category
      let cashHolding = await prisma.holding.findFirst({
        where: { userId, macroCategoryId: liquidCat.id, asset: { assetClass: "CASH" } },
        include: { asset: true }
      });

      if (!cashHolding) {
        let cashAsset = await prisma.asset.findFirst({ where: { symbolOrTicker: "VND_CASH" } });
        if (!cashAsset) {
          cashAsset = await prisma.asset.create({
            data: { symbolOrTicker: "VND_CASH", assetName: "Tiền mặt VND", isMarketDriven: false, assetClass: "CASH" }
          });
        }
        cashHolding = await prisma.holding.create({
          data: {
            userId,
            macroCategoryId: liquidCat.id,
            assetId: cashAsset.id,
            quantity: 50000000,
            averageCostBasis: 1,
            currentValue: 50000000
          },
          include: { asset: true }
        });
      }

      // Deduct balance
      const newQty = Math.max(0, cashHolding.quantity - numericAmount);
      await prisma.holding.update({
        where: { id: cashHolding.id },
        data: { quantity: newQty, currentValue: newQty }
      });

      // Log Wealth Transaction
      await prisma.wealthTransaction.create({
        data: {
          userId,
          transactionType: "EXPENSE",
          macroCategoryId: liquidCat.id,
          assetId: cashHolding.assetId,
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
        targetCategoryName: liquidCat.name,
        newBalance: newQty,
        netWorthImpact: -numericAmount
      });

    } else if (eventType === "TRANSFER") {
      const stocksCat = await prisma.macroCategory.findFirst({ where: { code: "STOCKS" } });
      
      // Deduct cash from LIQUID
      let sourceCash = await prisma.holding.findFirst({
        where: { userId, macroCategoryId: liquidCat.id, asset: { assetClass: "CASH" } }
      });
      if (sourceCash) {
        const newSourceQty = Math.max(0, sourceCash.quantity - numericAmount);
        await prisma.holding.update({
          where: { id: sourceCash.id },
          data: { quantity: newSourceQty, currentValue: newSourceQty }
        });
      }

      // Log TRANSFER transaction
      await prisma.wealthTransaction.create({
        data: {
          userId,
          transactionType: "TRANSFER",
          macroCategoryId: liquidCat.id,
          assetId: sourceCash?.assetId,
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
