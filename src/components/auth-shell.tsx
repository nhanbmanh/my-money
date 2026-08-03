"use client";

import { useSession } from "next-auth/react";
import { PlusCircle, Settings } from "lucide-react";
import { AppSidebar } from "@/components/ui/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { HeaderStatus } from "@/components/header-status";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status !== "authenticated") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen xl:h-screen w-full xl:overflow-hidden">
        <AppSidebar />

        <SidebarInset className="min-h-screen xl:h-screen flex flex-col xl:min-h-0 xl:overflow-hidden bg-background">
          {/* Top Page Header Bar */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <SidebarTrigger />
              <HeaderStatus />
            </div>

            {/* Top Right App Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-cashflow-modal"))
                }
                className="h-9 px-3 text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Khai giao dịch</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-settings-modal"))
                }
                className="h-9 w-9 rounded-xl border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition-all"
                title="Cài đặt"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="flex-1 xl:min-h-0 flex flex-col xl:overflow-hidden">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
