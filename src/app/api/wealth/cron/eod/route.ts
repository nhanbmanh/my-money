import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Tính năng chốt giá EOD đã được loại bỏ theo yêu cầu."
  });
}
