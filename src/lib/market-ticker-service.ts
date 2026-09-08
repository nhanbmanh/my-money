export interface MarketTicker {
  symbol: string;
  name: string;
  assetClass: "STOCKS" | "CRYPTO" | "GOLD" | "CCQ" | "BOND" | "OTHER";
  currentPrice: number; // In VND
  currency: string;
  logoUrl?: string;
  change24h?: number;
  defaultUnit?: string;
}

export const BASE_POPULAR_TICKERS: MarketTicker[] = [
  // Vietnam Stocks
  { symbol: "HPG", name: "Tập đoàn Hòa Phát", assetClass: "STOCKS", currentPrice: 22100, currency: "VND", defaultUnit: "Cổ phiếu", change24h: 1.37 },
  { symbol: "VNM", name: "Vinamilk", assetClass: "STOCKS", currentPrice: 62100, currency: "VND", defaultUnit: "Cổ phiếu", change24h: -0.48 },
  { symbol: "FPT", name: "Tập đoàn FPT", assetClass: "STOCKS", currentPrice: 71800, currency: "VND", defaultUnit: "Cổ phiếu", change24h: 2.15 },
  { symbol: "MWG", name: "Thế Giới Di Động", assetClass: "STOCKS", currentPrice: 73000, currency: "VND", defaultUnit: "Cổ phiếu", change24h: 1.11 },
  { symbol: "TCB", name: "Ngân hàng Techcombank", assetClass: "STOCKS", currentPrice: 31350, currency: "VND", defaultUnit: "Cổ phiếu", change24h: 0.81 },
  { symbol: "VHM", name: "Vinhomes", assetClass: "STOCKS", currentPrice: 71600, currency: "VND", defaultUnit: "Cổ phiếu", change24h: -1.24 },
  { symbol: "SSI", name: "Chứng khoán SSI", assetClass: "STOCKS", currentPrice: 26500, currency: "VND", defaultUnit: "Cổ phiếu", change24h: 1.52 },
  { symbol: "MBB", name: "Ngân hàng MB", assetClass: "STOCKS", currentPrice: 24200, currency: "VND", defaultUnit: "Cổ phiếu", change24h: -0.21 },

  // Crypto (in VND)
  { symbol: "BTC", name: "Bitcoin", assetClass: "CRYPTO", currentPrice: 1702500000, currency: "VND", defaultUnit: "BTC", change24h: 2.84 },
  { symbol: "ETH", name: "Ethereum", assetClass: "CRYPTO", currentPrice: 50180000, currency: "VND", defaultUnit: "ETH", change24h: -1.15 },
  { symbol: "SOL", name: "Solana", assetClass: "CRYPTO", currentPrice: 1957000, currency: "VND", defaultUnit: "SOL", change24h: 4.12 },
  { symbol: "USDT", name: "Tether USD", assetClass: "CRYPTO", currentPrice: 26190, currency: "VND", defaultUnit: "USDT", change24h: 0.05 },
  { symbol: "BNB", name: "Binance Coin", assetClass: "CRYPTO", currentPrice: 15570000, currency: "VND", defaultUnit: "BNB", change24h: 1.05 },

  // Gold & Precious Metals (Vàng & Kim Loại Quý)
  { symbol: "XAUUSD", name: "Vàng Thế Giới (GOLD / XAU USD)", assetClass: "GOLD", currentPrice: 137245670, currency: "VND", defaultUnit: "Lượng", change24h: 0.04 },
  { symbol: "SJC", name: "Vàng Miếng SJC 999.9", assetClass: "GOLD", currentPrice: 141100000, currency: "VND", defaultUnit: "Lượng", change24h: 0.35 },
  { symbol: "PNJ", name: "Vàng Nhẫn PNJ 999.9", assetClass: "GOLD", currentPrice: 14060000, currency: "VND", defaultUnit: "Chỉ", change24h: 0.42 },
  { symbol: "GOLD9999", name: "Vàng Nhẫn Trơn 9999 (SJC/Bảo Tín/Doji)", assetClass: "GOLD", currentPrice: 14060000, currency: "VND", defaultUnit: "Chỉ", change24h: 0.42 },
  { symbol: "DOJI", name: "Vàng Nhẫn Doji Hưng Thịnh Vượng", assetClass: "GOLD", currentPrice: 14080000, currency: "VND", defaultUnit: "Chỉ", change24h: 0.38 },
  { symbol: "SILVER", name: "Bạc Kim Loại Quý (SILVER / XAG USD)", assetClass: "GOLD", currentPrice: 2046143, currency: "VND", defaultUnit: "Lượng", change24h: 1.96 },
  { symbol: "PLATINUM", name: "Bạch Kim (PLATINUM)", assetClass: "GOLD", currentPrice: 55217988, currency: "VND", defaultUnit: "Lượng", change24h: -0.67 },
  { symbol: "COPPER", name: "Đồng Kim Loại (COPPER)", assetClass: "GOLD", currentPrice: 381865, currency: "VND", defaultUnit: "Kg", change24h: 0.62 },

  // Mutual Funds / CCQ (NAV thực tế)
  { symbol: "E1VFVN30", name: "ETF VFMVN30", assetClass: "CCQ", currentPrice: 24200, currency: "VND", defaultUnit: "CCQ", change24h: 0.41 },
  { symbol: "FUEVFVND", name: "ETF VNDiamond", assetClass: "CCQ", currentPrice: 32800, currency: "VND", defaultUnit: "CCQ", change24h: 0.61 },
  { symbol: "DCDS", name: "Quỹ Đầu tư Năng động Dragon Capital", assetClass: "CCQ", currentPrice: 94800, currency: "VND", defaultUnit: "CCQ", change24h: 0.85 },
  { symbol: "VESAF", name: "Quỹ VinaCapital VESAF", assetClass: "CCQ", currentPrice: 35200, currency: "VND", defaultUnit: "CCQ", change24h: 0.92 }
];

// Memory cache for fetched prices (15 seconds short cache for fresh realtime market data)
const priceCache: Record<
  string,
  {
    price: number;
    change24h?: number;
    yesterdayPrice?: number;
    historyMap?: Record<string, number>;
    timestamp: number;
  }
> = {};
const CACHE_TTL_MS = 15 * 1000; // 15 seconds short cache

/**
 * Helper function with 4s timeout to prioritize accurate realtime market prices via parallel fetches
 */
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGold5yHistoryMap(isPerChi: boolean = false): Promise<Record<string, number>> {
  const historyMap: Record<string, number> = {};
  try {
    const goldRes = await fetchWithTimeout(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=5y&interval=1d",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      }
    );
    if (goldRes.ok) {
      const goldData = await goldRes.json();
      const result = goldData?.chart?.result?.[0];
      const timestamps: number[] = result?.timestamp || [];
      const closes: number[] = result?.indicators?.quote?.[0]?.close || [];
      const usdVndRate = 25450;
      // 1 Troy Ounce = 31.1035 grams. 1 Lượng = 37.5 grams. -> 1 Lượng = 1.205653 Troy Ounces
      const ozToLượngFactor = 1.205653;

      let lastClose = 0;
      timestamps.forEach((ts: number, idx: number) => {
        const closeVal = closes[idx];
        if (closeVal && closeVal > 0) {
          const lượngPrice = Math.round(closeVal * ozToLượngFactor * usdVndRate);
          lastClose = isPerChi ? Math.round(lượngPrice / 10) : lượngPrice;
        }
        if (ts && lastClose > 0) {
          const d = new Date(ts * 1000);
          const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate()
          ).padStart(2, "0")}`;
          historyMap[dateKey] = lastClose;
        }
      });

      // Forward fill missing calendar days
      const sortedDates = Object.keys(historyMap).sort();
      if (sortedDates.length > 0) {
        const startDate = new Date(sortedDates[0]);
        const endDate = new Date();
        let curr = new Date(startDate);
        let lastVal = historyMap[sortedDates[0]];
        while (curr <= endDate) {
          const dateKey = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(curr.getDate()).padStart(2, "0")}`;
          if (historyMap[dateKey]) {
            lastVal = historyMap[dateKey];
          } else {
            historyMap[dateKey] = lastVal;
          }
          curr.setDate(curr.getDate() + 1);
        }
      }
    }
  } catch {
    // Ignore fetch error
  }
  return historyMap;
}

/**
  * Scaled historyMap so that the latest mapped price matches livePrice (giavang.org) 100%,
  * preserving domestic gold market levels while following historical trends.
  */
function scaleHistoryMapToLivePrice(
  rawMap: Record<string, number>,
  livePrice: number
): Record<string, number> {
  if (!rawMap || livePrice <= 0) return rawMap || {};

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const sortedDates = Object.keys(rawMap).sort();
  if (sortedDates.length === 0) return rawMap;

  const latestMapPrice = rawMap[todayKey] || rawMap[sortedDates[sortedDates.length - 1]];
  if (!latestMapPrice || latestMapPrice <= 0) return rawMap;

  const scaleFactor = livePrice / latestMapPrice;
  const scaledMap: Record<string, number> = {};

  sortedDates.forEach((dateKey) => {
    scaledMap[dateKey] = Math.round(rawMap[dateKey] * scaleFactor);
  });

  scaledMap[todayKey] = livePrice;
  return scaledMap;
}

/**
 * Compute Gold price details (price, yesterdayPrice, change24h, historyMap)
 * using domestic livePrice for base valuation and international world gold trends for daily variation & historyMap.
 */
function buildGoldDetails(
  rawHistoryMap: Record<string, number>,
  livePrice: number
): {
  price: number;
  change24h: number;
  yesterdayPrice: number;
  historyMap: Record<string, number>;
} {
  const historyMap = scaleHistoryMapToLivePrice(rawHistoryMap, livePrice);
  const sortedDates = Object.keys(historyMap).sort();

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  let yesterdayPrice = livePrice;
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    if (sortedDates[i] < todayKey) {
      yesterdayPrice = historyMap[sortedDates[i]];
      break;
    }
  }

  if (yesterdayPrice === livePrice && sortedDates.length > 1) {
    yesterdayPrice = historyMap[sortedDates[sortedDates.length - 2]];
  }

  const change24h =
    yesterdayPrice > 0 ? Number((((livePrice - yesterdayPrice) / yesterdayPrice) * 100).toFixed(2)) : 0;

  return { price: livePrice, change24h, yesterdayPrice, historyMap };
}

export async function fetchLivePriceFromPublicAPIs(
  symbol: string
): Promise<{
  price: number;
  change24h?: number;
  yesterdayPrice?: number;
  historyMap?: Record<string, number>;
} | null> {
  const cleanSymbol = symbol.toUpperCase().trim();

  // Check cache
  if (priceCache[cleanSymbol] && Date.now() - priceCache[cleanSymbol].timestamp < CACHE_TTL_MS) {
    return {
      price: priceCache[cleanSymbol].price,
      change24h: priceCache[cleanSymbol].change24h,
      yesterdayPrice: priceCache[cleanSymbol].yesterdayPrice,
      historyMap: priceCache[cleanSymbol].historyMap,
    };
  }

  try {
    // 1. Check Crypto Binance API (1000 daily entries for multi-year history)
    const binanceMap: Record<string, string> = {
      BTC: "BTCUSDT",
      ETH: "ETHUSDT",
      SOL: "SOLUSDT",
      BNB: "BNBUSDT",
      USDT: "USDTBIDR",
    };

    if (binanceMap[cleanSymbol]) {
      try {
        const binanceSymbol = binanceMap[cleanSymbol];
        const res = await fetchWithTimeout(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1d&limit=1000`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 300 },
          }
        );

        if (res.ok) {
          const klines: any[] = await res.json();
          if (klines.length > 0) {
            const usdVndRate = 25450;
            const historyMap: Record<string, number> = {};

            klines.forEach((k) => {
              const ts = k[0];
              const closeVal = Number(k[4]);
              if (ts && closeVal > 0) {
                const d = new Date(ts);
                const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
                  d.getDate()
                ).padStart(2, "0")}`;

                const closeVND = Math.round(closeVal * usdVndRate);
                historyMap[dateKey] = closeVND;
              }
            });

            const latestKline = klines[klines.length - 1];
            const price = Math.round(Number(latestKline[4]) * usdVndRate);
            const prevKline = klines.length > 1 ? klines[klines.length - 2] : latestKline;
            const yesterdayPrice = Math.round(Number(prevKline[4]) * usdVndRate);
            const change24h =
              yesterdayPrice > 0
                ? Number((((price - yesterdayPrice) / yesterdayPrice) * 100).toFixed(2))
                : 0;

            priceCache[cleanSymbol] = { price, change24h, yesterdayPrice, historyMap, timestamp: Date.now() };
            return { price, change24h, yesterdayPrice, historyMap };
          }
        }
      } catch (err) {
        console.warn(`Binance fetch warning for ${cleanSymbol}:`, err);
      }
    }

    // 2. Check Vietnam Stock & ETF via CafeF API (with 35-day history for EOD closes & history map)
    if (
      !cleanSymbol.includes(".") &&
      cleanSymbol.length <= 8 &&
      !["SJC", "PNJ", "GOLD9999", "DOJI", "XAUUSD", "SILVER", "PLATINUM", "COPPER", "DCDS", "VESAF"].includes(
        cleanSymbol
      )
    ) {
      const now = new Date();
      const currentYear = now.getFullYear();

      // Multi-window queries: recent 3M, end of previous years dynamically
      const windows = [
        {
          startDate: `${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0")}/01/${
            now.getMonth() === 0 ? currentYear - 1 : currentYear
          }`,
          endDate: `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(
            2,
            "0"
          )}/${currentYear}`,
        },
        { startDate: `10/01/${currentYear - 1}`, endDate: `01/05/${currentYear}` },
        { startDate: `10/01/${currentYear - 2}`, endDate: `01/05/${currentYear - 1}` },
        { startDate: `10/01/${currentYear - 3}`, endDate: `01/05/${currentYear - 2}` },
      ];

      const historyMap: Record<string, number> = {};
      let price = 0;
      let lastCloseBeforeToday = 0;
      let latestItem: any = null;

      await Promise.all(
        windows.map(async (win) => {
          try {
            const res = await fetchWithTimeout(
              `https://cafef.vn/du-lieu/Ajax/PageNew/DataHistory/PriceHistory.ashx?ExchangeType=&Symbol=${cleanSymbol}&StartDate=${win.startDate}&EndDate=${win.endDate}&PageIndex=1&PageSize=40`,
              {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  Referer: `https://s.cafef.vn/Lich-su-giao-dich-${cleanSymbol}-1.chn`,
                },
                next: { revalidate: 300 },
              }
            );

            if (res.ok) {
              const data = await res.json();
              const items: any[] = data?.Data?.Data || [];
              items.forEach((item) => {
                const dateParts = (item.Ngay || "").split("/"); // DD/MM/YYYY
                if (dateParts.length === 3) {
                  const dateKey = `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(
                    2,
                    "0"
                  )}`;
                  const itemCloseVND = Math.round(Number(item.GiaDongCua || 0) * 1000);

                  if (itemCloseVND > 0) {
                    historyMap[dateKey] = itemCloseVND;
                  }
                }
              });

              if (win === windows[0] && items.length > 0) {
                latestItem = items[0];
                price = Math.round(Number(latestItem.GiaDongCua || 0) * 1000);
              }
            }
          } catch (err) {
            console.warn(`CafeF window fetch warning for ${cleanSymbol}:`, err);
          }
        })
      );

      if (price > 0) {
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`;

        const sortedDates = Object.keys(historyMap).sort();
        sortedDates.forEach((dateKey) => {
          if (dateKey < todayKey) {
            lastCloseBeforeToday = historyMap[dateKey];
          }
        });

        // Forward fill missing calendar days in historyMap
        if (sortedDates.length > 0) {
          const startDate = new Date(sortedDates[0]);
          const endDate = new Date(now);

          let curr = new Date(startDate);
          let lastKnownPrice = historyMap[sortedDates[0]];

          while (curr <= endDate) {
            const dateKey = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(curr.getDate()).padStart(2, "0")}`;

            if (historyMap[dateKey]) {
              lastKnownPrice = historyMap[dateKey];
            } else {
              historyMap[dateKey] = lastKnownPrice;
            }
            curr.setDate(curr.getDate() + 1);
          }
        }

        const yesterdayPrice = lastCloseBeforeToday > 0 ? lastCloseBeforeToday : price;
        let change24h: number | undefined = undefined;

        if (latestItem?.ThayDoi && latestItem.ThayDoi.includes("(")) {
          const matchPct = latestItem.ThayDoi.match(/\(([-+]?\d+[,.]?\d*)%\)/);
          if (matchPct) {
            change24h = Number(matchPct[1].replace(",", "."));
          }
        }

        if (change24h === undefined && yesterdayPrice > 0 && yesterdayPrice !== price) {
          change24h = Number((((price - yesterdayPrice) / yesterdayPrice) * 100).toFixed(2));
        }

        priceCache[cleanSymbol] = { price, change24h, yesterdayPrice, historyMap, timestamp: Date.now() };
        return { price, change24h, yesterdayPrice, historyMap };
      }
    }

    // 3. Check Gold & Precious Metals Live API (with 5-year daily historyMap)
    if (["SJC", "PNJ", "GOLD9999", "DOJI", "XAUUSD", "SILVER", "PLATINUM", "COPPER"].includes(cleanSymbol)) {
      const isPerChi = ["PNJ", "GOLD9999", "DOJI"].includes(cleanSymbol);
      const rawHistoryMap = await fetchGold5yHistoryMap(isPerChi);

      try {
        const tthhRes = await fetchWithTimeout("https://www.thitruonghanghoa.com/", {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          next: { revalidate: 300 },
        });
        if (tthhRes.ok) {
          const htmlText = await tthhRes.text();

          if (cleanSymbol === "XAUUSD" || cleanSymbol === "GOLD") {
            const m = htmlText.match(
              /Vàng[\s\S]*?GOLD\s*\/\s*XAU\s*USD[\s\S]*?([\d.]+)\s*VNĐ\s*\/\s*lượng[\s\S]*?([+-]?[\d.]+)\%/i
            );
            if (m) {
              const lượngPrice = Math.round(parseFloat(m[1].replace(/\./g, "")));
              const change24h = parseFloat(m[2]);
              const yesterdayPrice = change24h ? Math.round(lượngPrice / (1 + change24h / 100)) : lượngPrice;
              if (lượngPrice > 50000000) {
                const historyMap = scaleHistoryMapToLivePrice(rawHistoryMap, lượngPrice);
                priceCache[cleanSymbol] = { price: lượngPrice, change24h, yesterdayPrice, historyMap, timestamp: Date.now() };
                return { price: lượngPrice, change24h, yesterdayPrice, historyMap };
              }
            }
          }

          if (cleanSymbol === "SILVER") {
            const m = htmlText.match(
              /Bạc[\s\S]*?SILVER\s*\/\s*XAG\s*USD[\s\S]*?([\d.]+)\s*VNĐ\s*\/\s*lượng[\s\S]*?([+-]?[\d.]+)\%/i
            );
            if (m) {
              const lượngPrice = Math.round(parseFloat(m[1].replace(/\./g, "")));
              const change24h = parseFloat(m[2]);
              const yesterdayPrice = change24h ? Math.round(lượngPrice / (1 + change24h / 100)) : lượngPrice;
              if (lượngPrice > 500000) {
                const historyMap = scaleHistoryMapToLivePrice(rawHistoryMap, lượngPrice);
                priceCache["SILVER"] = { price: lượngPrice, change24h, yesterdayPrice, historyMap, timestamp: Date.now() };
                return { price: lượngPrice, change24h, yesterdayPrice, historyMap };
              }
            }
          }

          if (cleanSymbol === "PLATINUM") {
            const m = htmlText.match(
              /Bạch kim[\s\S]*?PLATINUM[\s\S]*?([\d.]+)\s*VNĐ\s*\/\s*lượng[\s\S]*?([+-]?[\d.]+)\%/i
            );
            if (m) {
              const lượngPrice = Math.round(parseFloat(m[1].replace(/\./g, "")));
              const change24h = parseFloat(m[2]);
              const yesterdayPrice = change24h ? Math.round(lượngPrice / (1 + change24h / 100)) : lượngPrice;
              if (lượngPrice > 10000000) {
                const historyMap = scaleHistoryMapToLivePrice(rawHistoryMap, lượngPrice);
                priceCache["PLATINUM"] = { price: lượngPrice, change24h, yesterdayPrice, historyMap, timestamp: Date.now() };
                return { price: lượngPrice, change24h, yesterdayPrice, historyMap };
              }
            }
          }
        }
      } catch (err) {
        console.warn("thitruonghanghoa.com live fetch warning:", err);
      }

      try {
        const gvRes = await fetchWithTimeout("https://giavang.org/", {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          next: { revalidate: 300 },
        });
        if (gvRes.ok) {
          const htmlText = await gvRes.text();
          const miengMatch = htmlText.match(/Miếng SJC[\s\S]*?BÁN RA[\s\S]*?([\d.]+)/i);
          const nhanMatch = htmlText.match(/Nhẫn SJC[\s\S]*?BÁN RA[\s\S]*?([\d.]+)/i);

          if (miengMatch && cleanSymbol === "SJC") {
            const valStr = miengMatch[1];
            const priceLượng = Math.round(parseFloat(valStr.replace(/\./g, "")) * 1000);
            if (priceLượng > 50000000) {
              const details = buildGoldDetails(rawHistoryMap, priceLượng);
              priceCache["SJC"] = { ...details, timestamp: Date.now() };
              return details;
            }
          }

          if (nhanMatch && ["PNJ", "GOLD9999", "DOJI"].includes(cleanSymbol)) {
            const valStr = nhanMatch[1];
            const priceChỉ = Math.round((parseFloat(valStr.replace(/\./g, "")) * 1000) / 10);
            if (priceChỉ > 5000000) {
              const details = buildGoldDetails(rawHistoryMap, priceChỉ);
              priceCache[cleanSymbol] = { ...details, timestamp: Date.now() };
              return details;
            }
          }
        }
      } catch (err) {
        console.warn("Giavang.org live fetch warning:", err);
      }

      try {
        const sjcRes = await fetchWithTimeout("https://sjc.com.vn/xml/tygiavang.xml", {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 300 },
        });
        if (sjcRes.ok) {
          const xmlText = await sjcRes.text();
          const sjcMatch = xmlText.match(/type="[^"]*SJC[^"]*"[^>]*buy="([\d,.]+)"[^>]*sell="([\d,.]+)"/i);
          if (sjcMatch) {
            const sellK = parseFloat(sjcMatch[2].replace(/,/g, ""));
            if (sellK > 1000) {
              const sjcLượngPrice = Math.round(sellK * 1000);
              const sjcChỉPrice = Math.round(sjcLượngPrice / 10);

              if (cleanSymbol === "SJC") {
                const details = buildGoldDetails(rawHistoryMap, sjcLượngPrice);
                priceCache["SJC"] = { ...details, timestamp: Date.now() };
                return details;
              }
              if (["PNJ", "GOLD9999", "DOJI"].includes(cleanSymbol)) {
                const nhanPrice = Math.round(sjcChỉPrice * 0.985);
                const details = buildGoldDetails(rawHistoryMap, nhanPrice);
                priceCache[cleanSymbol] = { ...details, timestamp: Date.now() };
                return details;
              }
            }
          }
        }
      } catch (err) {
        console.warn("SJC Live XML fetch warning:", err);
      }

      const sortedDates = Object.keys(rawHistoryMap).sort();
      const fallbackPrice = sortedDates.length > 0 ? rawHistoryMap[sortedDates[sortedDates.length - 1]] : 14710000;
      const details = buildGoldDetails(rawHistoryMap, fallbackPrice);
      priceCache[cleanSymbol] = { ...details, timestamp: Date.now() };
      return details;
    }

    // 4. Check Vietnam Mutual Funds (CCQ) via Fmarket API
    const fundCodeMap: Record<string, string> = {
      DCDS: "VFMVF1",
      VFMVF1: "VFMVF1",
    };

    const searchCode = fundCodeMap[cleanSymbol] || cleanSymbol;

    try {
      const fmarketRes = await fetchWithTimeout("https://api.fmarket.vn/res/products/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          types: ["NEW_FUND", "TRADING_FUND"],
          issuerIds: [],
          sortOrder: "DESC",
          sortField: "navTo1Month",
          search: searchCode,
        }),
        next: { revalidate: 300 },
      });

      if (fmarketRes.ok) {
        const json = await fmarketRes.json();
        const rows = json?.data?.rows || [];
        const matched = rows.find((r: any) => r.code === searchCode || r.code === cleanSymbol);
          if (matched?.nav && matched.nav > 0) {
            const price = Math.round(matched.nav);
            const rawPreviousNav = matched.productNavChange?.previousNav
              ? Math.round(matched.productNavChange.previousNav)
              : price;

            // Check if today is weekend in Vietnam time (Saturday = 6, Sunday = 0)
            const now = new Date();
            const vnDay = new Date(now.getTime() + 7 * 3600 * 1000).getUTCDay();
            const isWeekend = vnDay === 0 || vnDay === 6;

            let change24h = 0;
            let yesterdayPrice = price;

            if (!isWeekend) {
              change24h =
                matched.productNavChange?.navToPrevious !== undefined
                  ? Number(matched.productNavChange.navToPrevious.toFixed(2))
                  : 0;
              yesterdayPrice = rawPreviousNav;
            }

            // Build multi-year historyMap from Fmarket get-nav-history API
            const historyMap: Record<string, number> = {};
            if (matched.id) {
              try {
                const navHistRes = await fetchWithTimeout(
                  "https://api.fmarket.vn/res/product/get-nav-history",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      productId: matched.id,
                      fromDate: `${now.getFullYear() - 3}0101`,
                      toDate: `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
                        now.getDate()
                      ).padStart(2, "0")}`,
                    }),
                    next: { revalidate: 600 },
                  }
                );

                if (navHistRes.ok) {
                  const navHistJson = await navHistRes.json();
                  const navItems: any[] = navHistJson?.data || [];
                  navItems.forEach((item) => {
                    if (item.navDate && item.nav) {
                      historyMap[item.navDate] = Math.round(item.nav);
                    }
                  });
                }
              } catch (histErr) {
                console.warn("Fmarket get-nav-history warning:", histErr);
              }
            }

            // Fallback for current dates if missing in historyMap
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
              now.getDate()
            ).padStart(2, "0")}`;

            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(yesterday.getDate()).padStart(2, "0")}`;

            if (isWeekend) {
              historyMap[todayKey] = price;
              historyMap[yesterdayKey] = price;
            } else {
              historyMap[todayKey] = price;
              if (!historyMap[yesterdayKey]) {
                historyMap[yesterdayKey] = rawPreviousNav;
              }
            }

            // Forward fill missing calendar days (weekends, holidays) in historyMap
            const sortedDates = Object.keys(historyMap).sort();
            if (sortedDates.length > 0) {
              const startDate = new Date(sortedDates[0]);
              const endDate = new Date(now);

              let curr = new Date(startDate);
              let lastKnownNav = historyMap[sortedDates[0]];

              while (curr <= endDate) {
                const dateKey = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(
                  2,
                  "0"
                )}-${String(curr.getDate()).padStart(2, "0")}`;

                if (historyMap[dateKey]) {
                  lastKnownNav = historyMap[dateKey];
                } else {
                  historyMap[dateKey] = lastKnownNav;
                }
                curr.setDate(curr.getDate() + 1);
              }
            }

            priceCache[cleanSymbol] = { price, change24h, yesterdayPrice, historyMap, timestamp: Date.now() };
            return { price, change24h, yesterdayPrice, historyMap };
          }
      }
    } catch {
      // Ignore fmarket fetch errors
    }
  } catch (err) {
    console.warn(`Could not fetch live price for ${symbol}, using base price fallback.`, err);
  }

  return null;
}

export async function searchMarketTickers(query: string): Promise<MarketTicker[]> {
  const clean = query.trim().toUpperCase();

  // Load base tickers
  let tickers = [...BASE_POPULAR_TICKERS];

  if (clean) {
    tickers = tickers.filter((t) => t.symbol.includes(clean) || t.name.toUpperCase().includes(clean));
  }

  // Fetch live prices and 24h change for matched top tickers in parallel
  const updatedTickers = await Promise.all(
    tickers.slice(0, 10).map(async (t) => {
      const liveData = await fetchLivePriceFromPublicAPIs(t.symbol);
      if (liveData && liveData.price > 0) {
        return {
          ...t,
          currentPrice: liveData.price,
          change24h: liveData.change24h !== undefined ? liveData.change24h : t.change24h,
        };
      }
      return t;
    })
  );

  if (updatedTickers.length > 0) return updatedTickers;

  // Fallback for custom search ticker
  const customLiveData = await fetchLivePriceFromPublicAPIs(clean);
  const matchedBase = BASE_POPULAR_TICKERS.find((t) => t.symbol === clean);
  return [
    {
      symbol: clean,
      name: matchedBase?.name || `Mã chứng khoán / Tài sản ${clean}`,
      assetClass: matchedBase?.assetClass || "STOCKS",
      currentPrice: customLiveData?.price || matchedBase?.currentPrice || 10000,
      currency: "VND",
      change24h: customLiveData?.change24h !== undefined ? customLiveData.change24h : matchedBase?.change24h ?? 0.85,
      defaultUnit: matchedBase?.defaultUnit || "Cổ phiếu",
    },
  ];
}

export async function fetchClosingPriceForSymbol(symbol: string, currentHoldingPrice?: number): Promise<number> {
  const clean = symbol.toUpperCase().trim();
  const liveData = await fetchLivePriceFromPublicAPIs(clean);
  if (liveData && liveData.price > 0) return liveData.price;

  if (currentHoldingPrice && currentHoldingPrice > 0) {
    return currentHoldingPrice;
  }

  const matched = BASE_POPULAR_TICKERS.find((t) => t.symbol === clean);
  if (matched) return matched.currentPrice;

  return 10000;
}

export async function fetchClosingPriceDetailsForSymbol(
  symbol: string,
  currentHoldingPrice?: number
): Promise<{ price: number; change24h: number; yesterdayPrice: number; historyMap?: Record<string, number> }> {
  const clean = symbol.toUpperCase().trim();
  const liveData = await fetchLivePriceFromPublicAPIs(clean);
  const matched = BASE_POPULAR_TICKERS.find((t) => t.symbol === clean);

  const price =
    liveData && liveData.price > 0
      ? liveData.price
      : currentHoldingPrice && currentHoldingPrice > 0
      ? currentHoldingPrice
      : matched?.currentPrice || 10000;

  let yesterdayPrice =
    liveData?.yesterdayPrice && liveData.yesterdayPrice > 0
      ? liveData.yesterdayPrice
      : price;

  if (liveData?.historyMap) {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yyyy = yesterdayDate.getFullYear();
    const mm = String(yesterdayDate.getMonth() + 1).padStart(2, "0");
    const dd = String(yesterdayDate.getDate()).padStart(2, "0");
    const yesterdayKey = `${yyyy}-${mm}-${dd}`;

    if (liveData.historyMap[yesterdayKey] !== undefined && liveData.historyMap[yesterdayKey] > 0) {
      yesterdayPrice = liveData.historyMap[yesterdayKey];
    }
  }

  const change24h =
    yesterdayPrice > 0 && price !== yesterdayPrice
      ? Number((((price - yesterdayPrice) / yesterdayPrice) * 100).toFixed(2))
      : liveData?.change24h !== undefined
      ? liveData.change24h
      : 0;

  return { price, change24h, yesterdayPrice, historyMap: liveData?.historyMap };
}

