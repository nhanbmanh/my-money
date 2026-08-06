import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Fetch incomplete cashflow records for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await prisma.cashFlow.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { sourceId: null },
          { primaryCategoryId: null },
          { secondaryCategories: { none: {} } },
        ],
      },
      include: {
        source: true,
        primaryCategory: true,
        secondaryCategories: {
          include: {
            secondaryCategory: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch incomplete items" },
      { status: 500 }
    );
  }
}
