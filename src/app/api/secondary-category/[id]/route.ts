import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.secondaryCategory.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy hoặc không có quyền sửa" },
      { status: 404 },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const categoryName =
    typeof body?.categoryName === "string" ? body.categoryName.trim() : existing.categoryName;
  const type = body?.type;
  const parsedType = Number.isInteger(type) ? type : existing.type;
  const budgetLimit = body?.budgetLimit;
  const parsedBudgetLimit =
    budgetLimit !== undefined && budgetLimit !== null && Number(budgetLimit) >= 0
      ? Number(budgetLimit)
      : budgetLimit === null || budgetLimit === -1
      ? -1
      : existing.budgetLimit;

  if (!categoryName) {
    return NextResponse.json(
      { error: "Tên nhãn phụ không được để trống" },
      { status: 400 },
    );
  }

  const updated = await prisma.secondaryCategory.update({
    where: { id },
    data: {
      categoryName,
      budgetLimit: parsedBudgetLimit,
      ...(typeof parsedType === "number" ? { type: parsedType } : {}),
    },
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

  const category = await prisma.secondaryCategory.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!category) {
    return NextResponse.json(
      { error: "Không tìm thấy hoặc không có quyền xóa" },
      { status: 404 },
    );
  }

  try {
    await prisma.$transaction([
      // Xóa hết các bản ghi join trong CashFlowSecondaryCategory
      prisma.cashFlowSecondaryCategory.deleteMany({
        where: { secondaryCategoryId: id },
      }),
      prisma.secondaryCategory.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete secondary category", err);
    return NextResponse.json(
      { error: "Không thể xóa nhãn phụ do lỗi máy chủ" },
      { status: 500 },
    );
  }
}
