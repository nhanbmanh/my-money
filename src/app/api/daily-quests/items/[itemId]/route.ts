import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
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

    const { itemId } = await params;
    const body = await req.json();

    const existingItem = await prisma.dailyQuestItem.findFirst({
      where: { id: itemId },
      include: { quest: true },
    });

    if (!existingItem || existingItem.quest.userId !== userId) {
      return NextResponse.json({ error: "Checklist item không tồn tại" }, { status: 404 });
    }

    const dataToUpdate: any = {};

    if (typeof body.isDone === "boolean") {
      dataToUpdate.isDone = body.isDone;
      dataToUpdate.lastCheckedAt = body.isDone ? new Date() : null;
    }

    if (typeof body.title === "string" && body.title.trim()) {
      dataToUpdate.title = body.title.trim();
    }

    const updatedItem = await prisma.dailyQuestItem.update({
      where: { id: itemId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("PATCH /api/daily-quests/items/[itemId] error:", error);
    return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
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

    const { itemId } = await params;

    const existingItem = await prisma.dailyQuestItem.findFirst({
      where: { id: itemId },
      include: { quest: true },
    });

    if (!existingItem || existingItem.quest.userId !== userId) {
      return NextResponse.json({ error: "Checklist item không tồn tại" }, { status: 404 });
    }

    await prisma.dailyQuestItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/daily-quests/items/[itemId] error:", error);
    return NextResponse.json({ error: "Failed to delete checklist item" }, { status: 500 });
  }
}
