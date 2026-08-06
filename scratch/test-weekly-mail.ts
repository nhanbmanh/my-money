import { buildAndSendWeeklyReportEmail } from "../src/lib/weekly-report-email";
import { subWeeks } from "date-fns";

async function main() {
  console.log("Triggering weekly report email test for nhanbmanh@gmail.com...");
  const result = await buildAndSendWeeklyReportEmail({
    userEmail: "nhanbmanh@gmail.com",
    targetDate: subWeeks(new Date(), 1),
  });

  console.log("Result:", {
    success: result.success,
    weekRangeStr: result.weekRangeStr,
    totalIncome: result.totalIncome,
    totalExpense: result.totalExpense,
    netBalance: result.netBalance,
    top3Count: result.top3Count,
    categoriesCount: result.categoriesCount,
  });
}

main().catch((err) => {
  console.error("Test failed:", err);
});
