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
    const {
      holdingId,
      actionType,
      newPrice,
      newQuantity,
      tradeType,
      tradePrice,
      tradeQuantity,
      investableFlag,
    } = body;

    const holding = await prisma.holding.findUnique({
      where: { id: holdingId },
      include: { asset: true },
    });

    if (!holding || holding.userId !== userId) {
      return NextResponse.json(
        { error: "Holding không tồn tại hoặc không đủ quyền." },
        { status: 404 }
      );
    }

    if (actionType === "REVALUATION") {
      const updatedVal = Number(newPrice);
      const updatedQty =
        newQuantity !== undefined ? Number(newQuantity) : holding.quantity;

      const updatedHolding = await prisma.holding.update({
        where: { id: holdingId },
        data: {
          quantity: updatedQty,
          averageCostBasis: updatedVal,
          currentValue: updatedQty * updatedVal,
        },
        include: { asset: true },
      });

      if (
        body.valuationMethod !== undefined ||
        body.appreciationRate !== undefined ||
        body.interestRate !== undefined
      ) {
        const existingMeta = (holding.asset.metadata as Record<string, any>) || {};
        await prisma.asset.update({
          where: { id: holding.assetId },
          data: {
            metadata: {
              ...existingMeta,
              interestRate:
                body.interestRate !== undefined
                  ? Number(body.interestRate)
                  : existingMeta.interestRate || 0,
              valuationMethod:
                body.valuationMethod ?? existingMeta.valuationMethod ?? "MANUAL",
              appreciationRate:
                body.appreciationRate !== undefined
                  ? Number(body.appreciationRate)
                  : existingMeta.appreciationRate || 0,
            },
          },
        });
      }

      await prisma.wealthTransaction.create({
        data: {
          userId,
          transactionType: "REVALUATION",
          assetId: holding.assetId,
          quantity: updatedQty,
          price: updatedVal,
          costBasis: updatedVal,
          currency: "VND",
          notes: `Cập nhật lại định giá/giá vốn TB tài sản ${holding.asset.assetName}`,
        },
      });

      return NextResponse.json({ success: true, holding: updatedHolding });
    } else if (actionType === "TRADE") {
      const qty = Number(tradeQuantity || 1);
      const price = Number(tradePrice || newPrice || 0);

      let newQty = holding.quantity;
      let newCostBasis = holding.averageCostBasis;

      if (tradeType === "BUY") {
        newQty += qty;
        newCostBasis =
          newQty > 0
            ? (holding.quantity * holding.averageCostBasis + qty * price) / newQty
            : price;
      } else if (
        tradeType === "SELL" ||
        tradeType === "REPAY" ||
        tradeType === "COLLECT"
      ) {
        if (
          holding.categoryType === 3 ||
          holding.categoryType === 4 ||
          holding.categoryType === 2
        ) {
          newCostBasis = Math.max(0, holding.averageCostBasis - price);
          newQty = newCostBasis > 0 ? 1 : 0;
        } else {
          newQty = Math.max(0, holding.quantity - qty);
        }
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
            currentValue:
              holding.categoryType === 3 ||
              holding.categoryType === 4 ||
              holding.categoryType === 2
                ? newCostBasis
                : newQty * price,
          },
        });
      }

      // Calculate Liquid Asset Impact Details for User Confirmation Prompt
      let liquidImpact: { action: "DEDUCT" | "ADD"; amount: number; label: string } | null = null;

      if (holding.categoryType === 3 && (tradeType === "REPAY" || tradeType === "SELL")) {
        liquidImpact = {
          action: "DEDUCT",
          amount: price,
          label: `Thanh toán trả bớt nợ ${holding.asset.assetName}`,
        };
      } else if (tradeType === "BUY") {
        liquidImpact = {
          action: "DEDUCT",
          amount: price * qty,
          label: `Mua thêm tài sản ${holding.asset.assetName}`,
        };
      } else if (
        tradeType === "SELL" ||
        tradeType === "COLLECT" ||
        holding.categoryType === 4
      ) {
        const impactVal =
          holding.categoryType === 4 || holding.categoryType === 2
            ? price
            : price * qty;
        const actLabel =
          holding.categoryType === 4
            ? `Thu hồi khoản cho vay / tiền gửi ${holding.asset.assetName}`
            : holding.categoryType === 2
            ? `Thanh lý / bán tài sản ${holding.asset.assetName}`
            : `Bán bớt tài sản ${holding.asset.assetName}`;

        if (impactVal > 0) {
          liquidImpact = {
            action: "ADD",
            amount: impactVal,
            label: actLabel,
          };
        }
      }

      const pnl =
        tradeType === "SELL" ? (price - holding.averageCostBasis) * qty : 0;

      const noteAction =
        holding.categoryType === 3
          ? "TRẢ BỚT NỢ"
          : holding.categoryType === 4
          ? "THU HỒI VAY"
          : tradeType === "BUY"
          ? "MUA THÊM"
          : "BÁN BỚT";

      await prisma.wealthTransaction.create({
        data: {
          userId,
          transactionType: tradeType,
          assetId: holding.assetId,
          quantity: qty,
          price,
          costBasis: holding.averageCostBasis,
          currency: "VND",
          notes: `Giao dịch ${noteAction} ${holding.asset.assetName} (Giá trị: ${price.toLocaleString()} VND)`,
        },
      });

      return NextResponse.json({
        success: true,
        holding: updatedHolding,
        liquidImpact,
      });
    } else if (actionType === "TOGGLE_INVESTABLE") {
      const updatedHolding = await prisma.holding.update({
        where: { id: holdingId },
        data: { investableFlag: Boolean(investableFlag) },
      });
      return NextResponse.json({ success: true, holding: updatedHolding });
    }

    return NextResponse.json(
      { error: "ActionType không hợp lệ." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error updating holding:", error);
    return NextResponse.json(
      { error: error.message || "Server Error" },
      { status: 500 }
    );
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
      where: { id: holdingId },
    });

    if (!holding || (userId && holding.userId !== userId)) {
      return NextResponse.json(
        { error: "Holding không tìm thấy" },
        { status: 404 }
      );
    }

    await prisma.holding.delete({ where: { id: holdingId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
