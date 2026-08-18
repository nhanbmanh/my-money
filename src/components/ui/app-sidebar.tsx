"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  UserRound,
  Wallet,
  Layers,
  Sun,
  Moon,
  Clock,
  CloudSun,
  Pin,
  Landmark,
  Globe,
  NotebookPen,
  CalendarDays,
  CheckSquare,
} from "lucide-react";
import { useTheme, ThemeMode } from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { mode, theme, setMode } = useTheme();
  const { language, setLanguage, toggleLanguage, t } = useLanguage();

  const NAV_ITEMS = [
    {
      href: "/financial-management",
      label: t("nav.financialManagement"),
      icon: Wallet,
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      href: "/wealth-management",
      label: t("nav.wealthManagement"),
      icon: Landmark,
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      href: "/notes",
      label: t("nav.notes"),
      icon: NotebookPen,
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      href: "/daily-quests",
      label: t("nav.dailyQuests"),
      icon: CheckSquare,
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      href: "/calendar",
      label: t("nav.calendar"),
      icon: CalendarDays,
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      href: "/weather",
      label: t("nav.weather"),
      icon: CloudSun,
      iconColor: "text-amber-500",
    },
  ];

  // Pinned Default Home Route State
  const [pinnedRoute, setPinnedRoute] = useState<string>("/financial-management");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("default_app_route");
      if (saved && NAV_ITEMS.some((i) => i.href === saved)) {
        setPinnedRoute(saved);
      }
    }
  }, []);

  const handlePinRoute = (route: string) => {
    setPinnedRoute(route);
    if (typeof window !== "undefined") {
      localStorage.setItem("default_app_route", route);
      document.cookie = `default_app_route=${route}; path=/; max-age=31536000`;
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-emerald-500 text-white shadow-lg shadow-sky-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-base font-extrabold tracking-tight text-sidebar-foreground flex items-center gap-1.5">
              <span>MyNOTE</span>
            </p>
            <p className="text-[10px] font-extrabold text-sky-500 tracking-wider uppercase -mt-0.5">
              Note my life
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-4">
        {/* Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t("nav.navigation")}
          </SidebarGroupLabel>

          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const isPinned = pinnedRoute === item.href;
              const isActive =
                pathname === item.href || (item.href === "/financial-management" && pathname === "/");

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className="h-10 text-xs font-semibold rounded-xl"
                  >
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-2.5 w-full group/link"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon className={cn("h-4 w-4 shrink-0", item.iconColor)} />
                        <span className="group-data-[collapsible=icon]:hidden truncate">
                          {item.label}
                        </span>
                      </div>

                      {/* CLEAN PIN ICON ON THE RIGHT */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePinRoute(item.href);
                        }}
                        className={cn(
                          "p-1 rounded-md transition-all cursor-pointer shrink-0 group-data-[collapsible=icon]:hidden",
                          isPinned
                            ? "text-amber-500 opacity-100"
                            : "text-slate-400/40 opacity-0 group-hover/link:opacity-100 hover:text-amber-500"
                        )}
                        title={
                          isPinned
                            ? (language === "vi" ? "Trang mặc định (Đã ghim)" : "Default Page (Pinned)")
                            : (language === "vi" ? "Ghim làm trang mặc định khi truy cập" : "Pin as default landing page")
                        }
                      >
                        <Pin
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            isPinned ? "fill-amber-500 rotate-45" : "-rotate-45"
                          )}
                        />
                      </button>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Settings Group: Language & Theme */}
        <SidebarGroup>
          {/* 
          // Temporarily hidden language toggle switcher for current release
          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t("nav.language")}
          </SidebarGroupLabel>
          <div className="px-2 group-data-[collapsible=icon]:px-0 mb-3">
            <div className="group-data-[collapsible=icon]:hidden grid grid-cols-2 p-1 bg-muted rounded-xl border border-sidebar-border gap-0.5">
              <button
                type="button"
                onClick={() => setLanguage("vi")}
                className={cn(
                  "flex items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all gap-1.5 cursor-pointer",
                  language === "vi"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Tiếng Việt"
              >
                <span>🇻🇳</span>
                <span>Tiếng Việt</span>
              </button>

              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={cn(
                  "flex items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all gap-1.5 cursor-pointer",
                  language === "en"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="English"
              >
                <span>🇬🇧</span>
                <span>English</span>
              </button>
            </div>

            <div className="hidden group-data-[collapsible=icon]:flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLanguage}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground font-extrabold text-xs cursor-pointer"
                title={`Language: ${language.toUpperCase()}`}
              >
                {language.toUpperCase()}
              </Button>
            </div>
          </div>
          */}

          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t("nav.themeMode")}
          </SidebarGroupLabel>
          <div className="px-2 group-data-[collapsible=icon]:px-0">
            {/* Expanded mode: Segmented Mode Selector */}
            <div className="group-data-[collapsible=icon]:hidden grid grid-cols-3 p-1 bg-muted rounded-xl border border-sidebar-border gap-0.5">
              <button
                type="button"
                onClick={() => setMode("light")}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all gap-1 cursor-pointer",
                  mode === "light"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={t("nav.themeLight")}
              >
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("nav.themeLight")}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("dark")}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all gap-1 cursor-pointer",
                  mode === "dark"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={t("nav.themeDark")}
              >
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                <span>{t("nav.themeDark")}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("auto")}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all gap-1 cursor-pointer",
                  mode === "auto"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={t("nav.themeAuto")}
              >
                <Clock className="h-3.5 w-3.5 text-sky-500" />
                <span>{t("nav.themeAuto")}</span>
              </button>
            </div>

            {/* Collapsible mode icon button */}
            <div className="hidden group-data-[collapsible=icon]:flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const modes: ThemeMode[] = ["light", "dark", "auto"];
                  const nextIdx = (modes.indexOf(mode) + 1) % modes.length;
                  setMode(modes[nextIdx]);
                }}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                title={`Chế độ: ${mode === "light" ? "Sáng" : mode === "dark" ? "Tối" : "Tự động"}`}
              >
                {theme === "dark" ? (
                  <Moon className="h-4 w-4 text-indigo-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
              </Button>
            </div>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-3 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-sidebar-foreground">
                {session?.user?.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground font-medium">
                {t("common.account")}
              </p>
            </div>
          </div>

          <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserRound className="h-4 w-4" />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.logout")}
            title={t("common.logout")}
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="group-data-[collapsible=icon]:hidden h-8 w-8 text-muted-foreground hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
