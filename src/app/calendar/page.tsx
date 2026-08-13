"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalendarPlanModal,
  CalendarPlanItem,
  PLAN_STATUS_CONFIG,
} from "@/components/calendar-plan-modal";
import { CalendarPlanDetailModal } from "@/components/calendar-plan-detail-modal";
import { formatLunarDate } from "@/lib/lunar-calendar";
import { getSpecialDaysForDate, SpecialDayInfo } from "@/lib/vietnam-holidays";
import { SpecialDayModal } from "@/components/special-day-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Loader2,
  ListFilter,
  CheckCircle2,
  Star,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLanguage } from "@/components/language-provider";

export default function CalendarPage() {
  const { language } = useLanguage();
  const dateLocale = language === "vi" ? vi : enUS;

  // Selected Reference Date for Calendar Navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Track screen size for responsive navigation (mobile week vs desktop month)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [plans, setPlans] = useState<CalendarPlanItem[]>([]);
  const [userBod, setUserBod] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<CalendarPlanItem | null>(null);
  const [targetDateForCreate, setTargetDateForCreate] = useState<Date | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<CalendarPlanItem | null>(null);

  // Special Day Modal State
  const [specialDayModalOpen, setSpecialDayModalOpen] = useState(false);
  const [selectedSpecialDayDate, setSelectedSpecialDayDate] = useState<Date | null>(null);
  const [selectedSpecialDays, setSelectedSpecialDays] = useState<SpecialDayInfo[]>([]);

  // Fetch User Profile for Birthday (bod)
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (data?.bod) {
            setUserBod(new Date(data.bod));
          }
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    };
    fetchUserProfile();
  }, []);

  // Fetch plans from API
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch generous date range around current date to cover full month/week view
      const rangeStart = startOfWeek(startOfMonth(subMonths(currentDate, 1)), {
        weekStartsOn: 1,
      });
      const rangeEnd = endOfWeek(endOfMonth(addMonths(currentDate, 1)), {
        weekStartsOn: 1,
      });

      const res = await fetch(
        `/api/calendar-plans?startDate=${rangeStart.toISOString()}&endDate=${rangeEnd.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error("Failed to fetch calendar plans:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Listen for open-calendar-modal event from Header button
  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedPlanForEdit(null);
      setTargetDateForCreate(new Date());
      setCreateModalOpen(true);
    };

    window.addEventListener("open-calendar-modal", handleOpenModal);
    return () => {
      window.removeEventListener("open-calendar-modal", handleOpenModal);
    };
  }, []);

  // Compute Month Days for Desktop
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Compute Week Days for Mobile Vertical View
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (isMobile) {
      setCurrentDate((prev) => subWeeks(prev, 1));
    } else {
      setCurrentDate((prev) => subMonths(prev, 1));
    }
  };

  const handleNext = () => {
    if (isMobile) {
      setCurrentDate((prev) => addWeeks(prev, 1));
    } else {
      setCurrentDate((prev) => addMonths(prev, 1));
    }
  };

  const handlePlanClick = (plan: CalendarPlanItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPlanForDetail(plan);
    setDetailModalOpen(true);
  };

  const handleDayClick = (day: Date) => {
    setSelectedPlanForEdit(null);
    setTargetDateForCreate(day);
    setCreateModalOpen(true);
  };

  const handleStarClick = (day: Date, specials: SpecialDayInfo[], e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSpecialDayDate(day);
    setSelectedSpecialDays(specials);
    setSpecialDayModalOpen(true);
  };

  const weekDayHeaders = language === "vi"
    ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="w-full px-4 py-4 lg:px-6 space-y-6">
      {/* Mobile Navigation Header Bar */}
      <div className="md:hidden flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="h-7 w-7 rounded-lg text-slate-600 dark:text-slate-300"
              title={language === "vi" ? "Tuần trước" : "Previous Week"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-7 w-7 rounded-lg text-slate-600 dark:text-slate-300"
              title={language === "vi" ? "Tuần sau" : "Next Week"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
            {format(currentDate, "'Tuần' w - MM/yyyy", { locale: dateLocale })}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="h-7 px-2 text-[11px] font-bold rounded-xl border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400"
          >
            {language === "vi" ? "Hôm nay" : "Today"}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 px-2 text-[11px] font-bold rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 gap-1"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>{format(currentDate, "dd/MM/yyyy")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[250]"
              align="end"
            >
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(d) => d && setCurrentDate(d)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Desktop Navigation Header Bar */}
      <div className="hidden md:flex items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-xs">
        {/* Left: Month Display Title & Quick Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="h-8 w-8 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 shadow-2xs cursor-pointer"
              title={language === "vi" ? "Tháng trước" : "Previous Month"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 shadow-2xs cursor-pointer"
              title={language === "vi" ? "Tháng sau" : "Next Month"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 capitalize">
            {format(currentDate, "MMMM yyyy", { locale: dateLocale })}
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="h-8 px-2.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer ml-1"
          >
            {language === "vi" ? "Hôm nay" : "Today"}
          </Button>
        </div>

        {/* Right: DatePicker Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-8 px-3 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 gap-2 cursor-pointer"
              title={language === "vi" ? "Chọn ngày để mở lịch" : "Select date to jump"}
            >
              <CalendarIcon className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>{format(currentDate, "dd/MM/yyyy")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[250]"
            align="end"
          >
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(d) => d && setCurrentDate(d)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Status Legends Bar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs font-semibold">
        <span className="text-slate-400 font-extrabold uppercase text-[10px] tracking-wider mr-1">
          {language === "vi" ? "Trạng thái:" : "Status:"}
        </span>
        {Object.entries(PLAN_STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.badgeClass}`} />
            <span className="text-slate-600 dark:text-slate-300 text-[11px]">
              {language === "vi" ? cfg.labelVi : cfg.labelEn}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Section */}
      {loading && plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-xs font-semibold">
            {language === "vi" ? "Đang tải lịch trình..." : "Loading calendar..."}
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW: 7-Column Month Grid */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              {weekDayHeaders.map((header, idx) => (
                <div
                  key={idx}
                  className="py-3 text-center text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  {header}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/80 dark:divide-slate-800/80">
              {monthDays.map((day, idx) => {
                const isCurrentMonthDay = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                const dayPlans = plans.filter((plan) =>
                  isSameDay(parseISO(plan.date), day)
                );
                const specials = getSpecialDaysForDate(day, userBod);

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    className={`min-h-[64px] sm:min-h-[72px] p-2.5 flex flex-col justify-start transition-all duration-200 group cursor-pointer relative ${
                      !isCurrentMonthDay
                        ? "bg-slate-50/40 text-slate-400 dark:bg-slate-950/40 dark:text-slate-500 opacity-60 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 hover:opacity-100 hover:shadow-2xl hover:z-20 hover:scale-[1.01]"
                        : "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 hover:shadow-2xl hover:z-20 hover:scale-[1.01]"
                    }`}
                  >
                    {/* Day Cell Header */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Day Number */}
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-xl text-base sm:text-lg font-black transition-all ${
                            isCurrentDay
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                              : isCurrentMonthDay
                              ? "text-slate-900 dark:text-slate-100 group-hover:text-white dark:group-hover:text-slate-950"
                              : "text-slate-400 dark:text-slate-500 group-hover:text-white dark:group-hover:text-slate-950"
                          }`}
                        >
                          {format(day, "d")}
                        </span>

                        {/* Full Info: Weekday & Solar/Lunar Date */}
                        <div className="flex flex-col min-w-0 leading-tight">
                          <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 group-hover:text-slate-100 dark:group-hover:text-slate-900 truncate">
                            {format(day, "EEEE", { locale: dateLocale })}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-300 dark:group-hover:text-slate-700">
                            <span>{format(day, "dd/MM")}</span>
                            <span>({formatLunarDate(day)})</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Header Actions: Special Star Icon & Plus Action Button */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {specials.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => handleStarClick(day, specials, e)}
                            className="p-1 rounded-lg hover:bg-white/20 dark:hover:bg-slate-300 transition-all cursor-pointer"
                            title={specials.map((s) => (language === "vi" ? s.name : s.nameEn)).join(", ")}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                specials.some((s) => s.iconType === "blue_star")
                                  ? "text-sky-400 fill-sky-400 drop-shadow-md animate-pulse"
                                  : "text-amber-400 fill-amber-400 drop-shadow-md"
                              }`}
                            />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDayClick(day);
                          }}
                          className="p-1 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-white dark:group-hover:text-slate-900 hover:bg-white/20 dark:hover:bg-slate-300 transition-all cursor-pointer"
                          title={language === "vi" ? "Thêm kế hoạch cho ngày này" : "Add plan for this day"}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* List of Plan Items */}
                    <div className="mt-1 space-y-1">
                      {dayPlans.map((plan) => {
                        const cfg =
                          PLAN_STATUS_CONFIG[plan.status] || PLAN_STATUS_CONFIG[0];

                        return (
                          <div
                            key={plan.id}
                            onClick={(e) => handlePlanClick(plan, e)}
                            className={`p-1.5 rounded-xl text-[11px] font-bold border transition-all truncate hover:scale-[1.02] shadow-2xs ${cfg.colorClass}`}
                            title={`${plan.title} (${
                              language === "vi" ? cfg.labelVi : cfg.labelEn
                            })`}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.badgeClass}`}
                              />
                              <span className="truncate">{plan.title}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MOBILE VIEW: Vertical 1-Column Week List */}
          <div className="md:hidden space-y-3">
            {weekDays.map((day, idx) => {
              const isCurrentDay = isToday(day);
              const dayPlans = plans.filter((plan) =>
                isSameDay(parseISO(plan.date), day)
              );
              const specials = getSpecialDaysForDate(day, userBod);

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`p-3.5 rounded-3xl border transition-all cursor-pointer relative ${
                    isCurrentDay
                      ? "bg-indigo-950/30 border-indigo-500/50 shadow-md"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Vertical Day Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-xl text-base font-black ${
                          isCurrentDay
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          {format(day, "EEEE", { locale: dateLocale })}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                          <span>{format(day, "dd/MM")}</span>
                          <span>({formatLunarDate(day)})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {specials.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => handleStarClick(day, specials, e)}
                          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title={specials.map((s) => (language === "vi" ? s.name : s.nameEn)).join(", ")}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              specials.some((s) => s.iconType === "blue_star")
                                ? "text-sky-400 fill-sky-400 drop-shadow-md animate-pulse"
                                : "text-amber-400 fill-amber-400 drop-shadow-md"
                            }`}
                          />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(day);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                        title={language === "vi" ? "Thêm kế hoạch" : "Add plan"}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Day Plans List */}
                  <div className="space-y-1.5">
                    {dayPlans.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1 pl-1">
                        {language === "vi" ? "Không có kế hoạch" : "No plans"}
                      </p>
                    ) : (
                      dayPlans.map((plan) => {
                        const cfg =
                          PLAN_STATUS_CONFIG[plan.status] || PLAN_STATUS_CONFIG[0];
                        return (
                          <div
                            key={plan.id}
                            onClick={(e) => handlePlanClick(plan, e)}
                            className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${cfg.colorClass}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${cfg.badgeClass}`}
                                />
                                <span className="truncate">{plan.title}</span>
                              </div>
                              <span className="text-[10px] opacity-75 shrink-0 font-normal">
                                {language === "vi" ? cfg.labelVi : cfg.labelEn}
                              </span>
                            </div>
                            {plan.content && (
                              <p className="text-[11px] font-normal opacity-80 mt-1 line-clamp-2 pl-4">
                                {plan.content}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Plan Form Modal (Create / Edit) */}
      <CalendarPlanModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        planToEdit={selectedPlanForEdit}
        defaultDate={targetDateForCreate}
        onSuccess={fetchPlans}
      />

      {/* Plan Detail Modal */}
      <CalendarPlanDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        plan={selectedPlanForDetail}
        onEdit={(plan) => {
          setSelectedPlanForEdit(plan);
          setCreateModalOpen(true);
        }}
        onDeleted={fetchPlans}
      />

      {/* Special Day Information Modal */}
      <SpecialDayModal
        open={specialDayModalOpen}
        onOpenChange={setSpecialDayModalOpen}
        date={selectedSpecialDayDate}
        specialDays={selectedSpecialDays}
      />
    </div>
  );
}
