import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  datetime: z.string().optional(),
  cashType: z.enum(["Income", "Expense"]),
  amountOfMoney: z.number().positive(),
  sourceId: z.string().optional(),
  primaryCategoryId: z.string().optional(),
  secondaryCategoryIds: z.array(z.string()).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.cashFlow.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy giao dịch" },
      { status: 404 },
    );
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { secondaryCategoryIds, sourceId, primaryCategoryId, ...data } =
    parsed.data;

  const normalizedSourceId = sourceId?.trim() ? sourceId : undefined;
  const normalizedPrimaryCategoryId = primaryCategoryId?.trim()
    ? primaryCategoryId
    : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    // Xóa secondary categories cũ
    await tx.cashFlowSecondaryCategory.deleteMany({
      where: { cashFlowId: id },
    });

    return tx.cashFlow.update({
      where: { id },
      data: {
        ...data,
        datetime: data.datetime ? new Date(data.datetime) : existing.datetime,
        source: normalizedSourceId
          ? { connect: { id: normalizedSourceId } }
          : undefined,
        primaryCategory: normalizedPrimaryCategoryId
          ? { connect: { id: normalizedPrimaryCategoryId } }
          : undefined,
        secondaryCategories: secondaryCategoryIds?.length
          ? {
              create: secondaryCategoryIds.map((id) => ({
                secondaryCategoryId: id,
              })),
            }
          : undefined,
      },
      include: {
        source: true,
        primaryCategory: true,
        secondaryCategories: { include: { secondaryCategory: true } },
      },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.cashFlow.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy giao dịch" },
      { status: 404 },
    );
  }

  await prisma.cashFlow.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
