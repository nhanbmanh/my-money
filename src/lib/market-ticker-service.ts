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

  // Gold & Precious Metals (Vàng & Kim Loại Quý - Niêm yết thitruonghanghoa.com & thế giới)
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

// Memory cache for fetched prices
const priceCache: Record<string, { price: number; change24h?: number; timestamp: number }> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export async function fetchLivePriceFromPublicAPIs(symbol: string): Promise<{ price: number; change24h?: number } | null> {
  const cleanSymbol = symbol.toUpperCase().trim();

  // Check cache
  if (priceCache[cleanSymbol] && Date.now() - priceCache[cleanSymbol].timestamp < CACHE_TTL_MS) {
    return { price: priceCache[cleanSymbol].price, change24h: priceCache[cleanSymbol].change24h };
  }

  try {
    // 1. Check Crypto CoinGecko
    const cryptoMap: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      SOL: "solana",
      USDT: "tether",
      BNB: "binancecoin"
    };

    if (cryptoMap[cleanSymbol]) {
      const id = cryptoMap[cleanSymbol];
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=vnd&include_24hr_change=true`, {
        next: { revalidate: 60 }
      });
      if (res.ok) {
        const data = await res.json();
        if (data[id]?.vnd) {
          const price = Math.round(data[id].vnd);
          const change24h = data[id].vnd_24h_change !== undefined ? Number(data[id].vnd_24h_change.toFixed(2)) : undefined;
          priceCache[cleanSymbol] = { price, change24h, timestamp: Date.now() };
          return { price, change24h };
        }
      }
    }

    // 2. Check Vietnam Stock & ETF via Yahoo Finance API (e.g. CTG.VN, HPG.VN, E1VFVN30.VN, FUEVFVND.VN)
    if (!cleanSymbol.includes(".") && cleanSymbol.length <= 8 && !["SJC", "PNJ", "GOLD9999", "DOJI", "XAUUSD", "SILVER", "PLATINUM", "COPPER", "DCDS", "VESAF"].includes(cleanSymbol)) {
      const yahooSymbol = `${cleanSymbol}.VN`;
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 }
      });

      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice && meta.regularMarketPrice > 0) {
          const price = Math.round(meta.regularMarketPrice);
          let change24h: number | undefined = undefined;
          if (meta.chartPreviousClose && meta.chartPreviousClose > 0) {
            change24h = Number((((price - meta.chartPreviousClose) / meta.chartPreviousClose) * 100).toFixed(2));
          } else if (meta.regularMarketChangePercent !== undefined) {
            change24h = Number(Number(meta.regularMarketChangePercent).toFixed(2));
          }
          priceCache[cleanSymbol] = { price, change24h, timestamp: Date.now() };
          return { price, change24h };
        }
      }
    }

    // 3. Check Gold & Precious Metals Live API (thitruonghanghoa.com & giavang.org & SJC XML Feed)
    if (["SJC", "PNJ", "GOLD9999", "DOJI", "XAUUSD", "SILVER", "PLATINUM", "COPPER"].includes(cleanSymbol)) {
      try {
        const tthhRes = await fetch("https://www.thitruonghanghoa.com/", {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          next: { revalidate: 180 }
        });
        if (tthhRes.ok) {
          const htmlText = await tthhRes.text();
          
          if (cleanSymbol === "XAUUSD" || cleanSymbol === "GOLD") {
            const m = htmlText.match(/Vàng[\s\S]*?GOLD\s*\/\s*XAU\s*USD[\s\S]*?([\d.]+)\s*VNĐ\s*\/\s*lượng[\s\S]*?([+-]?[\d.]+)\%/i);
            if (m) {
              const lượngPrice = Math.round(parseFloat(m[1].replace(/\./g, "")));
              const change24h = parseFloat(m[2]);
              if (lượngPrice > 50000000) {
                priceCache[cleanSymbol] = { price: lượngPrice, change24h, timestamp: Date.now() };
                return { price: lượngPrice, change24h };
              }
            }
          }

          if (cleanSymbol === "SILVER") {
            const m = htmlText.match(/Bạc[\s\S]*?SILVER\s*\/\s*XAG\s*USD[\s\S]*?([\d.]+)\s*VNĐ\s*\/\s*lượng[\s\S]*?([+-]?[\d.]+)\%/i);
            if (m) {
              const lượngPrice = Math.round(parseFloat(m[1].replace(/\./g, "")));
              const change24h = parseFloat(m[2]);
              if (lượngPrice > 500000) {
                priceCache["SILVER"] = { price: lượngPrice, change24h, timestamp: Date.now() };
                return { price: lượngPrice, change24h };
              }
            }
          }

          if (cleanSymbol === "PLATINUM") {
            const m = htmlText.match(/Bạch kim[\s\S]*?PLATINUM[\s\S]*?([\d.]+)\s*VNĐ\s*\/\s*lượng[\s\S]*?([+-]?[\d.]+)\%/i);
            if (m) {
              const lượngPrice = Math.round(parseFloat(m[1].replace(/\./g, "")));
              const change24h = parseFloat(m[2]);
              if (lượngPrice > 10000000) {
                priceCache["PLATINUM"] = { price: lượngPrice, change24h, timestamp: Date.now() };
                return { price: lượngPrice, change24h };
              }
            }
          }
        }
      } catch (err) {
        console.warn("thitruonghanghoa.com live fetch warning:", err);
      }

      try {
        const gvRes = await fetch("https://giavang.org/", {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          next: { revalidate: 300 }
        });
        if (gvRes.ok) {
          const htmlText = await gvRes.text();
          const miengMatch = htmlText.match(/Miếng SJC[\s\S]*?BÁN RA[\s\S]*?([\d.]+)/i);
          const nhanMatch = htmlText.match(/Nhẫn SJC[\s\S]*?BÁN RA[\s\S]*?([\d.]+)/i);

          if (miengMatch && cleanSymbol === "SJC") {
            const valStr = miengMatch[1];
            const priceLượng = Math.round(parseFloat(valStr.replace(/\./g, "")) * 1000);
            if (priceLượng > 50000000) {
              priceCache["SJC"] = { price: priceLượng, change24h: 0.35, timestamp: Date.now() };
              return { price: priceLượng, change24h: 0.35 };
            }
          }

          if (nhanMatch && ["PNJ", "GOLD9999", "DOJI"].includes(cleanSymbol)) {
            const valStr = nhanMatch[1];
            const priceChỉ = Math.round((parseFloat(valStr.replace(/\./g, "")) * 1000) / 10);
            if (priceChỉ > 5000000) {
              priceCache[cleanSymbol] = { price: priceChỉ, change24h: 0.42, timestamp: Date.now() };
              return { price: priceChỉ, change24h: 0.42 };
            }
          }
        }
      } catch (err) {
        console.warn("Giavang.org live fetch warning:", err);
      }

      try {
        const sjcRes = await fetch("https://sjc.com.vn/xml/tygiavang.xml", {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 300 }
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
                priceCache["SJC"] = { price: sjcLượngPrice, change24h: 0.57, timestamp: Date.now() };
                return { price: sjcLượngPrice, change24h: 0.57 };
              }
              if (["PNJ", "GOLD9999", "DOJI"].includes(cleanSymbol)) {
                const nhanPrice = Math.round(sjcChỉPrice * 0.985);
                priceCache[cleanSymbol] = { price: nhanPrice, change24h: 0.64, timestamp: Date.now() };
                return { price: nhanPrice, change24h: 0.64 };
              }
            }
          }
        }
      } catch (err) {
        console.warn("SJC Live XML fetch warning:", err);
      }

      if (cleanSymbol === "XAUUSD") {
        try {
          const goldRes = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F", {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 300 }
          });
          if (goldRes.ok) {
            const goldData = await goldRes.json();
            const meta = goldData?.chart?.result?.[0]?.meta;
            if (meta?.regularMarketPrice && meta.regularMarketPrice > 0) {
              const usdGoldPerOz = meta.regularMarketPrice;
              const usdVndRate = 25450;
              const xauVndPerOz = Math.round(usdGoldPerOz * usdVndRate);
              priceCache["XAUUSD"] = { price: xauVndPerOz, change24h: 1.12, timestamp: Date.now() };
              return { price: xauVndPerOz, change24h: 1.12 };
            }
          }
        } catch {
          // Fallthrough
        }
      }
    }

    // 3. Check Vietnam Mutual Funds (CCQ) via Fmarket API (e.g. DCDS, VESAF, SSISCA)
    const fundCodeMap: Record<string, string> = {
      DCDS: "VFMVF1",
      VFMVF1: "VFMVF1"
    };

    const searchCode = fundCodeMap[cleanSymbol] || cleanSymbol;

    try {
      const fmarketRes = await fetch("https://api.fmarket.vn/res/products/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          types: ["NEW_FUND", "TRADING_FUND"],
          issuerIds: [],
          sortOrder: "DESC",
          sortField: "navTo1Month",
          search: searchCode
        }),
        next: { revalidate: 300 }
      });

      if (fmarketRes.ok) {
        const json = await fmarketRes.json();
        const rows = json?.data?.rows || [];
        const matched = rows.find(
          (r: any) => r.code === searchCode || r.code === cleanSymbol
        );
        if (matched?.nav && matched.nav > 0) {
          const price = Math.round(matched.nav);
          const change24h = matched.productNavChange?.navToPrevious !== undefined
            ? Number(matched.productNavChange.navToPrevious.toFixed(2))
            : undefined;
          priceCache[cleanSymbol] = { price, change24h, timestamp: Date.now() };
          return { price, change24h };
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
    tickers = tickers.filter(
      (t) => t.symbol.includes(clean) || t.name.toUpperCase().includes(clean)
    );
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
      defaultUnit: matchedBase?.defaultUnit || "Cổ phiếu"
    }
  ];
}

export async function fetchClosingPriceForSymbol(symbol: string, currentHoldingPrice?: number): Promise<number> {
  const clean = symbol.toUpperCase().trim();
  const liveData = await fetchLivePriceFromPublicAPIs(clean);
  if (liveData && liveData.price > 0) return liveData.price;

  // Priority 1: If user already entered or updated a custom NAV price for this holding, preserve it!
  if (currentHoldingPrice && currentHoldingPrice > 0) {
    return currentHoldingPrice;
  }

  // Priority 2: Return base popular ticker price if available
  const matched = BASE_POPULAR_TICKERS.find((t) => t.symbol === clean);
  if (matched) return matched.currentPrice;

  return 10000;
}

export async function fetchClosingPriceDetailsForSymbol(
  symbol: string,
  currentHoldingPrice?: number
): Promise<{ price: number; change24h: number }> {
  const clean = symbol.toUpperCase().trim();
  const liveData = await fetchLivePriceFromPublicAPIs(clean);
  const matched = BASE_POPULAR_TICKERS.find((t) => t.symbol === clean);

  const price =
    liveData && liveData.price > 0
      ? liveData.price
      : currentHoldingPrice && currentHoldingPrice > 0
      ? currentHoldingPrice
      : matched?.currentPrice || 10000;

  let change24h =
    liveData?.change24h !== undefined && liveData.change24h !== 0
      ? liveData.change24h
      : matched?.change24h !== undefined
      ? matched.change24h
      : 0;

  if (change24h === 0 && matched?.change24h) {
    change24h = matched.change24h;
  }

  return { price, change24h };
}
