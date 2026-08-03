"use client";

import { useEffect, useState } from "react";
import { CashFlowModal } from "@/components/cashflow-modal";
import { SettingsModal } from "@/components/settings-modal";
import { CashFlowTable } from "@/components/cashflow-table";

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleOpenCashFlowModal = () => setModalOpen(true);
    const handleOpenSettingsModal = () => setSettingsModalOpen(true);

    window.addEventListener("open-cashflow-modal", handleOpenCashFlowModal);
    window.addEventListener("open-settings-modal", handleOpenSettingsModal);

    return () => {
      window.removeEventListener(
        "open-cashflow-modal",
        handleOpenCashFlowModal,
      );
      window.removeEventListener(
        "open-settings-modal",
        handleOpenSettingsModal,
      );
    };
  }, []);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col xl:overflow-hidden">
      <main className="w-full px-4 py-3 lg:px-6 flex-1 min-h-0 flex flex-col xl:overflow-hidden">
        <CashFlowTable refreshKey={refreshKey} />
      </main>

      <CashFlowModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <SettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
