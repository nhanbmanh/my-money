import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.source.findMany({
    where: {
      OR: [{ userId: session.user.id }, { userId: null }],
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(sources);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sourceName, sourceType } = await req.json();

  if (!sourceName?.trim()) {
    return NextResponse.json(
      { error: "Tên nguồn không được để trống" },
      { status: 400 },
    );
  }

  const source = await prisma.source.create({
    data: {
      user: { connect: { id: session.user.id } },
      sourceName: sourceName.trim(),
    },
  });

  return NextResponse.json(source, { status: 201 });
}
