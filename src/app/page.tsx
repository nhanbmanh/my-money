"use client";

import { useEffect, useState } from "react";
import { CashFlowModal } from "@/components/cashflow-modal";
import { CashFlowTable } from "@/components/cashflow-table";

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleOpenCashFlowModal = () => setModalOpen(true);

    window.addEventListener("open-cashflow-modal", handleOpenCashFlowModal);

    return () => {
      window.removeEventListener(
        "open-cashflow-modal",
        handleOpenCashFlowModal,
      );
    };
  }, []);

  return (
    <div>
      <main className="w-full px-4 py-8 lg:px-6">
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
