import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// GET: fetch cashflows với filter + pagination
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const search = searchParams.get("search") || "";
  const sourceId = searchParams.get("sourceId") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const secondaryCategoryIds = searchParams.getAll("secondaryCategoryId");
  const cashType = searchParams.get("cashType") || "";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sortOrder = (searchParams.get("sortOrder") ||
    "desc") as Prisma.SortOrder;

  const where: Prisma.CashFlowWhereInput = {
    userId: session.user.id,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(sourceId && { sourceId }),
    ...(categoryId && { primaryCategoryId: categoryId }),
    ...(cashType && { cashType: cashType as "Income" | "Expense" }),
    ...(secondaryCategoryIds.length > 0 && {
      secondaryCategories: {
        some: { secondaryCategoryId: { in: secondaryCategoryIds } },
      },
    }),
    ...((dateFrom || dateTo) && {
      datetime: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
  };

  const [items, total, aggregate] = await Promise.all([
    prisma.cashFlow.findMany({
      where,
      skip,
      take: limit,
      orderBy: { datetime: sortOrder },
      include: {
        source: true,
        primaryCategory: true,
        secondaryCategories: { include: { secondaryCategory: true } },
      },
    }),
    prisma.cashFlow.count({ where }),
    prisma.cashFlow.groupBy({
      by: ["cashType"],
      where,
      _sum: { amountOfMoney: true },
    }),
  ]);

  const totalIncome =
    aggregate.find((a) => a.cashType === "Income")?._sum.amountOfMoney ?? 0;
  const totalExpense =
    aggregate.find((a) => a.cashType === "Expense")?._sum.amountOfMoney ?? 0;

  return NextResponse.json({
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    totalIncome,
    totalExpense,
  });
}

// POST
const cashFlowItemSchema = z.object({
  title: z.string().min(1, "Tên chi tiêu không được để trống"),
  description: z.string().optional(),
  datetime: z.string().optional(),
  cashType: z.enum(["Income", "Expense"]).default("Expense"),
  amountOfMoney: z.number().positive("Số tiền phải lớn hơn 0"),
  sourceId: z.string().optional(),
  primaryCategoryId: z.string().optional(),
  secondaryCategoryIds: z.array(z.string()).optional(),
});

const cashFlowSchema = z.object({
  items: z.array(cashFlowItemSchema).min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = cashFlowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const results = await prisma.$transaction(
      parsed.data.items.map((item) =>
        prisma.cashFlow.create({
          data: {
            userId: session?.user?.id,
            title: item.title,
            description: item.description,
            datetime: item.datetime ? new Date(item.datetime) : new Date(),
            cashType: item.cashType,
            amountOfMoney: item.amountOfMoney,
            sourceId: item.sourceId || "default-cash",
            primaryCategoryId:
              item.primaryCategoryId || "default-uncategorized",
            secondaryCategories: item.secondaryCategoryIds?.length
              ? {
                  create: item.secondaryCategoryIds.map(
                    (secondaryCategoryId) => ({
                      secondaryCategoryId,
                    }),
                  ),
                }
              : undefined,
          },
        }),
      ),
    );

    return NextResponse.json(results, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
