import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const body = await req.json();
    const { title } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập tên nhiệm vụ" }, { status: 400 });
    }

    const quest = await prisma.dailyQuest.update({
      where: { id, userId },
      data: { title: title.trim() },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(quest);
  } catch (error) {
    console.error("PUT /api/daily-quests/[id] error:", error);
    return NextResponse.json({ error: "Failed to update daily quest" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    await prisma.dailyQuest.delete({
      where: { id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/daily-quests/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete daily quest" }, { status: 500 });
  }
}
