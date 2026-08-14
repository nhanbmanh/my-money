import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getEndOfTodayVN } from "@/lib/date-utils";

const updatePlanSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống"),
  content: z.string().optional().nullable(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Ngày không hợp lệ",
  }),
  status: z.number().int().min(0).max(3),
});

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
    const validatedData = updatePlanSchema.parse(body);

    const existingPlan = await prisma.calendarPlan.findFirst({
      where: { id, userId },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: "Không tìm thấy kế hoạch" },
        { status: 404 }
      );
    }

    const planDate = new Date(validatedData.date);
    const endOfToday = getEndOfTodayVN();

    let finalStatus = validatedData.status;
    if (finalStatus === 0 && planDate <= endOfToday) {
      finalStatus = 1; // Auto-transition to In Progress (1) only if plan date is today or past
    }

    const updatedPlan = await prisma.calendarPlan.update({
      where: { id },
      data: {
        title: validatedData.title,
        content: validatedData.content || null,
        date: planDate,
        status: finalStatus,
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    console.error("PUT /api/calendar-plans/[id] error:", error);
    return NextResponse.json(
      { error: "Lỗi server khi cập nhật kế hoạch" },
      { status: 500 }
    );
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

    const existingPlan = await prisma.calendarPlan.findFirst({
      where: { id, userId },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: "Không tìm thấy kế hoạch" },
        { status: 404 }
      );
    }

    await prisma.calendarPlan.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Xóa kế hoạch thành công" });
  } catch (error) {
    console.error("DELETE /api/calendar-plans/[id] error:", error);
    return NextResponse.json(
      { error: "Lỗi server khi xóa kế hoạch" },
      { status: 500 }
    );
  }
}
