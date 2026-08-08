import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
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

    const body = await req.json();
    const { holdingId, actionType, newPrice, newQuantity, tradeType, tradePrice, tradeQuantity, investableFlag } = body;

    const holding = await prisma.holding.findUnique({
      where: { id: holdingId },
      include: { asset: true, macroCategory: true }
    });

    if (!holding || holding.userId !== userId) {
      return NextResponse.json({ error: "Holding không tồn tại hoặc không đủ quyền." }, { status: 404 });
    }

    if (actionType === "REVALUATION") {
      const updatedVal = Number(newPrice);
      const updatedQty = newQuantity !== undefined ? Number(newQuantity) : holding.quantity;

      const updatedHolding = await prisma.holding.update({
        where: { id: holdingId },
        data: {
          quantity: updatedQty,
          averageCostBasis: updatedVal,
          currentValue: updatedQty * updatedVal
        }
      });

      await prisma.wealthTransaction.create({
        data: {
          userId,
          transactionType: "REVALUATION",
          macroCategoryId: holding.macroCategoryId,
          assetId: holding.assetId,
          quantity: updatedQty,
          price: updatedVal,
          costBasis: updatedVal,
          currency: "VND",
          notes: `Cập nhật lại định giá/giá vốn TB tài sản ${holding.asset.assetName}`
        }
      });

      return NextResponse.json({ success: true, holding: updatedHolding });

    } else if (actionType === "TRADE") {
      const qty = Number(tradeQuantity || 1);
      const price = Number(tradePrice || newPrice || 0);

      let newQty = holding.quantity;
      let newCostBasis = holding.averageCostBasis;

      if (tradeType === "BUY") {
        newQty += qty;
        newCostBasis = newQty > 0 ? (holding.quantity * holding.averageCostBasis + qty * price) / newQty : price;
      } else if (tradeType === "SELL") {
        newQty = Math.max(0, holding.quantity - qty);
      }

      let updatedHolding = null;
      if (newQty <= 0) {
        await prisma.holding.delete({ where: { id: holdingId } });
      } else {
        updatedHolding = await prisma.holding.update({
          where: { id: holdingId },
          data: {
            quantity: newQty,
            averageCostBasis: newCostBasis,
            currentValue: newQty * price
          }
        });
      }

      // CRITICAL REQUIREMENT: When selling an asset, auto-credit proceeds to LIQUID holding
      if (tradeType === "SELL") {
        const proceeds = qty * price;
        const liquidCat = await prisma.macroCategory.findFirst({ where: { code: "LIQUID" } });

        if (liquidCat && proceeds > 0) {
          let liquidHolding = await prisma.holding.findFirst({
            where: { userId, macroCategoryId: liquidCat.id }
          });

          if (liquidHolding) {
            const updatedTotalValue = (liquidHolding.currentValue || (liquidHolding.quantity * liquidHolding.averageCostBasis)) + proceeds;
            await prisma.holding.update({
              where: { id: liquidHolding.id },
              data: {
                quantity: 1,
                averageCostBasis: updatedTotalValue,
                currentValue: updatedTotalValue
              }
            });
          } else {
            let cashAsset = await prisma.asset.findFirst({ where: { symbolOrTicker: "VND_CASH" } });
            if (!cashAsset) {
              cashAsset = await prisma.asset.create({
                data: {
                  symbolOrTicker: "VND_CASH",
                  assetName: "Tiền mặt / Tiền gửi",
                  isMarketDriven: false,
                  assetClass: "CASH"
                }
              });
            }

            await prisma.holding.create({
              data: {
                userId,
                macroCategoryId: liquidCat.id,
                assetId: cashAsset.id,
                quantity: 1,
                averageCostBasis: proceeds,
                currentValue: proceeds,
                investableFlag: true
              }
            });
          }
        }
      }

      const pnl = tradeType === "SELL" ? (price - holding.averageCostBasis) * qty : 0;

      await prisma.wealthTransaction.create({
        data: {
          userId,
          transactionType: tradeType,
          macroCategoryId: holding.macroCategoryId,
          assetId: holding.assetId,
          quantity: qty,
          price,
          costBasis: holding.averageCostBasis,
          currency: "VND",
          notes: `Giao dịch ${tradeType === "BUY" ? "MUA THÊM" : "BÁN BỚT"} ${holding.asset.assetName} (Giá vốn: ${holding.averageCostBasis.toLocaleString()} VND, Giá bán: ${price.toLocaleString()} VND -> PnL: ${pnl >= 0 ? "+" : ""}${pnl.toLocaleString()} VND)${tradeType === "SELL" ? ` [Tự động cộng +${(qty * price).toLocaleString()} VND vào Tài sản thanh khoản]` : ""}`
        }
      });

      return NextResponse.json({ success: true, holding: updatedHolding });

    } else if (actionType === "TOGGLE_INVESTABLE") {
      const updatedHolding = await prisma.holding.update({
        where: { id: holdingId },
        data: { investableFlag: Boolean(investableFlag) }
      });
      return NextResponse.json({ success: true, holding: updatedHolding });
    }

    return NextResponse.json({ error: "ActionType không hợp lệ." }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating holding:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    let userId = session?.user?.id;

    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) userId = firstUser.id;
    }

    const { searchParams } = new URL(req.url);
    const holdingId = searchParams.get("id");

    if (!holdingId) {
      return NextResponse.json({ error: "Thiếu holdingId" }, { status: 400 });
    }

    const holding = await prisma.holding.findUnique({
      where: { id: holdingId }
    });

    if (!holding || (userId && holding.userId !== userId)) {
      return NextResponse.json({ error: "Holding không tìm thấy" }, { status: 404 });
    }

    await prisma.holding.delete({ where: { id: holdingId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
