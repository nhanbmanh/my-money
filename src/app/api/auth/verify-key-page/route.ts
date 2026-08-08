import { NextResponse } from "next/server";

export async function GET() {
  const envKey = process.env.KEY_PAGE?.trim();
  const isRequired = !!envKey;
  return NextResponse.json({ isRequired });
}

export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    const envKey = process.env.KEY_PAGE?.trim();

    // If KEY_PAGE is not configured in env, access is open
    if (!envKey) {
      const response = NextResponse.json({ success: true, isRequired: false });
      response.cookies.set("page_key_verified", "true", {
        httpOnly: false,
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
      return response;
    }

    // Verify key match
    if (key?.trim() !== envKey) {
      return NextResponse.json(
        { error: "Mã truy cập trang (KEY_PAGE) không chính xác. Vui lòng kiểm tra lại!" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true, isRequired: true });
    response.cookies.set("page_key_verified", "true", {
      httpOnly: false,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xác thực mã truy cập trang" },
      { status: 500 }
    );
  }
}
