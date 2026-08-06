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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ImportExcelModal } from "@/components/import-excel-modal";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (status !== "authenticated") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const isWeatherPage = pathname === "/weather";
  const isFinancePage = pathname === "/financial-management" || pathname === "/";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen xl:h-screen w-full xl:overflow-hidden min-w-0">
        <AppSidebar />

        <SidebarInset className="min-h-screen xl:h-screen flex flex-col xl:min-h-0 min-w-0 w-full overflow-x-hidden bg-background">
          {/* Top Page Header Bar */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-3 sm:px-4 min-w-0">
            {/* Left Header Status & Sidebar Trigger */}
            <div className="flex items-center gap-2 min-w-0 pr-2 overflow-hidden">
              <SidebarTrigger />
              <HeaderStatus />
            </div>

            {/* Weather Page Header Actions */}
            {isWeatherPage && (
              <div className="flex items-center gap-2 shrink-0">
                {/* Weather Summary Button */}
                <Button
                  variant="outline"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-weather-summary"))}
                  className="h-9 px-3 text-xs font-bold gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-slate-800 hover:text-amber-600 rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Xem tóm tắt thời tiết nhanh"
                >
                  <FileText className="h-4 w-4 text-amber-500" />
                  <span className="hidden sm:inline">Tóm tắt thời tiết</span>
                </Button>

                {/* Weather Location Refresh Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.dispatchEvent(new CustomEvent("refresh-weather-location"))}
                  className="h-9 w-9 rounded-xl border-slate-200/80 text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                  title="Làm mới thời tiết theo vị trí GPS"
                >
                  <RefreshCw className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span className="sr-only">Làm mới vị trí</span>
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
                      <Button className="h-9 px-3 text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-all">
                        <PlusCircle className="h-4 w-4" />
                        <span>Khai giao dịch</span>
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
                            Khai báo thủ công
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Điền form nhập từng khoản thu/chi
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
                            Import từ file Excel
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Tải file mẫu & nhập hàng loạt
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
                    title="Cài đặt"
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
                        className="h-9 w-9 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-all"
                        title="Menu Thao Tác"
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
                            Khai báo thủ công
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Điền form nhập từng khoản thu/chi
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
                            Import từ file Excel
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Tải file & nhập hàng loạt
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
                            Cài đặt hệ thống
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Giao diện, danh mục, nguồn
                          </div>
                        </div>
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </header>

          <div className="flex-1 min-w-0 flex flex-col xl:overflow-hidden overflow-y-auto p-3 sm:p-5">
            {children}
          </div>
        </SidebarInset>

        {/* Top-level mounted ImportExcelModal for global event triggering */}
        <ImportExcelModal />
      </div>
    </SidebarProvider>
  );
}
