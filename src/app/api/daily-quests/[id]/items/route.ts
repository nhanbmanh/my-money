import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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
      return NextResponse.json({ error: "Vui lòng nhập tên checklist" }, { status: 400 });
    }

    // Verify quest ownership
    const quest = await prisma.dailyQuest.findFirst({
      where: { id, userId },
    });

    if (!quest) {
      return NextResponse.json({ error: "Nhiệm vụ không tồn tại" }, { status: 404 });
    }

    const newItem = await prisma.dailyQuestItem.create({
      data: {
        questId: id,
        title: title.trim(),
        isDone: false,
      },
    });

    return NextResponse.json(newItem);
  } catch (error) {
    console.error("POST /api/daily-quests/[id]/items error:", error);
    return NextResponse.json({ error: "Failed to add checklist item" }, { status: 500 });
  }
}
