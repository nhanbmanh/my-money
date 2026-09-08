import { fetchClosingPriceDetailsForSymbol } from "../src/lib/market-ticker-service";

async function main() {
  const details = await fetchClosingPriceDetailsForSymbol("DCDS", 101046);
  console.log("DCDS Details:", details);
}

main().catch(console.error);
