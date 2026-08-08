import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchClosingPriceForSymbol } from "@/lib/market-ticker-service";
import { ensureDefaultMacroCategories } from "@/lib/wealth-service";

export async function POST(req: Request) {
  try {
    const session = await auth();
    let userId = session?.user?.id;

    // Fallback: If session user is missing or demo user
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) {
        userId = firstUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            email: "demo@mymoney.vn",
            username: "demouser",
            password: "hashedpassword123"
          }
        });
        userId = newUser.id;
      }
    } else {
      // Ensure session user exists in database
      const existingUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            id: userId,
            email: session?.user?.email || "user@mymoney.vn",
            username: session?.user?.name || "user",
            password: "hashedpassword123"
          }
        });
      }
    }

    // Ensure system macro categories exist in DB
    await ensureDefaultMacroCategories();

    const body = await req.json();
    const { flowType } = body;

    if (flowType === "MARKET_DRIVEN") {
      // FLOW A: Market-Driven Asset Creation Form
      const {
        symbolOrTicker,
        assetName,
        assetClass,
        quantity,
        buyPrice,
        currency = "VND"
      } = body;

      if (!symbolOrTicker || Number(quantity) <= 0) {
        return NextResponse.json({ error: "Thiếu thông tin ticker hoặc số lượng hợp lệ." }, { status: 400 });
      }

      // Default Flow A assets to STOCKS (Cổ phiếu & Tăng trưởng) macro category
      const stocksCat = await prisma.macroCategory.findFirst({ where: { code: "STOCKS" } });
      if (!stocksCat) {
        return NextResponse.json({ error: "Không tìm thấy danh mục Cổ phiếu & Tăng trưởng" }, { status: 400 });
      }

      // Check or create Asset symbol
      const cleanTicker = symbolOrTicker.toUpperCase();
      let asset = await prisma.asset.findFirst({
        where: { symbolOrTicker: cleanTicker }
      });

      const latestPrice = buyPrice && buyPrice > 0 ? buyPrice : await fetchClosingPriceForSymbol(cleanTicker);

      if (!asset) {
        asset = await prisma.asset.create({
          data: {
            symbolOrTicker: cleanTicker,
            assetName: assetName || `Tài sản ${cleanTicker}`,
            isMarketDriven: true,
            assetClass: assetClass || "STOCKS",
            metadata: {
              currency,
              liquidityIndex: assetClass === "CRYPTO" ? "T0" : "T2.5",
              riskProfile: assetClass === "CRYPTO" ? "High Risk" : "Moderate Risk"
            }
          }
        });
      }

      // Calculate total holding or update existing holding for user in STOCKS macro category
      const existingHolding = await prisma.holding.findFirst({
        where: { userId, assetId: asset.id }
      });

      let holding;
      if (existingHolding) {
        const newQty = existingHolding.quantity + Number(quantity);
        const newCostBasis =
          newQty > 0
            ? (existingHolding.quantity * existingHolding.averageCostBasis + Number(quantity) * Number(latestPrice)) / newQty
            : latestPrice;

        holding = await prisma.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: newQty,
            averageCostBasis: newCostBasis,
            currentValue: newQty * latestPrice,
            macroCategoryId: stocksCat.id
          }
        });
      } else {
        holding = await prisma.holding.create({
          data: {
            userId,
            macroCategoryId: stocksCat.id,
            assetId: asset.id,
            quantity: Number(quantity),
            averageCostBasis: Number(latestPrice),
            currentValue: Number(quantity) * Number(latestPrice),
            investableFlag: true
          }
        });
      }

      // Log BUY transaction
      await prisma.wealthTransaction.create({
        data: {
          userId,
          transactionType: "BUY",
          macroCategoryId: stocksCat.id,
          assetId: asset.id,
          quantity: Number(quantity),
          price: Number(latestPrice),
          costBasis: Number(latestPrice),
          fee: 0,
          currency,
          notes: `Khởi tạo/Mua tài sản thị trường ${cleanTicker}`
        }
      });

      return NextResponse.json({ success: true, holding, asset });

    } else if (flowType === "CUSTOM_ILLIQUID") {
      // FLOW B: Custom / Illiquid Asset Creation Form (BĐS, Xe cộ, Vốn góp, Cho vay)
      const {
        assetName,
        macroCategoryId,
        estimatedCurrentValue,
        originalCost,
        valuationMethod = "MANUAL",
        annualAppreciationRate = 0,
        investableFlag = true,
        assetClass = "REAL_ESTATE",
        hasLinkedLiability = false,
        liabilityName,
        liabilityDebtAmount = 0,
        liabilityInterestRate = 0,
        liabilityDueDate
      } = body;

      if (!assetName || !macroCategoryId || Number(estimatedCurrentValue) < 0) {
        return NextResponse.json({ error: "Vui lòng điền đầy đủ tên tài sản, danh mục và giá trị ước tính." }, { status: 400 });
      }

      // Create Custom Asset
      const customSymbol = `CUSTOM_${assetName.toUpperCase().replace(/\s+/g, "_").slice(0, 10)}_${Date.now().toString().slice(-4)}`;
      const asset = await prisma.asset.create({
        data: {
          symbolOrTicker: customSymbol,
          assetName,
          isMarketDriven: false,
          assetClass,
          metadata: {
            valuationMethod,
            annualAppreciationRate: Number(annualAppreciationRate) || 0,
            originalCost: Number(originalCost) || Number(estimatedCurrentValue),
            liquidityIndex: assetClass === "REAL_ESTATE" ? "Illiquid (T30+)" : "T7"
          }
        }
      });

      // Create Holding directly linked to User & MacroCategory
      const holding = await prisma.holding.create({
        data: {
          userId,
          macroCategoryId,
          assetId: asset.id,
          quantity: 1,
          averageCostBasis: Number(estimatedCurrentValue),
          currentValue: Number(estimatedCurrentValue),
          investableFlag: Boolean(investableFlag)
        }
      });

      // Create optional attached Mortgage / Loan liability
      let createdLiability = null;
      if (hasLinkedLiability && Number(liabilityDebtAmount) > 0) {
        createdLiability = await prisma.liability.create({
          data: {
            userId,
            name: liabilityName || `Vay thế chấp - ${assetName}`,
            totalDebt: Number(liabilityDebtAmount),
            interestRate: Number(liabilityInterestRate) || 0,
            dueDate: liabilityDueDate ? new Date(liabilityDueDate) : null,
            linkedHoldingId: holding.id
          }
        });

        // Link back to holding
        await prisma.holding.update({
          where: { id: holding.id },
          data: { linkedLiabilityId: createdLiability.id }
        });
      }

      // Log initial REVALUATION / DEPOSIT transaction
      await prisma.wealthTransaction.create({
        data: {
          userId,
          transactionType: "REVALUATION",
          macroCategoryId,
          assetId: asset.id,
          quantity: 1,
          price: Number(estimatedCurrentValue),
          fee: 0,
          currency: "VND",
          notes: `Khởi tạo tài sản đặc thù ${assetName} (Định giá: ${Number(estimatedCurrentValue).toLocaleString()} VND)`
        }
      });

      return NextResponse.json({ success: true, holding, asset, liability: createdLiability });
    }

    return NextResponse.json({ error: "FlowType không hợp lệ." }, { status: 400 });
  } catch (error: any) {
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi tạo tài sản." }, { status: 500 });
  }
}
