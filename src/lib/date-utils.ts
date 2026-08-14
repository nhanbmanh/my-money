/**
 * Centralized Utility Functions for Vietnam Timezone (Asia/Ho_Chi_Minh, GMT+7)
 * Ensures all background tasks, crons, email reports, wealth snapshots, and calendar
 * operations strictly adhere to Vietnam Time (GMT+7).
 */

/**
 * Returns current Date in Vietnam Timezone context (Asia/Ho_Chi_Minh).
 */
export function getNowVN(): Date {
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  return new Date(dateStr);
}

/**
 * Returns YYYY-MM-DD formatted date string in Vietnam Timezone.
 */
export function getTodayStrVN(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

/**
 * Returns start of today (00:00:00.000) in Vietnam Timezone.
 */
export function getStartOfTodayVN(): Date {
  const dateStr = getTodayStrVN();
  return new Date(`${dateStr}T00:00:00.000+07:00`);
}

/**
 * Returns end of today (23:59:59.999) in Vietnam Timezone.
 */
export function getEndOfTodayVN(): Date {
  const dateStr = getTodayStrVN();
  return new Date(`${dateStr}T23:59:59.999+07:00`);
}

/**
 * Returns start of day (00:00:00.000) for a given YYYY-MM-DD string or Date in Vietnam Timezone.
 */
export function getStartOfDayVN(d: Date | string): Date {
  let dateStr: string;
  if (typeof d === "string") {
    dateStr = new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  } else {
    dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  }
  return new Date(`${dateStr}T00:00:00.000+07:00`);
}

/**
 * Returns end of day (23:59:59.999) for a given YYYY-MM-DD string or Date in Vietnam Timezone.
 */
export function getEndOfDayVN(d: Date | string): Date {
  let dateStr: string;
  if (typeof d === "string") {
    dateStr = new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  } else {
    dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  }
  return new Date(`${dateStr}T23:59:59.999+07:00`);
}

/**
 * Calculates exact milliseconds remaining until next 00:00:00 midnight in Vietnam Timezone.
 */
export function getMsUntilMidnightVN(): number {
  const now = new Date();
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = tomorrowDate.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const midnightVN = new Date(`${tomorrowDateStr}T00:00:00.000+07:00`);
  return Math.max(1000, midnightVN.getTime() - now.getTime());
}
