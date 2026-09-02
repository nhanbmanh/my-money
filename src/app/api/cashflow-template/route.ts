import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTemplateSchema = z.object({
  templateName: z.string().min(1, "Tên mẫu là bắt buộc"),
  title: z.string().default(""),
  cashType: z.enum(["Income", "Expense"]).default("Expense"),
  amountOfMoney: z.number().nonnegative().default(0),
  description: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  primaryCategoryId: z.string().nullable().optional(),
  secondaryCategoryIds: z.array(z.string()).optional().default([]),
});

// GET: fetch all templates for current user
export async function GET() {
  const session = await auth();
  let userId = session?.user?.id;

  if (!userId) {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) userId = firstUser.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await prisma.cashFlowTemplate.findMany({
      where: { userId },
      include: {
        source: true,
        primaryCategory: true,
        secondaryCategories: {
          include: {
            secondaryCategory: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error: any) {
    console.error("GET /api/cashflow-template error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ nội bộ" },
      { status: 500 }
    );
  }
}

// POST: create a new template
export async function POST(req: Request) {
  const session = await auth();
  let userId = session?.user?.id;

  if (!userId) {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) userId = firstUser.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createTemplateSchema.parse(body);

    const template = await prisma.cashFlowTemplate.create({
      data: {
        userId,
        templateName: parsed.templateName,
        title: parsed.title,
        cashType: parsed.cashType,
        amountOfMoney: parsed.amountOfMoney,
        description: parsed.description,
        sourceId: parsed.sourceId || null,
        primaryCategoryId: parsed.primaryCategoryId || null,
        secondaryCategories: {
          create: parsed.secondaryCategoryIds.map((scId) => ({
            secondaryCategoryId: scId,
          })),
        },
      },
      include: {
        source: true,
        primaryCategory: true,
        secondaryCategories: {
          include: {
            secondaryCategory: true,
          },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("POST /api/cashflow-template error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi tạo mẫu giao dịch" },
      { status: 500 }
    );
  }
}
