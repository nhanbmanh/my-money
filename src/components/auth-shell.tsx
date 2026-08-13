"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  PlusCircle,
  Settings,
  ChevronDown,
  FileSpreadsheet,
  Edit3,
  FileText,
  RefreshCw,
  Wallet,
  TrendingUp,
  Building2,
  Landmark,
  HandCoins,
} from "lucide-react";
import { AppSidebar } from "@/components/ui/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { HeaderStatus } from "@/components/header-status";
import { NotificationsPopover } from "@/components/notifications-popover";
import { BudgetWarningModal } from "@/components/budget-warning-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ImportExcelModal } from "@/components/import-excel-modal";
import { useLanguage } from "@/components/language-provider";
import { ASSET_CATEGORY_TYPES } from "@/lib/asset-category-types";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wealthMenuOpen, setWealthMenuOpen] = useState(false);

  if (status !== "authenticated") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const isWeatherPage = pathname === "/weather";
  const isFinancePage = pathname === "/financial-management" || pathname === "/";
  const isWealthPage = pathname === "/wealth-management";
  const isNotesPage = pathname === "/notes";
  const isCalendarPage = pathname === "/calendar";

  return (
    <SidebarProvider>
      <BudgetWarningModal />
      <div className="flex min-h-screen w-full min-w-0">
        <AppSidebar />

        <SidebarInset className="min-h-screen flex flex-col min-w-0 w-full overflow-x-hidden bg-background">
          {/* Top Page Header Bar */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-3 sm:px-4 min-w-0">
            {/* Left Header Status & Sidebar Trigger */}
            <div className="flex items-center gap-2 min-w-0 pr-2 overflow-hidden">
              <SidebarTrigger />
              <HeaderStatus />
            </div>

            {/* Wealth Management Header Actions */}
            {isWealthPage && (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <NotificationsPopover />

                <Popover open={wealthMenuOpen} onOpenChange={setWealthMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      className="h-9 px-3 sm:px-3.5 text-xs font-bold gap-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white rounded-xl shadow-lg shadow-sky-500/20 transition-all border-0 cursor-pointer shrink-0"
                      title={language === "vi" ? "Thêm tài sản mới" : "Add new asset"}
                    >
                      <PlusCircle className="h-4 w-4 shrink-0" />
                      <span>{language === "vi" ? "Thêm tài sản" : "Add Asset"}</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    align="end"
                    className="w-72 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-1 z-[200]"
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                      Chọn Danh Mục Khai Báo
                    </div>
                    <div className="space-y-1">
                      {Object.values(ASSET_CATEGORY_TYPES).map((cat) => (
                        <button
                          key={cat.type}
                          type="button"
                          onClick={() => {
                            setWealthMenuOpen(false);
                            window.dispatchEvent(
                              new CustomEvent("open-wealth-creation-modal", {
                                detail: { categoryType: cat.type },
                              })
                            );
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 flex items-start gap-2.5 transition-colors group cursor-pointer"
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${cat.badgeBg}`}>
                            {cat.type === 0 && <Wallet className="h-4 w-4" />}
                            {cat.type === 1 && <TrendingUp className="h-4 w-4" />}
                            {cat.type === 2 && <Building2 className="h-4 w-4" />}
                            {cat.type === 3 && <Landmark className="h-4 w-4" />}
                            {cat.type === 4 && <HandCoins className="h-4 w-4" />}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                              {cat.type}. {cat.shortName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal truncate">
                              {cat.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Weather Page Header Actions */}
            {isWeatherPage && (
              <div className="flex items-center gap-2 shrink-0">
                {/* Weather Summary Button */}
                <Button
                  variant="outline"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-weather-summary"))}
                  className="h-9 px-3 text-xs font-bold gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-slate-800 hover:text-amber-600 rounded-xl shadow-xs transition-all cursor-pointer"
                  title={language === "vi" ? "Xem tóm tắt thời tiết nhanh" : "Weather summary"}
                >
                  <FileText className="h-4 w-4 text-amber-500" />
                  <span className="hidden sm:inline">{language === "vi" ? "Tóm tắt thời tiết" : "Weather Summary"}</span>
                </Button>

                {/* Weather Location Refresh Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.dispatchEvent(new CustomEvent("refresh-weather-location"))}
                  className="h-9 w-9 rounded-xl border-slate-200/80 text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                  title={language === "vi" ? "Làm mới thời tiết theo vị trí GPS" : "Refresh location GPS weather"}
                >
                  <RefreshCw className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span className="sr-only">{language === "vi" ? "Làm mới vị trí" : "Refresh location"}</span>
                </Button>
              </div>
            )}

            {/* Notes Page Header Actions */}
            {isNotesPage && (
              <div className="flex items-center gap-2 shrink-0">
                <NotificationsPopover />
                <Button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-note-modal"))}
                  className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-purple-500/20 transition-all border-0 cursor-pointer"
                  title={language === "vi" ? "Thêm ghi chú mới" : "Add new note"}
                >
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  <span>{language === "vi" ? "Thêm ghi chú" : "Add Note"}</span>
                </Button>
              </div>
            )}

            {/* Calendar Page Header Actions */}
            {isCalendarPage && (
              <div className="flex items-center gap-2 shrink-0">
                <NotificationsPopover />
                <Button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-calendar-modal"))}
                  className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all border-0 cursor-pointer"
                  title={language === "vi" ? "Thêm kế hoạch mới" : "Add new plan"}
                >
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  <span>{language === "vi" ? "Thêm kế hoạch" : "Add Plan"}</span>
                </Button>
              </div>
            )}

            {/* Financial Management Header Actions */}
            {isFinancePage && (
              <>
                {/* Right Desktop Header Actions (>= 640px) */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <NotificationsPopover />

                  {/* Khai Giao Dịch Action Menu Dropdown */}
                  <Popover open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
                    <PopoverTrigger asChild>
                      <Button className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white rounded-xl shadow-lg shadow-sky-500/20 transition-all border-0 cursor-pointer">
                        <PlusCircle className="h-4 w-4" />
                        <span>{t("header.addTransaction")}</span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent
                      align="end"
                      className="w-64 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-1"
                    >
                      <button
                        onClick={() => {
                          setActionMenuOpen(false);
                          window.dispatchEvent(
                            new CustomEvent("open-cashflow-modal")
                          );
                        }}
                        className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800/80 text-left transition-all group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Edit3 className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                            {language === "vi" ? "Khai báo thủ công" : "Manual Transaction"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {language === "vi" ? "Điền form nhập từng khoản thu/chi" : "Fill form for individual income/expense"}
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActionMenuOpen(false);
                          window.dispatchEvent(
                            new CustomEvent("open-import-excel-modal")
                          );
                        }}
                        className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800/80 text-left transition-all group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            {language === "vi" ? "Import từ file Excel" : "Import from Excel File"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {language === "vi" ? "Tải file mẫu & nhập hàng loạt" : "Download template & bulk import"}
                          </div>
                        </div>
                      </button>
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent("open-settings-modal"))
                    }
                    className="h-9 w-9 rounded-xl border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition-all cursor-pointer"
                    title={t("header.settings")}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>

                {/* Right Mobile Header Actions (< 640px) */}
                <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                  <NotificationsPopover />

                  <Popover open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        className="h-9 w-9 bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white rounded-xl shadow-lg shadow-sky-500/20 border-0 transition-all cursor-pointer"
                        title={language === "vi" ? "Menu Thao Tác" : "Actions Menu"}
                      >
                        <PlusCircle className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent
                      align="end"
                      className="w-64 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-1"
                    >
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          window.dispatchEvent(
                            new CustomEvent("open-cashflow-modal")
                          );
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 text-left transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Edit3 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-600">
                            {language === "vi" ? "Khai báo thủ công" : "Manual Transaction"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {language === "vi" ? "Điền form nhập từng khoản thu/chi" : "Fill form for individual income/expense"}
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          window.dispatchEvent(
                            new CustomEvent("open-import-excel-modal")
                          );
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 text-left transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600">
                            {language === "vi" ? "Import từ file Excel" : "Import from Excel File"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {language === "vi" ? "Tải file & nhập hàng loạt" : "Download template & bulk import"}
                          </div>
                        </div>
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          window.dispatchEvent(
                            new CustomEvent("open-settings-modal")
                          );
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                          <Settings className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {t("header.settings")}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {language === "vi" ? "Giao diện, danh mục, nguồn" : "Appearance, categories, sources"}
                          </div>
                        </div>
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </header>

          <div className="flex-1 min-w-0 flex flex-col p-3 sm:p-5">
            {children}
          </div>
        </SidebarInset>

        {/* Top-level mounted ImportExcelModal for global event triggering */}
        <ImportExcelModal />
      </div>
    </SidebarProvider>
  );
}
