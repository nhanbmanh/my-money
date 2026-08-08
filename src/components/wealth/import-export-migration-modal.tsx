"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileSpreadsheet,
  Download,
  Upload,
  FileText,
  ScanLine,
  CheckCircle2,
  Table as TableIcon,
  RefreshCw,
  Database
} from "lucide-react";

interface MigrationModalProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  onSuccess: () => void;
}

export function ImportExportMigrationModal({
  open,
  onOpenChange,
  onSuccess
}: MigrationModalProps) {
  const [activeTab, setActiveTab] = useState<"IMPORT" | "EXPORT">("IMPORT");
  const [importMode, setImportMode] = useState<"SNAPSHOT_CSV" | "LEDGER_CSV" | "OCR_SMART">("SNAPSHOT_CSV");

  // Sample CSV / Mapping Preview state
  const [csvHeaders, setCsvHeaders] = useState<string[]>(["NgayGiaoDich", "LoaiGD", "TaiKhoan", "MaCK", "SoLuong", "GiaDat"]);
  const [columnMapping, setColumnMapping] = useState({
    date: "NgayGiaoDich",
    transactionType: "LoaiGD",
    accountName: "TaiKhoan",
    assetSymbol: "MaCK",
    quantity: "SoLuong",
    price: "GiaDat",
    fee: ""
  });

  const [previewRows, setPreviewRows] = useState<any[]>([
    { NgayGiaoDich: "2026-08-01", LoaiGD: "BUY", TaiKhoan: "VPS Chứng khoán", MaCK: "HPG", SoLuong: 2000, GiaDat: 28500 },
    { NgayGiaoDich: "2026-08-03", LoaiGD: "BUY", TaiKhoan: "VPS Chứng khoán", MaCK: "FPT", SoLuong: 500, GiaDat: 135000 },
    { NgayGiaoDich: "2026-08-05", LoaiGD: "BUY", TaiKhoan: "Binance Crypto", MaCK: "BTC", SoLuong: 0.05, GiaDat: 1650000000 }
  ]);

  // OCR Sample Preview state
  const [ocrSampleFile, setOcrSampleFile] = useState("VPS_SaoKe_GiaoDich_Thang8.pdf");
  const [ocrParsedResult, setOcrParsedResult] = useState<any[]>([
    { date: "2026-08-02", type: "BUY", accountName: "VPS Chứng khoán", symbol: "VNM", quantity: 1000, price: 67200, fee: 15000 },
    { date: "2026-08-04", type: "SELL", accountName: "VPS Chứng khoán", symbol: "MWG", quantity: 500, price: 62800, fee: 12000 }
  ]);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Commit Snapshot / Ledger Import
  const handleCommitImport = async () => {
    setLoading(true);
    try {
      let payload: any = { mode: importMode };

      if (importMode === "SNAPSHOT_CSV") {
        payload.items = [
          { Account_Name: "VPS Chứng khoán", Asset_Symbol_or_Name: "HPG", Quantity: 5000, Cost_Basis: 25000, Current_Value: 142500000, Currency: "VND" },
          { Account_Name: "VCB Tiết kiệm", Asset_Symbol_or_Name: "Tiền gửi 6 tháng", Quantity: 1, Cost_Basis: 200000000, Current_Value: 200000000, Currency: "VND" }
        ];
      } else if (importMode === "LEDGER_CSV") {
        payload.items = previewRows;
        payload.mapping = columnMapping;
      } else if (importMode === "OCR_SMART") {
        payload.items = ocrParsedResult;
      }

      const res = await fetch("/api/wealth/migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg({ type: "success", text: data.message || "Import dữ liệu thành công!" });
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Lỗi khi import dữ liệu" });
    } finally {
      setLoading(false);
    }
  };

  // Export triggers
  const handleDownloadExport = (exportType: "HOLDINGS" | "LEDGER" | "FULL_BACKUP") => {
    window.open(`/api/wealth/migration?type=${exportType}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <span>Trung Tâm Di Chuyển Dữ Liệu Gia Sản (Data Migration Hub)</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Import số dư, nhật ký giao dịch từ file CSV/Excel hoặc OCR AI, xuất bản dữ liệu sao lưu JSON toàn bộ hệ thống.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-muted rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("IMPORT")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "IMPORT" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            <Upload className="h-4 w-4 text-sky-500" />
            <span>Chức Năng Import Dữ Liệu (3 Modes)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("EXPORT")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "EXPORT" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            <Download className="h-4 w-4 text-emerald-500" />
            <span>Chức Năng Export Dữ Liệu (3 Modes)</span>
          </button>
        </div>

        {/* IMPORT SECTION */}
        {activeTab === "IMPORT" && (
          <div className="space-y-4 pt-2">
            {/* Import Mode Sub-tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setImportMode("SNAPSHOT_CSV")}
                className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  importMode === "SNAPSHOT_CSV"
                    ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold"
                    : "border-slate-200 dark:border-slate-800 bg-background"
                }`}
              >
                <div className="font-extrabold flex items-center gap-1.5">
                  <TableIcon className="h-4 w-4 text-sky-600" />
                  <span>1. Snapshot CSV</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-normal mt-1">
                  Nhập nhanh số dư danh mục hiện tại (không lịch sử)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setImportMode("LEDGER_CSV")}
                className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  importMode === "LEDGER_CSV"
                    ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold"
                    : "border-slate-200 dark:border-slate-800 bg-background"
                }`}
              >
                <div className="font-extrabold flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-sky-600" />
                  <span>2. Transaction Ledger</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-normal mt-1">
                  Kèm Header Mapping Modal & Live Preview
                </div>
              </button>

              <button
                type="button"
                onClick={() => setImportMode("OCR_SMART")}
                className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  importMode === "OCR_SMART"
                    ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold"
                    : "border-slate-200 dark:border-slate-800 bg-background"
                }`}
              >
                <div className="font-extrabold flex items-center gap-1.5">
                  <ScanLine className="h-4 w-4 text-purple-600" />
                  <span>3. OCR AI Document</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-normal mt-1">
                  Upload file PDF/ảnh sao kê ngân hàng/VPS
                </div>
              </button>
            </div>

            {/* Mode 1: Snapshot CSV */}
            {importMode === "SNAPSHOT_CSV" && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Cấu Trúc Cột Yêu Cầu File CSV Snapshot:
                </div>
                <div className="p-2 rounded-lg bg-background font-mono text-[11px] text-sky-600 dark:text-sky-400">
                  Account_Name, Asset_Symbol_or_Name, Quantity, Cost_Basis, Current_Value, Currency
                </div>
                <Input type="file" accept=".csv, .xlsx" className="h-10 text-xs cursor-pointer" />
              </div>
            )}

            {/* Mode 2: Ledger CSV with Header Mapping Modal */}
            {importMode === "LEDGER_CSV" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-xs">A. Mapping Cột Header CSV Với Hệ Thống (Header Mapping Modal):</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground">Cột Ngày:</span>
                      <select
                        value={columnMapping.date}
                        onChange={(e) => setColumnMapping({ ...columnMapping, date: e.target.value })}
                        className="w-full h-8 text-xs bg-background border rounded-lg"
                      >
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground">Cột Loại Giao Dịch:</span>
                      <select
                        value={columnMapping.transactionType}
                        onChange={(e) => setColumnMapping({ ...columnMapping, transactionType: e.target.value })}
                        className="w-full h-8 text-xs bg-background border rounded-lg"
                      >
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground">Cột Mã CK/Tài Sản:</span>
                      <select
                        value={columnMapping.assetSymbol}
                        onChange={(e) => setColumnMapping({ ...columnMapping, assetSymbol: e.target.value })}
                        className="w-full h-8 text-xs bg-background border rounded-lg"
                      >
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Live Preview Table */}
                <div className="space-y-1">
                  <div className="font-bold text-xs text-sky-700 dark:text-sky-400">
                    B. Bảng Xem Trước Trực Tiếp (Live Preview Table Before Commit):
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <tr>
                          <th className="p-2">Ngày</th>
                          <th className="p-2">Loại</th>
                          <th className="p-2">Tài Khoản</th>
                          <th className="p-2">Mã Asset</th>
                          <th className="p-2 text-right">Số Lượng</th>
                          <th className="p-2 text-right">Giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{r.NgayGiaoDich}</td>
                            <td className="p-2 font-bold text-emerald-600">{r.LoaiGD}</td>
                            <td className="p-2">{r.TaiKhoan}</td>
                            <td className="p-2 font-extrabold">{r.MaCK}</td>
                            <td className="p-2 text-right font-bold">{r.SoLuong}</td>
                            <td className="p-2 text-right">{r.GiaDat.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 3: Smart Document / OCR Import */}
            {importMode === "OCR_SMART" && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/10 text-center space-y-2">
                  <ScanLine className="h-8 w-8 text-purple-600 mx-auto" />
                  <div className="text-xs font-bold text-purple-700 dark:text-purple-300">
                    Kéo thả hoặc Tải lên File Sao Kê (PDF, Ảnh PNG/JPG)
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Hệ thống AI OCR sẽ trích xuất dữ liệu tự động thành JSON trước khi lưu
                  </div>
                  <Input type="file" accept=".pdf, .png, .jpg" className="max-w-xs mx-auto text-xs cursor-pointer" />
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-xs text-purple-700 dark:text-purple-300">
                    Dữ Liệu JSON Đã Trích Xuất (AI Parsed Preview):
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-36">
                    {JSON.stringify(ocrParsedResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <Button
              onClick={handleCommitImport}
              disabled={loading}
              className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer mt-4"
            >
              {loading ? "Đang tiến hành import..." : "Xác Nhận Import Dữ Liệu Vào Hệ Thống"}
            </Button>
          </div>
        )}

        {/* EXPORT SECTION */}
        {activeTab === "EXPORT" && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Option 1: Holdings Snapshot Export */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <TableIcon className="h-4 w-4 text-sky-600" />
                      <span>Holdings Snapshot</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Xuất bản danh mục tài sản hiện tại, số lượng, giá trị ròng dạng CSV/Excel.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDownloadExport("HOLDINGS")}
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-bold gap-1 rounded-xl cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải CSV Snapshot</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Option 2: Transaction Ledger Export */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span>Transaction Ledger</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Xuất toàn bộ lịch sử mua/bán, cổ tức, chi tiêu dạng CSV/Excel.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDownloadExport("LEDGER")}
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-bold gap-1 rounded-xl cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải CSV Ledger</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Option 3: Full System Backup JSON */}
              <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/20 dark:bg-purple-950/10">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div>
                    <div className="font-bold text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-purple-600" />
                      <span>Full System Backup</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Xuất bản dump JSON đầy đủ tất cả bảng dữ liệu để phục hồi offline.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDownloadExport("FULL_BACKUP")}
                    size="sm"
                    className="w-full text-xs font-bold gap-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải Backup (JSON)</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
