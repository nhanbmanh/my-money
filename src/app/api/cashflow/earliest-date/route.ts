import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    const earliest = await prisma.cashFlow.findFirst({
      where: { userId },
      orderBy: { datetime: "asc" },
      select: { datetime: true },
    });

    return NextResponse.json({
      earliestDate: earliest?.datetime ? earliest.datetime.toISOString() : null,
    });
  } catch (error) {
    console.error("GET /api/cashflow/earliest-date error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
