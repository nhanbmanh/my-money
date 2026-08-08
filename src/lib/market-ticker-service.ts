export interface MarketTicker {
  symbol: string;
  name: string;
  assetClass: "STOCKS" | "CRYPTO" | "GOLD" | "CCQ" | "BOND" | "OTHER";
  currentPrice: number; // In VND
  currency: string;
  logoUrl?: string;
  change24h?: number;
}

export const BASE_POPULAR_TICKERS: MarketTicker[] = [
  // Vietnam Stocks
  { symbol: "HPG", name: "Tập đoàn Hòa Phát", assetClass: "STOCKS", currentPrice: 22000, currency: "VND" },
  { symbol: "VNM", name: "Vinamilk", assetClass: "STOCKS", currentPrice: 65500, currency: "VND" },
  { symbol: "FPT", name: "Tập đoàn FPT", assetClass: "STOCKS", currentPrice: 132000, currency: "VND" },
  { symbol: "MWG", name: "Thế Giới Di Động", assetClass: "STOCKS", currentPrice: 67800, currency: "VND" },
  { symbol: "TCB", name: "Ngân hàng Techcombank", assetClass: "STOCKS", currentPrice: 23800, currency: "VND" },
  { symbol: "VHM", name: "Vinhomes", assetClass: "STOCKS", currentPrice: 42500, currency: "VND" },
  { symbol: "SSI", name: "Chứng khoán SSI", assetClass: "STOCKS", currentPrice: 26500, currency: "VND" },
  { symbol: "MBB", name: "Ngân hàng MB", assetClass: "STOCKS", currentPrice: 24200, currency: "VND" },

  // Crypto (in VND)
  { symbol: "BTC", name: "Bitcoin", assetClass: "CRYPTO", currentPrice: 1702500000, currency: "VND" },
  { symbol: "ETH", name: "Ethereum", assetClass: "CRYPTO", currentPrice: 50180000, currency: "VND" },
  { symbol: "SOL", name: "Solana", assetClass: "CRYPTO", currentPrice: 1957000, currency: "VND" },
  { symbol: "USDT", name: "Tether USD", assetClass: "CRYPTO", currentPrice: 26190, currency: "VND" },
  { symbol: "BNB", name: "Binance Coin", assetClass: "CRYPTO", currentPrice: 15570000, currency: "VND" },

  // Gold
  { symbol: "SJC", name: "Vàng Miếng SJC (Lượng)", assetClass: "GOLD", currentPrice: 85500000, currency: "VND" },
  { symbol: "PNJ", name: "Vàng Nữ Trang PNJ (Chỉ)", assetClass: "GOLD", currentPrice: 7750000, currency: "VND" },
  { symbol: "GOLD9999", name: "Vàng Nhẫn 9999 (Chỉ)", assetClass: "GOLD", currentPrice: 7700000, currency: "VND" },

  // Mutual Funds / CCQ (NAV thực tế)
  { symbol: "E1VFVN30", name: "ETF VFMVN30", assetClass: "CCQ", currentPrice: 24200, currency: "VND" },
  { symbol: "FUEVFVND", name: "ETF VNDiamond", assetClass: "CCQ", currentPrice: 32800, currency: "VND" },
  { symbol: "DCDS", name: "Quỹ Đầu tư Năng động Dragon Capital (NAV/CCQ)", assetClass: "CCQ", currentPrice: 94800, currency: "VND" },
  { symbol: "VESAF", name: "Quỹ VinaCapital VESAF (NAV/CCQ)", assetClass: "CCQ", currentPrice: 35200, currency: "VND" }
];

// Memory cache for fetched prices
const priceCache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export async function fetchLivePriceFromPublicAPIs(symbol: string): Promise<number | null> {
  const cleanSymbol = symbol.toUpperCase().trim();

  // Check cache
  if (priceCache[cleanSymbol] && Date.now() - priceCache[cleanSymbol].timestamp < CACHE_TTL_MS) {
    return priceCache[cleanSymbol].price;
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
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=vnd`, {
        next: { revalidate: 60 }
      });
      if (res.ok) {
        const data = await res.json();
        if (data[id]?.vnd) {
          const price = Math.round(data[id].vnd);
          priceCache[cleanSymbol] = { price, timestamp: Date.now() };
          return price;
        }
      }
    }

    // 2. Check Vietnam Stock & ETF via Yahoo Finance API (e.g. HPG.VN, E1VFVN30.VN, FUEVFVND.VN)
    if (!cleanSymbol.includes(".") && cleanSymbol.length <= 8 && !["SJC", "PNJ", "GOLD9999", "DCDS", "VESAF"].includes(cleanSymbol)) {
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
          priceCache[cleanSymbol] = { price, timestamp: Date.now() };
          return price;
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
          priceCache[cleanSymbol] = { price, timestamp: Date.now() };
          return price;
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

  // Fetch live prices for matched top tickers in parallel
  const updatedTickers = await Promise.all(
    tickers.slice(0, 10).map(async (t) => {
      const livePrice = await fetchLivePriceFromPublicAPIs(t.symbol);
      if (livePrice && livePrice > 0) {
        return { ...t, currentPrice: livePrice };
      }
      return t;
    })
  );

  if (updatedTickers.length > 0) return updatedTickers;

  // Fallback for custom search ticker
  const customLivePrice = await fetchLivePriceFromPublicAPIs(clean);
  return [
    {
      symbol: clean,
      name: `Mã chứng khoán / Tài sản ${clean}`,
      assetClass: "STOCKS",
      currentPrice: customLivePrice || 10000,
      currency: "VND"
    }
  ];
}

export async function fetchClosingPriceForSymbol(symbol: string, currentHoldingPrice?: number): Promise<number> {
  const clean = symbol.toUpperCase().trim();
  const livePrice = await fetchLivePriceFromPublicAPIs(clean);
  if (livePrice && livePrice > 0) return livePrice;

  // Priority 1: If user already entered or updated a custom NAV price for this holding, preserve it!
  if (currentHoldingPrice && currentHoldingPrice > 0) {
    return currentHoldingPrice;
  }

  // Priority 2: Return base popular ticker price if available
  const matched = BASE_POPULAR_TICKERS.find((t) => t.symbol === clean);
  if (matched) return matched.currentPrice;

  return 10000;
}
