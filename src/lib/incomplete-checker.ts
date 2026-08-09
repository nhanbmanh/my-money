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

export function getMissingFields(item: CheckableCashFlowItem, lang: "vi" | "en" = "vi"): string[] {
  const missing: string[] = [];
  if (!item.sourceId && !item.source) missing.push(lang === "vi" ? "Nguồn tiền" : "Payment Source");
  if (!item.primaryCategoryId && !item.primaryCategory) missing.push(lang === "vi" ? "Nhãn chính" : "Primary Category");
  if (!item.secondaryCategories || item.secondaryCategories.length === 0)
    missing.push(lang === "vi" ? "Nhãn phụ" : "Secondary Category");
  if (!item.datetime) missing.push(lang === "vi" ? "Thời gian" : "Datetime");
  return missing;
}
