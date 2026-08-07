import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { budgets } = body;
    // budgets is a Map/Record of { [categoryId]: budgetLimitNumber }
    if (!budgets || typeof budgets !== "object") {
      return NextResponse.json(
        { error: "Dữ liệu hạn mức không hợp lệ" },
        { status: 400 }
      );
    }

    const categoryIds = Object.keys(budgets);
    if (categoryIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Find all primary categories owned by user (or system default)
    const primaryCategories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        OR: [{ userId: session.user.id }, { userId: null }],
      },
      select: { id: true },
    });

    const primaryIdsSet = new Set(primaryCategories.map((c) => c.id));

    // Find all secondary categories owned by user (or system default)
    const secondaryCategories = await prisma.secondaryCategory.findMany({
      where: {
        id: { in: categoryIds },
        OR: [{ userId: session.user.id }, { userId: null }],
      },
      select: { id: true },
    });

    const secondaryIdsSet = new Set(secondaryCategories.map((sc) => sc.id));

    const transactions = [];

    for (const [id, limitVal] of Object.entries(budgets)) {
      const numericLimit =
        limitVal === null || limitVal === undefined || limitVal === "" || Number(limitVal) < 0
          ? -1
          : Number(limitVal);

      if (primaryIdsSet.has(id)) {
        transactions.push(
          prisma.category.update({
            where: { id },
            data: { budgetLimit: numericLimit },
          })
        );
      } else if (secondaryIdsSet.has(id)) {
        transactions.push(
          prisma.secondaryCategory.update({
            where: { id },
            data: { budgetLimit: numericLimit },
          })
        );
      }
    }

    if (transactions.length > 0) {
      await prisma.$transaction(transactions);
    }

    return NextResponse.json({ success: true, updatedCount: transactions.length });
  } catch (error: any) {
    console.error("Failed to update budgets batch:", error);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi cập nhật hạn mức" },
      { status: 500 }
    );
  }
}
