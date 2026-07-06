"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { CashFlowModal } from "@/components/cashflow-modal";
import { CashFlowTable } from "@/components/cashflow-table";
import { Header } from "@/components/header";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <Header onOpenModal={() => setModalOpen(true)} />

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
