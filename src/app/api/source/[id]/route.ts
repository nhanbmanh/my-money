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

  const existing = await prisma.source.findFirst({
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

  const sourceName =
    typeof body?.sourceName === "string" ? body.sourceName.trim() : "";

  if (!sourceName) {
    return NextResponse.json(
      { error: "Tên nguồn tiền không được để trống" },
      { status: 400 },
    );
  }

  const updated = await prisma.source.update({
    where: { id },
    data: { sourceName },
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

  const source = await prisma.source.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!source) {
    return NextResponse.json(
      { error: "Không tìm thấy hoặc không có quyền xóa" },
      { status: 404 },
    );
  }

  try {
    await prisma.$transaction([
      // Set null sourceId trong các cashflow đang dùng source này
      prisma.cashFlow.updateMany({
        where: { sourceId: id },
        data: { sourceId: null },
      }),
      prisma.source.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete source", err);
    return NextResponse.json(
      { error: "Không thể xóa nguồn do lỗi máy chủ" },
      { status: 500 },
    );
  }
}
