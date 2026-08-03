"use client";

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
} from "lucide-react";
import { useTheme, ThemeMode } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { mode, theme, setMode } = useTheme();

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-md shadow-sky-600/20">
            <Layers className="h-5 w-5" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-base font-extrabold tracking-tight text-sidebar-foreground">
              MyNOTE
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Note my life
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-4">
        {/* Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Điều hướng
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center justify-center">
              <SidebarMenuButton
                asChild
                isActive={pathname === "/"}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                <Link href="/" className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    Quản lý tài chính
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Theme Settings Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Giao diện
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
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Giao diện sáng"
              >
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <span>Sáng</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("dark")}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all gap-1 cursor-pointer",
                  mode === "dark"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Giao diện tối"
              >
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                <span>Tối</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("auto")}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all gap-1 cursor-pointer",
                  mode === "auto"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Tự động theo giờ hệ thống (6h-18h: Sáng, 18h-6h: Tối)"
              >
                <Clock className="h-3.5 w-3.5 text-sky-500" />
                <span>Tự động</span>
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
                Tài khoản
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
            aria-label="Đăng xuất"
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
