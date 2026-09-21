"use client";

import { useEffect, useState } from "react";
import { CashFlowModal } from "@/components/cashflow-modal";
import { SettingsModal } from "@/components/settings-modal";
import { CashFlowTable } from "@/components/cashflow-table";

export default function FinancialManagementPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [isCopy, setIsCopy] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleOpenCashFlowModal = () => {
      setEditData(null);
      setIsCopy(false);
      setModalOpen(true);
    };

    const handleOpenEditCashFlowModal = (e: CustomEvent) => {
      if (e.detail?.item) {
        setEditData(e.detail.item);
        setIsCopy(false);
        setModalOpen(true);
      }
    };

    const handleOpenCopyCashFlowModal = (e: CustomEvent) => {
      if (e.detail?.item) {
        setEditData(e.detail.item);
        setIsCopy(true);
        setModalOpen(true);
      }
    };

    const handleOpenSettingsModal = () => setSettingsModalOpen(true);
    const handleRefreshCashflows = () => setRefreshKey((k) => k + 1);

    window.addEventListener("open-cashflow-modal", handleOpenCashFlowModal);
    window.addEventListener(
      "open-edit-cashflow-modal",
      handleOpenEditCashFlowModal as EventListener
    );
    window.addEventListener(
      "open-copy-cashflow-modal",
      handleOpenCopyCashFlowModal as EventListener
    );
    window.addEventListener("open-settings-modal", handleOpenSettingsModal);
    window.addEventListener("refresh-cashflows", handleRefreshCashflows);

    return () => {
      window.removeEventListener(
        "open-cashflow-modal",
        handleOpenCashFlowModal
      );
      window.removeEventListener(
        "open-edit-cashflow-modal",
        handleOpenEditCashFlowModal as EventListener
      );
      window.removeEventListener(
        "open-copy-cashflow-modal",
        handleOpenCopyCashFlowModal as EventListener
      );
      window.removeEventListener(
        "open-settings-modal",
        handleOpenSettingsModal
      );
      window.removeEventListener("refresh-cashflows", handleRefreshCashflows);
    };
  }, []);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col xl:overflow-hidden">
      <main className="w-full px-4 py-3 lg:px-6 flex-1 min-h-0 flex flex-col xl:overflow-hidden">
        <CashFlowTable refreshKey={refreshKey} />
      </main>

      <CashFlowModal
        open={modalOpen}
        onOpenChange={(val) => {
          setModalOpen(val);
          if (!val) {
            setEditData(null);
            setIsCopy(false);
          }
        }}
        editData={editData}
        isCopy={isCopy}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      <SettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
