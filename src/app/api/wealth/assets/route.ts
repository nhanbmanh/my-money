import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchClosingPriceForSymbol } from "@/lib/market-ticker-service";
import { getOrCreateLiquidHolding } from "@/lib/wealth-service";

export async function POST(req: Request) {
  try {
    const session = await auth();
    let userId = session?.user?.id;

    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) {
        userId = firstUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            email: "demo@mymoney.vn",
            username: "demouser",
            password: "hashedpassword123",
          },
        });
        userId = newUser.id;
      }
    }

    const body = await req.json();
    const categoryType = Number(body.categoryType);

    // ----------------------------------------------------
    // TYPE 0: TÀI SẢN THANH KHOẢN (Tiền mặt)
    // ----------------------------------------------------
    if (categoryType === 0) {
      const addedValue = Number(body.estimatedCurrentValue || body.amount || 0);

      const liquidHolding = await getOrCreateLiquidHolding(userId);
      const newBalance = liquidHolding.currentValue + addedValue;

      const updatedHolding = await prisma.holding.update({
        where: { id: liquidHolding.id },
        data: {
          quantity: 1,
          averageCostBasis: newBalance,
          currentValue: newBalance,
          investableFlag: true,
        },
        include: { asset: true },
      });

      return NextResponse.json({
        success: true,
        holding: updatedHolding,
        addedValue,
      });
    }

    // ----------------------------------------------------
    // TYPE 1: TÀI SẢN TĂNG TRƯỞNG (Cổ phiếu, Crypto, CCQ...)
    // ----------------------------------------------------
    if (categoryType === 1) {
      const {
        symbolOrTicker,
        assetName,
        assetClass = "STOCKS",
        quantity,
        buyPrice,
        currency = "VND",
        unit = "Cổ phiếu",
      } = body;

      if (!symbolOrTicker || Number(quantity) <= 0) {
        return NextResponse.json(
          { error: "Thiếu thông tin ticker hoặc số lượng hợp lệ." },
          { status: 400 }
        );
      }

      const cleanTicker = symbolOrTicker.toUpperCase();
      let asset = await prisma.asset.findFirst({
        where: { symbolOrTicker: cleanTicker },
      });

      const latestPrice =
        buyPrice && buyPrice > 0
          ? Number(buyPrice)
          : await fetchClosingPriceForSymbol(cleanTicker);

      if (!asset) {
        asset = await prisma.asset.create({
          data: {
            symbolOrTicker: cleanTicker,
            assetName: assetName || `Tài sản ${cleanTicker}`,
            isMarketDriven: true,
            assetClass: assetClass || "STOCKS",
            metadata: {
              currency,
              unit,
              liquidityIndex: assetClass === "CRYPTO" || assetClass === "GOLD" ? "T0" : "T2.5",
              riskProfile:
                assetClass === "CRYPTO" ? "High Risk" : assetClass === "GOLD" ? "Low Risk" : "Moderate Risk",
            },
          },
        });
      } else if (unit && (!asset.metadata || !(asset.metadata as Record<string, any>).unit)) {
        // Update unit if missing
        const existingMeta = (asset.metadata as Record<string, any>) || {};
        asset = await prisma.asset.update({
          where: { id: asset.id },
          data: {
            assetName: assetName || asset.assetName,
            metadata: {
              ...existingMeta,
              unit,
            },
          },
        });
      }

      const existingHolding = await prisma.holding.findFirst({
        where: { userId, assetId: asset.id },
      });

      let holding;
      if (existingHolding) {
        const newQty = existingHolding.quantity + Number(quantity);
        const newCostBasis =
          (existingHolding.quantity * existingHolding.averageCostBasis +
            Number(quantity) * latestPrice) /
          newQty;

        holding = await prisma.holding.update({
          where: { id: existingHolding.id },
          data: {
            categoryType: 1,
            quantity: newQty,
            averageCostBasis: newCostBasis,
            currentValue: newQty * latestPrice,
          },
          include: { asset: true },
        });
      } else {
        holding = await prisma.holding.create({
          data: {
            userId,
            categoryType: 1,
            assetId: asset.id,
            quantity: Number(quantity),
            averageCostBasis: latestPrice,
            currentValue: Number(quantity) * latestPrice,
            investableFlag: true,
          },
          include: { asset: true },
        });
      }

      const transactionValue = Number(quantity) * latestPrice;

      return NextResponse.json({
        success: true,
        holding,
        asset,
        transactionValue,
        categoryType: 1,
      });
    }

    // ----------------------------------------------------
    // TYPE 2: TÀI SẢN VẬT CHẤT (BĐS, Xe cộ, Hàng hóa...)
    // ----------------------------------------------------
    if (categoryType === 2) {
      const {
        assetName,
        estimatedCurrentValue,
        valuationMethod = "MANUAL",
        appreciationRate = 5,
        isInvestable = true,
      } = body;

      if (!assetName || Number(estimatedCurrentValue) < 0) {
        return NextResponse.json(
          { error: "Vui lòng nhập tên tài sản và giá trị hợp lệ." },
          { status: 400 }
        );
      }

      const customSymbol = `PHYSICAL_${assetName
        .toUpperCase()
        .replace(/\s+/g, "_")
        .slice(0, 10)}_${Date.now().toString().slice(-4)}`;

      const asset = await prisma.asset.create({
        data: {
          symbolOrTicker: customSymbol,
          assetName,
          isMarketDriven: false,
          assetClass: "REAL_ESTATE",
          metadata: {
            valuationMethod,
            appreciationRate: Number(appreciationRate) || 0,
          },
        },
      });

      const holding = await prisma.holding.create({
        data: {
          userId,
          categoryType: 2,
          assetId: asset.id,
          quantity: 1,
          averageCostBasis: Number(estimatedCurrentValue),
          currentValue: Number(estimatedCurrentValue),
          investableFlag: Boolean(isInvestable),
        },
        include: { asset: true },
      });

      return NextResponse.json({
        success: true,
        holding,
        transactionValue: Number(estimatedCurrentValue),
        categoryType: 2,
      });
    }

    // ----------------------------------------------------
    // TYPE 3: TÀI SẢN THẾ CHẤP - NỢ
    // ----------------------------------------------------
    if (categoryType === 3) {
      const { assetName, debtAmount, interestRate = 0 } = body;

      if (!assetName || Number(debtAmount) <= 0) {
        return NextResponse.json(
          { error: "Vui lòng nhập tên tài sản nợ và khoản vay hợp lệ." },
          { status: 400 }
        );
      }

      const customSymbol = `DEBT_${assetName
        .toUpperCase()
        .replace(/\s+/g, "_")
        .slice(0, 10)}_${Date.now().toString().slice(-4)}`;

      const asset = await prisma.asset.create({
        data: {
          symbolOrTicker: customSymbol,
          assetName,
          isMarketDriven: false,
          assetClass: "LOAN",
          metadata: {
            interestRate: Number(interestRate) || 0,
          },
        },
      });

      const liability = await prisma.liability.create({
        data: {
          userId,
          name: assetName,
          totalDebt: Number(debtAmount),
          interestRate: Number(interestRate) || 0,
        },
      });

      const holding = await prisma.holding.create({
        data: {
          userId,
          categoryType: 3,
          assetId: asset.id,
          quantity: 1,
          averageCostBasis: Number(debtAmount),
          currentValue: Number(debtAmount),
          investableFlag: false,
          linkedLiabilityId: liability.id,
        },
        include: { asset: true, linkedLiability: true },
      });

      return NextResponse.json({
        success: true,
        holding,
        liability,
        transactionValue: Number(debtAmount),
        categoryType: 3,
      });
    }

    // ----------------------------------------------------
    // TYPE 4: TÀI SẢN CHO VAY (Tiền gửi, Cho vay...)
    // ----------------------------------------------------
    if (categoryType === 4) {
      const { assetName, estimatedCurrentValue, interestRate = 0 } = body;

      if (!assetName || Number(estimatedCurrentValue) <= 0) {
        return NextResponse.json(
          { error: "Vui lòng nhập tên và giá trị tài sản cho vay hợp lệ." },
          { status: 400 }
        );
      }

      const customSymbol = `LEND_${assetName
        .toUpperCase()
        .replace(/\s+/g, "_")
        .slice(0, 10)}_${Date.now().toString().slice(-4)}`;

      const asset = await prisma.asset.create({
        data: {
          symbolOrTicker: customSymbol,
          assetName,
          isMarketDriven: false,
          assetClass: "BOND",
          metadata: {
            interestRate: Number(interestRate) || 0,
          },
        },
      });

      const holding = await prisma.holding.create({
        data: {
          userId,
          categoryType: 4,
          assetId: asset.id,
          quantity: 1,
          averageCostBasis: Number(estimatedCurrentValue),
          currentValue: Number(estimatedCurrentValue),
          investableFlag: true,
        },
        include: { asset: true },
      });

      return NextResponse.json({
        success: true,
        holding,
        transactionValue: Number(estimatedCurrentValue),
        categoryType: 4,
      });
    }

    return NextResponse.json(
      { error: "Loại danh mục tài sản không hợp lệ (0-4)." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      { error: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
