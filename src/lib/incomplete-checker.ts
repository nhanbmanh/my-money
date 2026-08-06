export type CheckableCashFlowItem = {
  source?: any;
  sourceId?: string | null;
  primaryCategory?: any;
  primaryCategoryId?: string | null;
  secondaryCategories?: any[];
  datetime?: string | Date | null;
};

export function checkIsIncomplete(item: CheckableCashFlowItem): boolean {
  const missingSource = !item.sourceId && !item.source;
  const missingPrimary = !item.primaryCategoryId && !item.primaryCategory;
  const missingSecondary =
    !item.secondaryCategories || item.secondaryCategories.length === 0;
  const missingDatetime = !item.datetime;

  return missingSource || missingPrimary || missingSecondary || missingDatetime;
}

export function getMissingFields(item: CheckableCashFlowItem): string[] {
  const missing: string[] = [];
  if (!item.sourceId && !item.source) missing.push("Nguồn tiền");
  if (!item.primaryCategoryId && !item.primaryCategory) missing.push("Nhãn chính");
  if (!item.secondaryCategories || item.secondaryCategories.length === 0)
    missing.push("Nhãn phụ");
  if (!item.datetime) missing.push("Thời gian");
  return missing;
}
