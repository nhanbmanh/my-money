import { NextResponse } from "next/server";
import { searchMarketTickers } from "@/lib/market-ticker-service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const results = await searchMarketTickers(q);
    return NextResponse.json({ success: true, tickers: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
