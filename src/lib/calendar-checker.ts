import { startOfDay, subDays, addDays, isSameDay, isBefore, isAfter, parseISO, differenceInCalendarDays } from "date-fns";
import { getStartOfTodayVN, getStartOfDayVN } from "@/lib/date-utils";

export interface CalendarNotificationItem {
  id: string;
  title: string;
  content?: string | null;
  date: string; // ISO string
  status: number; // 0: Todo, 1: In Progress
  tagType: "UPCOMING" | "ONGOING" | "OVERDUE";
  tagLabelVi: string;
  tagLabelEn: string;
}

export async function fetchCalendarNotifications(): Promise<CalendarNotificationItem[]> {
  try {
    const today = getStartOfTodayVN();
    const startDate = subDays(today, 2); // 2 days ago
    const endDate = addDays(today, 2);   // 2 days ahead

    const res = await fetch(
      `/api/calendar-plans?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
    if (!res.ok) return [];

    const plans = await res.json();
    const notifications: CalendarNotificationItem[] = [];

    for (const plan of plans) {
      // Only Todo (0) and In Progress (1)
      if (plan.status !== 0 && plan.status !== 1) continue;

      const planDate = getStartOfDayVN(parseISO(plan.date));

      // Must be within [today - 2 days, today + 2 days]
      if (isBefore(planDate, startDate) || isAfter(planDate, endDate)) continue;

      let tagType: "UPCOMING" | "ONGOING" | "OVERDUE";
      let tagLabelVi: string;
      let tagLabelEn: string;

      const diffDays = Math.abs(differenceInCalendarDays(planDate, today));

      if (isSameDay(planDate, today)) {
        tagType = "ONGOING";
        tagLabelVi = "Đang diễn ra";
        tagLabelEn = "Ongoing";
      } else if (isBefore(planDate, today)) {
        tagType = "OVERDUE";
        tagLabelVi = `Quá hạn ${diffDays} ngày`;
        tagLabelEn = `Overdue by ${diffDays} day${diffDays > 1 ? "s" : ""}`;
      } else {
        tagType = "UPCOMING";
        if (diffDays === 1) {
          tagLabelVi = "Diễn ra trong ngày mai";
          tagLabelEn = "Occurring tomorrow";
        } else if (diffDays === 2) {
          tagLabelVi = "Diễn ra trong ngày kia";
          tagLabelEn = "Occurring day after tomorrow";
        } else {
          tagLabelVi = `Diễn ra trong ${diffDays} ngày tới`;
          tagLabelEn = `Occurring in ${diffDays} days`;
        }
      }

      notifications.push({
        id: plan.id,
        title: plan.title,
        content: plan.content,
        date: plan.date,
        status: plan.status,
        tagType,
        tagLabelVi,
        tagLabelEn,
      });
    }

    // Sort: Overdue first, then Ongoing, then Upcoming
    const priorityMap: Record<string, number> = { OVERDUE: 0, ONGOING: 1, UPCOMING: 2 };
    notifications.sort((a, b) => priorityMap[a.tagType] - priorityMap[b.tagType]);

    return notifications;
  } catch (err) {
    console.error("Failed to fetch calendar notifications:", err);
    return [];
  }
}
