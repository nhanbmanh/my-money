import { startOfMonth, endOfMonth } from "date-fns";

export type BudgetAlertItem = {
  id: string;
  categoryName: string;
  isSecondary: boolean;
  budgetLimit: number;
  spent: number;
  percent: number;
  type: "OVER" | "WARNING";
  message: string;
};

export const BUDGET_STORAGE_KEY = "my_money_category_budgets";

export function getStoredBudgets(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function fetchCurrentMonthAlerts(): Promise<BudgetAlertItem[]> {
  if (typeof window === "undefined") return [];

  const storedBudgets = getStoredBudgets();

  const now = new Date();
  const dateFrom = startOfMonth(now).toISOString();
  const dateTo = endOfMonth(now).toISOString();

  try {
    const [resCashflow, resPrimary, resSecondary] = await Promise.all([
      fetch(`/api/cashflow?page=1&limit=all&dateFrom=${dateFrom}&dateTo=${dateTo}`),
      fetch("/api/category"),
      fetch("/api/secondary-category"),
    ]);

    const cashflowData = resCashflow.ok ? await resCashflow.json() : { items: [] };
    const primaryCats = resPrimary.ok ? await resPrimary.json() : [];
    const secondaryCats = resSecondary.ok ? await resSecondary.json() : [];

    const items: any[] = cashflowData.items || [];

    const expenseByPrimaryMap = new Map<string, number>();
    const expenseBySecondaryMap = new Map<string, number>();

    items.forEach((item) => {
      if (item.cashType === "Expense") {
        const amt = Math.abs(item.amountOfMoney);

        if (item.primaryCategory?.id) {
          const id = item.primaryCategory.id;
          expenseByPrimaryMap.set(id, (expenseByPrimaryMap.get(id) || 0) + amt);
        }

        if (item.secondaryCategories && item.secondaryCategories.length > 0) {
          item.secondaryCategories.forEach((sc: any) => {
            if (sc.secondaryCategory?.id) {
              const id = sc.secondaryCategory.id;
              expenseBySecondaryMap.set(id, (expenseBySecondaryMap.get(id) || 0) + amt);
            }
          });
        }
      }
    });

    const alerts: BudgetAlertItem[] = [];

    // Check primary categories
    primaryCats.forEach((cat: any) => {
      const budgetLimit =
        cat.budgetLimit !== undefined && cat.budgetLimit !== null && cat.budgetLimit > 0
          ? cat.budgetLimit
          : storedBudgets[cat.id] || 0;

      if (budgetLimit > 0) {
        const spent = expenseByPrimaryMap.get(cat.id) || 0;
        const percent = (spent / budgetLimit) * 100;

        if (percent >= 80) {
          const isOver = percent >= 100;
          alerts.push({
            id: cat.id,
            categoryName: cat.categoryName,
            isSecondary: false,
            budgetLimit,
            spent,
            percent,
            type: isOver ? "OVER" : "WARNING",
            message: isOver
              ? `Nhãn chính '${cat.categoryName}' đã VƯỢT HẠN MỨC (${percent.toFixed(0)}%)`
              : `Nhãn chính '${cat.categoryName}' đã CHẠM NGƯỠNG (${percent.toFixed(0)}%)`,
          });
        }
      }
    });

    // Check secondary categories
    secondaryCats.forEach((cat: any) => {
      const budgetLimit =
        cat.budgetLimit !== undefined && cat.budgetLimit !== null && cat.budgetLimit > 0
          ? cat.budgetLimit
          : storedBudgets[cat.id] || 0;

      if (budgetLimit > 0) {
        const spent = expenseBySecondaryMap.get(cat.id) || 0;
        const percent = (spent / budgetLimit) * 100;

        if (percent >= 80) {
          const isOver = percent >= 100;
          alerts.push({
            id: cat.id,
            categoryName: cat.categoryName,
            isSecondary: true,
            budgetLimit,
            spent,
            percent,
            type: isOver ? "OVER" : "WARNING",
            message: isOver
              ? `Nhãn phụ '${cat.categoryName}' đã VƯỢT HẠN MỨC (${percent.toFixed(0)}%)`
              : `Nhãn phụ '${cat.categoryName}' đã CHẠM NGƯỠNG (${percent.toFixed(0)}%)`,
          });
        }
      }
    });

    return alerts.sort((a, b) => b.percent - a.percent);
  } catch (error) {
    console.error("Failed to check current month budget alerts:", error);
    return [];
  }
}
