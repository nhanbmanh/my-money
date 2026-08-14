import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getEndOfTodayVN } from "@/lib/date-utils";

const createPlanSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống"),
  content: z.string().optional().nullable(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Ngày không hợp lệ",
  }),
  status: z.number().int().min(0).max(3).default(0),
});

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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let whereClause: any = { userId };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const endOfToday = getEndOfTodayVN();

    // 1. Auto-update plans that have reached their execution date (date <= endOfToday) and still have status === 0 (Todo) to status === 1 (In Progress)
    await prisma.calendarPlan.updateMany({
      where: {
        userId,
        status: 0,
        date: {
          lte: endOfToday,
        },
      },
      data: {
        status: 1,
      },
    });

    // 2. Revert any future plans (date > endOfToday) that were incorrectly set to status 1 back to status 0 (Todo)
    await prisma.calendarPlan.updateMany({
      where: {
        userId,
        status: 1,
        date: {
          gt: endOfToday,
        },
      },
      data: {
        status: 0,
      },
    });

    const plans = await prisma.calendarPlan.findMany({
      where: whereClause,
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET /api/calendar-plans error:", error);
    return NextResponse.json(
      { error: "Lỗi server khi lấy danh sách kế hoạch" },
      { status: 500 }
    );
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
    const validatedData = createPlanSchema.parse(body);

    const planDate = new Date(validatedData.date);
    const endOfToday = getEndOfTodayVN();

    let finalStatus = validatedData.status;
    if (finalStatus === 0 && planDate <= endOfToday) {
      finalStatus = 1; // Auto-transition to In Progress (1) only if plan date is today or past
    }

    const newPlan = await prisma.calendarPlan.create({
      data: {
        userId,
        title: validatedData.title,
        content: validatedData.content || null,
        date: planDate,
        status: finalStatus,
      },
    });

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    console.error("POST /api/calendar-plans error:", error);
    return NextResponse.json(
      { error: "Lỗi server khi tạo kế hoạch" },
      { status: 500 }
    );
  }
}
