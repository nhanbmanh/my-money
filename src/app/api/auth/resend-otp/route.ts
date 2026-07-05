import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOtp, sendOtpEmail } from "@/lib/otp";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Email không hợp lệ" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Tài khoản không tồn tại" },
        { status: 404 },
      );
    }
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email đã được xác thực" },
        { status: 400 },
      );
    }

    const code = await createOtp(user.id);
    await sendOtpEmail(user.email, code);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
