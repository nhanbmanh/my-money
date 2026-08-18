import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStartOfTodayVN } from "@/lib/date-utils";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const rawQuests = await prisma.dailyQuest.findMany({
      where: {
        userId,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { items: { some: { title: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const startOfToday = getStartOfTodayVN();
    const startOfTodayTime = startOfToday.getTime();
    const itemsToResetIds: string[] = [];

    // Process 00:00 VNT Auto-Reset
    const quests = rawQuests.map((quest) => {
      const items = (quest.items || []).map((item) => {
        let isDone = item.isDone;
        const lastCheckedTime = item.lastCheckedAt ? new Date(item.lastCheckedAt).getTime() : 0;

        // If checked before 00:00 VNT today, auto-reset to false
        if (isDone && lastCheckedTime < startOfTodayTime) {
          isDone = false;
          itemsToResetIds.push(item.id);
        }

        return {
          ...item,
          isDone,
        };
      });

      return {
        ...quest,
        items,
      };
    });

    // Asynchronously sync database reset in background
    if (itemsToResetIds.length > 0) {
      prisma.dailyQuestItem
        .updateMany({
          where: { id: { in: itemsToResetIds } },
          data: { isDone: false },
        })
        .catch((err: any) => console.error("Async quest reset error:", err));
    }

    return NextResponse.json(quests);
  } catch (error) {
    console.error("GET /api/daily-quests error:", error);
    return NextResponse.json({ error: "Failed to fetch daily quests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const { title, items = [] } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập tên nhiệm vụ" }, { status: 400 });
    }

    const itemsData = (Array.isArray(items) ? items : [])
      .filter((i: any) => typeof i === "string" && i.trim())
      .map((i: string) => ({
        title: i.trim(),
        isDone: false,
      }));

    const quest = await prisma.dailyQuest.create({
      data: {
        userId,
        title: title.trim(),
        items: {
          create: itemsData,
        },
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(quest);
  } catch (error: any) {
    console.error("POST /api/daily-quests error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create daily quest" },
      { status: 500 }
    );
  }
}
