"use client";

import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/ui/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { HeaderStatus } from "@/components/header-status";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status !== "authenticated") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <SidebarInset className="min-h-screen bg-background">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <div className="flex flex-1 items-center gap-2">
              <SidebarTrigger />
              <HeaderStatus />
            </div>
          </header>

          <div className="flex-1">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
