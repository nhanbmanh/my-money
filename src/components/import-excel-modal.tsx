"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  generateExcelTemplate,
  parseUploadedExcelFile,
  Source,
  Category,
} from "@/lib/excel-import-utils";
import { ImportResultDetail } from "@/app/api/cashflow/import/route";

interface ImportExcelModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sources?: Source[];
  categories?: Category[];
  secondaryCategories?: Category[];
  onImportSuccess?: () => void;
}

export function ImportExcelModal({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  sources: initialSources = [],
  categories: initialCategories = [],
  secondaryCategories: initialSecondaryCategories = [],
  onImportSuccess,
}: ImportExcelModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  const setOpen = useCallback(
    (value: boolean) => {
      if (externalOnOpenChange) {
        externalOnOpenChange(value);
      } else {
        setInternalOpen(value);
      }
    },
    [externalOnOpenChange]
  );

  const [sources, setSources] = useState<Source[]>(initialSources);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [secondaryCategories, setSecondaryCategories] = useState<Category[]>(
    initialSecondaryCategories
  );

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    totalRows: number;
    successCount: number;
    failedCount: number;
    failedDetails: ImportResultDetail[];
  } | null>(null);
  const [error, setError] = useState("");

  // Listen for global custom event "open-import-excel-modal"
  useEffect(() => {
    const handleOpenEvent = () => {
      setOpen(true);
    };

    window.addEventListener("open-import-excel-modal", handleOpenEvent);
    return () => {
      window.removeEventListener("open-import-excel-modal", handleOpenEvent);
    };
  }, [setOpen]);

  // Fetch reference sources and categories if missing when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchRefData = async () => {
        try {
          const [resSources, resPrimary, resSecondary] = await Promise.all([
            fetch("/api/source"),
            fetch("/api/category"),
            fetch("/api/secondary-category"),
          ]);

          if (resSources.ok) setSources(await resSources.json());
          if (resPrimary.ok) setCategories(await resPrimary.json());
          if (resSecondary.ok) setSecondaryCategories(await resSecondary.json());
        } catch (e) {
          console.error("Failed to fetch reference data for excel import:", e);
        }
      };

      fetchRefData();
    }
  }, [isOpen]);

  const handleDownloadTemplate = () => {
    generateExcelTemplate(sources, categories, secondaryCategories);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError("");
    }
  };

  const handleUploadAndImport = async () => {
    if (!file) {
      setError("Vui lòng chọn file Excel để import");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const rowsPayload = await parseUploadedExcelFile(file);

      if (rowsPayload.length === 0) {
        setError("File Excel rỗng hoặc không có dữ liệu giao dịch");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/cashflow/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rowsPayload }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đã xảy ra lỗi khi import dữ liệu");
      } else {
        setResult(data);
        if (data.successCount > 0) {
          window.dispatchEvent(
            new CustomEvent("refresh-budget-alerts", {
              detail: { triggerToast: true, triggerModal: true },
            })
          );
          onImportSuccess?.();
        }
      }
    } catch {
      setError("Không thể đọc hoặc xử lý file Excel. Vui lòng kiểm tra lại file mẫu!");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <div className="w-8.5 h-8.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            Import Giao Dịch Từ File Excel
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tải file mẫu Excel (.xlsx), điền dữ liệu giao dịch và tải lên hệ thống để thêm tự động.
          </p>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Step 1: Download Template */}
          <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-slate-800/60 border border-sky-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <h5 className="text-xs font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                Bước 1: Tải File Mẫu (.xlsx)
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                File chứa sẵn danh sách Nguồn tiền & Nhãn chính của bạn để dễ mapping.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="h-8.5 text-xs font-bold text-sky-700 border-sky-200 bg-white hover:bg-sky-100 dark:bg-slate-900 dark:border-slate-700 dark:text-sky-400 rounded-xl shrink-0 gap-1.5 shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              Tải File Mẫu
            </Button>
          </div>

          {/* Step 2: Select File & Upload */}
          {!result && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                Bước 2: Chọn File Excel Đã Nhập Dữ Liệu
              </label>

              <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 rounded-2xl p-5 text-center transition-all bg-slate-50/40 dark:bg-slate-900/40">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  {file ? (
                    <p className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {file.name}
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Kéo thả hoặc bấm để chọn file .xlsx
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Hỗ trợ định dạng Excel chuẩn .xlsx, .xls
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Import Result Breakdown */}
          {result && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 animate-in fade-in-50 duration-300">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Kết Quả Import Dữ Liệu
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Đã xử lý {result.totalRows} dòng dữ liệu
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    ✅ Thành công: {result.successCount}
                  </span>
                  {result.failedCount > 0 && (
                    <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                      ⚠️ Bỏ qua: {result.failedCount}
                    </span>
                  )}
                </div>
              </div>

              {result.failedDetails.length > 0 && (
                <div className="space-y-1.5">
                  <h6 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Danh sách các dòng bị bỏ qua (Do không mapping được):
                  </h6>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {result.failedDetails.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start justify-between gap-2"
                      >
                        <span className="font-bold text-amber-800 dark:text-amber-300 shrink-0">
                          Dòng {item.rowNumber}:
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          "{item.title}"
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-medium text-right shrink-0">
                          {item.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="w-full text-xs font-bold text-slate-500 hover:text-slate-800 gap-1.5 pt-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Import file Excel khác
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs rounded-xl"
          >
            Đóng
          </Button>

          {!result && (
            <Button
              type="button"
              size="sm"
              disabled={!file || loading}
              onClick={handleUploadAndImport}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 min-w-32"
            >
              {loading ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Tải Lên & Import
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
