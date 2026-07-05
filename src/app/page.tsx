"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { PlusCircle, LogOut, User } from "lucide-react";
import { CashFlowModal } from "@/components/cashflow-modal";
import { CashFlowTable } from "@/components/cashflow-table";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-sky-50 border-b border-gray-200 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-sky-700">Tiền của tao đâu</h1>
            <Button
              onClick={() => setModalOpen(true)}
              className="gap-2"
              size="sm"
            >
              <PlusCircle className="h-4 w-4" />
              Khai báo thu chi
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/profile"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="h-4 w-4" />
              <span>
                Xin chào, <strong>{session?.user?.name}</strong>
              </span>
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="gap-2 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <CashFlowTable refreshKey={refreshKey} />
      </main>

      <CashFlowModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
