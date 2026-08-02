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
  House,
  PlusCircle,
  Settings,
  LogOut,
  UserRound,
  Wallet,
} from "lucide-react";

function openCashFlowModal() {
  window.dispatchEvent(new CustomEvent("open-cashflow-modal"));
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-lg font-semibold tracking-tight">AUTO MONEY</p>
            <p className="text-xs text-muted-foreground">Quản lý chi tiêu</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-4">
        <SidebarGroup>
          <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center justify-center">
              <SidebarMenuButton asChild isActive={pathname === "/"}>
                <Link href="/" className="flex items-center gap-2">
                  <House className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    Dashboard
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className="flex items-center justify-center">
              <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    Cài đặt
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Thao tác</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center justify-center">
              <Button
                onClick={openCashFlowModal}
                className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Khai giao dịch
                </span>
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-3 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {session?.user?.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
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
            className="group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
