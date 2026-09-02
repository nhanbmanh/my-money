import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTemplateSchema = z.object({
  templateName: z.string().min(1, "Tên mẫu là bắt buộc"),
  title: z.string().default(""),
  cashType: z.enum(["Income", "Expense"]).default("Expense"),
  amountOfMoney: z.number().nonnegative().default(0),
  description: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  primaryCategoryId: z.string().nullable().optional(),
  secondaryCategoryIds: z.array(z.string()).optional().default([]),
});

// PUT: update template by id
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  let userId = session?.user?.id;

  if (!userId) {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) userId = firstUser.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateTemplateSchema.parse(body);

    // Verify ownership
    const existing = await prisma.cashFlowTemplate.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy mẫu" }, { status: 404 });
    }

    // Delete existing secondary categories link
    await prisma.cashFlowTemplateSecondaryCategory.deleteMany({
      where: { templateId: id },
    });

    const updated = await prisma.cashFlowTemplate.update({
      where: { id },
      data: {
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

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("PUT /api/cashflow-template/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi cập nhật mẫu giao dịch" },
      { status: 500 }
    );
  }
}

// DELETE: delete template by id
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  let userId = session?.user?.id;

  if (!userId) {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) userId = firstUser.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.cashFlowTemplate.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy mẫu" }, { status: 404 });
    }

    await prisma.cashFlowTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/cashflow-template/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi xóa mẫu" },
      { status: 500 }
    );
  }
}
