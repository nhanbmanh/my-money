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

  const existing = await prisma.category.findFirst({
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
    typeof body?.categoryName === "string" ? body.categoryName.trim() : "";

  if (!categoryName) {
    return NextResponse.json(
      { error: "Tên nhãn chính không được để trống" },
      { status: 400 },
    );
  }

  const updated = await prisma.category.update({
    where: { id },
    data: { categoryName },
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

  const category = await prisma.category.findFirst({
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
      // Set null primaryCategoryId trong các cashflow đang dùng category này
      prisma.cashFlow.updateMany({
        where: { primaryCategoryId: id },
        data: { primaryCategoryId: null },
      }),
      prisma.category.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete category", err);
    return NextResponse.json(
      { error: "Không thể xóa nhãn do lỗi máy chủ" },
      { status: 500 },
    );
  }
}
