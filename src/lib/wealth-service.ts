import { prisma } from "@/lib/prisma";

export const DEFAULT_MACRO_CATEGORIES = [
  {
    code: "LIQUID",
    name: "Tài sản thanh khoản (tiền mặt/tiền gửi)",
    description: "Tiền mặt, tài khoản ngân hàng, ví điện tử, tiền gửi tiết kiệm",
    orderIndex: 1
  },
  {
    code: "REAL_ESTATE",
    name: "Bất động sản & vật thể (đất/tài sản trên đất)",
    description: "Nhà ở, đất đai, bất động sản cho thuê, tài sản gắn liền với đất",
    orderIndex: 2
  },
  {
    code: "PHYSICAL_ASSETS",
    name: "Tài sản vật chất (xe cộ, hàng hóa)",
    description: "Xe cộ, vàng miếng, trang sức, hàng hóa, thiết bị có giá trị",
    orderIndex: 3
  },
  {
    code: "STOCKS",
    name: "Cổ phiếu & tăng trưởng",
    description: "Cổ phiếu niêm yết, chứng chỉ quỹ (CCQ), Crypto",
    orderIndex: 4
  }
];

export async function ensureDefaultMacroCategories() {
  const activeCodes = DEFAULT_MACRO_CATEGORIES.map((c) => c.code);

  // 1. Upsert active 4 macro categories first
  for (const cat of DEFAULT_MACRO_CATEGORIES) {
    await prisma.macroCategory.upsert({
      where: { code: cat.code },
      update: {
        name: cat.name,
        description: cat.description,
        orderIndex: cat.orderIndex
      },
      create: cat
    });
  }

  const liquidCat = await prisma.macroCategory.findUnique({ where: { code: "LIQUID" } });
  const realEstateCat = await prisma.macroCategory.findUnique({ where: { code: "REAL_ESTATE" } });

  // 2. Re-assign any holdings attached to old obsolete categories before deletion
  const obsoleteCategories = await prisma.macroCategory.findMany({
    where: { code: { notIn: activeCodes } }
  });

  for (const obs of obsoleteCategories) {
    const targetId = obs.code === "FIXED_INCOME" ? liquidCat!.id : realEstateCat!.id;
    
    await prisma.holding.updateMany({
      where: { macroCategoryId: obs.id },
      data: { macroCategoryId: targetId }
    });

    await prisma.wealthTransaction.updateMany({
      where: { macroCategoryId: obs.id },
      data: { macroCategoryId: targetId }
    });

    await prisma.macroCategory.delete({
      where: { id: obs.id }
    });
  }

  // 3. Fix-up any LIQUID holdings to ensure quantity = 1 and prices match total value
  if (liquidCat) {
    const liquidHoldings = await prisma.holding.findMany({
      where: { macroCategoryId: liquidCat.id }
    });

    for (const lh of liquidHoldings) {
      const realValue = lh.currentValue > 0 ? lh.currentValue : lh.quantity * lh.averageCostBasis;
      await prisma.holding.update({
        where: { id: lh.id },
        data: {
          quantity: 1,
          averageCostBasis: realValue,
          currentValue: realValue
        }
      });
    }
  }

  return prisma.macroCategory.findMany({
    where: { code: { in: activeCodes } },
    orderBy: { orderIndex: "asc" }
  });
}
