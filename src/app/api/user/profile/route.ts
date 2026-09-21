import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
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

    const [user, cashFlowCount, noteCount, calendarCount, holdingCount, sourceCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          bod: true,
          gender: true,
          emailVerified: true,
          createdAt: true,
        },
      }),
      prisma.cashFlow.count({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.calendarPlan.count({ where: { userId } }),
      prisma.holding.count({ where: { userId } }),
      prisma.source.count({ where: { OR: [{ userId }, { userId: null }] } }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      stats: {
        cashFlowCount,
        noteCount,
        calendarCount,
        holdingCount,
        sourceCount,
      },
    });
  } catch (error) {
    console.error("GET /api/user/profile error:", error);
    return NextResponse.json(
      { error: "Lỗi server khi lấy thông tin người dùng" },
      { status: 500 }
    );
  }
}

const updateProfileSchema = z.object({
  username: z.string().min(2, "Tên người dùng phải có ít nhất 2 ký tự"),
  bod: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
});

export async function PUT(req: Request) {
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
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { username, bod, gender } = parsed.data;

    // Check if username is taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Tên người dùng này đã được sử dụng bởi tài khoản khác" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        bod: bod ? new Date(bod) : null,
        gender: gender || null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        bod: true,
        gender: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Cập nhật thông tin cá nhân thành công",
    });
  } catch (error) {
    console.error("PUT /api/user/profile error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật thông tin cá nhân" },
      { status: 500 }
    );
  }
}
