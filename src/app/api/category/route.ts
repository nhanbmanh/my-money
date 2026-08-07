import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId: session.user.id }, { userId: null }],
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { categoryName, budgetLimit } = await req.json();

  if (!categoryName?.trim()) {
    return NextResponse.json(
      { error: "Tên nhãn không được để trống" },
      { status: 400 },
    );
  }

  const parsedBudgetLimit =
    budgetLimit !== undefined && budgetLimit !== null && Number(budgetLimit) >= 0
      ? Number(budgetLimit)
      : -1;

  const category = await prisma.category.create({
    data: {
      user: { connect: { id: session.user.id } },
      categoryName: categoryName.trim(),
      budgetLimit: parsedBudgetLimit,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
