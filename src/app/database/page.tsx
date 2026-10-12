"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { AuthShell } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Table as TableIcon,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Server,
  Shield,
  FileJson,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
  Key,
  Layers,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface TableSummary {
  name: string;
  rowCount: number;
  columnCount: number;
}

interface ColumnMeta {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

interface TableDataResponse {
  tableName: string;
  columns: ColumnMeta[];
  rows: any[];
  pagination: {
    page: number;
    limit: number;
    totalRows: number;
    totalPages: number;
  };
}

const TABLE_NAMES_MAP: Record<string, { vi: string; en: string }> = {
  users: { vi: "Người dùng (Users)", en: "Users" },
  otp_codes: { vi: "Mã OTP", en: "OTP Codes" },
  sources: { vi: "Nguồn tiền (Sources)", en: "Sources" },
  categories: { vi: "Danh mục thu chi", en: "Categories" },
  secondary_categories: { vi: "Danh mục phụ", en: "Secondary Categories" },
  cash_flows: { vi: "Giao dịch thu chi", en: "Cash Flows" },
  cash_flow_secondary_categories: { vi: "Thu chi - Danh mục phụ", en: "Cash Flow Secondary Categories" },
  cash_flow_templates: { vi: "Mẫu giao dịch", en: "Cash Flow Templates" },
  cash_flow_template_secondary_categories: { vi: "Mẫu giao dịch - Danh mục phụ", en: "Template Secondary Categories" },
  macro_categories: { vi: "Danh mục gia sản", en: "Macro Categories" },
  assets: { vi: "Tài sản (Assets)", en: "Assets" },
  holdings: { vi: "Danh mục nắm giữ", en: "Holdings" },
  wealth_transactions: { vi: "Giao dịch tài sản", en: "Wealth Transactions" },
  liabilities: { vi: "Khoản nợ", en: "Liabilities" },
  notes: { vi: "Ghi chú", en: "Notes" },
  calendar_plans: { vi: "Lịch trình", en: "Calendar Plans" },
  daily_quests: { vi: "Nhiệm vụ ngày", en: "Daily Quests" },
  daily_quest_items: { vi: "Chi tiết nhiệm vụ ngày", en: "Daily Quest Items" },
  _prisma_migrations: { vi: "Lịch sử di trú DB", en: "Prisma Migrations" },
};

export default function DatabasePage() {
  const { data: session, status } = useSession();
  const { language } = useLanguage();

  // State
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [dbStats, setDbStats] = useState({
    dbProvider: "PostgreSQL",
    totalTables: 0,
    totalRecords: 0,
  });
  const [loadingTables, setLoadingTables] = useState(true);
  const [searchTable, setSearchTable] = useState("");

  const [selectedTable, setSelectedTable] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"data" | "schema">("data");
  
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchRow, setSearchRow] = useState("");
  
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Fetch summary of all database tables
  const fetchTables = useCallback(async () => {
    setLoadingTables(true);
    try {
      const res = await fetch("/api/database/tables");
      if (!res.ok) throw new Error("Failed to fetch tables");
      const data = await res.json();
      setTables(data.tables || []);
      setDbStats({
        dbProvider: data.dbProvider || "PostgreSQL",
        totalTables: data.totalTables || 0,
        totalRecords: data.totalRecords || 0,
      });

      // Auto-select first table if none selected
      if (!selectedTable && data.tables?.length > 0) {
        setSelectedTable(data.tables[0].name);
      }
    } catch (err) {
      console.error("Error loading tables:", err);
    } finally {
      setLoadingTables(false);
    }
  }, [selectedTable]);

  // Fetch data rows and column schema for selected table
  const fetchTableData = useCallback(async (tableName: string, currentPage = 1, currentLimit = 20, query = "") => {
    if (!tableName) return;
    setLoadingData(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(currentLimit),
        ...(query ? { search: query } : {}),
      });
      const res = await fetch(`/api/database/tables/${tableName}?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch data for ${tableName}`);
      const data: TableDataResponse = await res.json();
      setTableData(data);
    } catch (err) {
      console.error("Error loading table data:", err);
      setTableData(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (selectedTable) {
      setPage(1);
      fetchTableData(selectedTable, 1, limit, searchRow);
    }
  }, [selectedTable, limit, fetchTableData]);

  const handleSearchRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTableData(selectedTable, 1, limit, searchRow);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchTableData(selectedTable, newPage, limit, searchRow);
  };

  const togglePasswordVisibility = (rowIdx: number, colName: string) => {
    const key = `${rowIdx}-${colName}`;
    setShowPasswordMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyJson = (record: any) => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Filter tables by sidebar search
  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchTable.toLowerCase())
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Spinner className="h-8 w-8 text-sky-500" />
      </div>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-5 pb-10">
        {/* Page Top Header Bar */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl relative overflow-hidden">
          {/* Background Ambient Glows */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500/20 via-blue-500/10 to-emerald-500/20 border border-sky-500/30 text-sky-400 shadow-inner shrink-0">
                <Database className="h-7 w-7 text-sky-400 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {language === "vi" ? "Quản Lý Cơ Sở Dữ Liệu" : "Database Management"}
                  </h1>
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    System Admin
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  {language === "vi"
                    ? "Xem và kiểm tra toàn bộ cấu trúc & dữ liệu các bảng trong hệ thống"
                    : "Inspect full database tables, schema structures, and live system records"}
                </p>
              </div>
            </div>

            {/* Quick System Stats & Header Actions (Refresh & Logout) */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
              <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Server className="h-3.5 w-3.5 text-sky-400" />
                  <span className="font-semibold">{dbStats.dbProvider}</span>
                </div>
                <span className="text-slate-700">|</span>
                <div className="flex items-center gap-1 text-slate-300">
                  <span className="font-bold text-sky-400">{dbStats.totalTables}</span>
                  <span className="text-[11px] text-slate-400">{language === "vi" ? "bảng" : "tables"}</span>
                </div>
                <span className="text-slate-700">|</span>
                <div className="flex items-center gap-1 text-slate-300">
                  <span className="font-bold text-emerald-400">{dbStats.totalRecords}</span>
                  <span className="text-[11px] text-slate-400">{language === "vi" ? "bản ghi" : "records"}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchTables}
                disabled={loadingTables}
                className="h-9 text-xs font-bold gap-1.5 border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-sky-400 ${loadingTables ? "animate-spin" : ""}`} />
                <span>{language === "vi" ? "Làm mới" : "Refresh"}</span>
              </Button>

              {/* Top-Right Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="h-9 text-xs font-bold gap-1.5 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-xl transition-all cursor-pointer shrink-0"
                title={language === "vi" ? "Đăng xuất tài khoản System Admin" : "Logout System Admin"}
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span>{language === "vi" ? "Đăng xuất" : "Logout"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Layout: Table Sidebar (Left) + Table Data Viewer (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT SIDEBAR: Table List & Search */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <TableIcon className="h-4 w-4 text-sky-400" />
                  <span>{language === "vi" ? "Danh sách Bảng" : "Database Tables"}</span>
                </h2>
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-[10px] font-bold">
                  {filteredTables.length}
                </Badge>
              </div>

              {/* Table Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={language === "vi" ? "Tìm kiếm tên bảng..." : "Search table name..."}
                  value={searchTable}
                  onChange={(e) => setSearchTable(e.target.value)}
                  className="pl-9 h-8 text-xs bg-slate-950/80 border-slate-800 focus:border-sky-500 rounded-xl placeholder:text-slate-500 text-slate-200 font-medium"
                />
              </div>

              {/* Table List Scrollable Container */}
              <div className="space-y-1 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                {loadingTables ? (
                  <div className="py-10 text-center space-y-2">
                    <Spinner className="h-5 w-5 text-sky-500 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Đang tải danh sách bảng...</p>
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    {language === "vi" ? "Không tìm thấy bảng nào" : "No tables found"}
                  </div>
                ) : (
                  filteredTables.map((t) => {
                    const isSelected = selectedTable === t.name;
                    const displayName = TABLE_NAMES_MAP[t.name]?.[language as "vi" | "en"] || t.name;
                    
                    return (
                      <button
                        key={t.name}
                        onClick={() => setSelectedTable(t.name)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                          isSelected
                            ? "bg-gradient-to-r from-sky-500/20 via-blue-500/15 to-emerald-500/10 border border-sky-500/30 text-sky-400 shadow-md"
                            : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
                        }`}
                        title={t.name}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <TableIcon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isSelected ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"
                            }`}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-bold text-xs">{displayName}</span>
                            <span className="truncate font-mono text-[9px] text-slate-500">{t.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400">
                            {t.rowCount.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Selected Table Data & Schema Explorer */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {!selectedTable ? (
              <div className="p-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
                <Database className="h-12 w-12 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-400">
                  {language === "vi" ? "Vui lòng chọn một bảng từ danh sách bên trái" : "Please select a table from the sidebar"}
                </p>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                
                {/* Table Header Bar & Tabs */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <TableIcon className="h-5 w-5 text-sky-400" />
                      <div className="flex flex-col">
                        <h2 className="text-lg font-black text-white tracking-tight">
                          {TABLE_NAMES_MAP[selectedTable]?.[language as "vi" | "en"] || selectedTable}
                        </h2>
                        <span className="text-[11px] font-mono text-slate-400">{selectedTable}</span>
                      </div>
                      {tableData && (
                        <Badge variant="outline" className="border-sky-500/30 text-sky-400 bg-sky-500/10 text-[11px] font-bold ml-2 self-start mt-1">
                          {tableData.pagination.totalRows.toLocaleString()} {language === "vi" ? "bản ghi" : "rows"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Mode Tabs: Data vs Schema */}
                  <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setActiveTab("data")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        activeTab === "data"
                          ? "bg-slate-800 text-sky-400 shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {language === "vi" ? "Dữ Liệu Bảng" : "Data Explorer"}
                    </button>
                    <button
                      onClick={() => setActiveTab("schema")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        activeTab === "schema"
                          ? "bg-slate-800 text-sky-400 shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {language === "vi" ? "Cấu Trúc Cột (Schema)" : "Table Schema"}
                    </button>
                  </div>
                </div>

                {/* TAB 1: DATA EXPLORER */}
                {activeTab === "data" && (
                  <div className="space-y-4">
                    {/* Search & Limit Control Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      {/* Search Form inside rows */}
                      <form onSubmit={handleSearchRowSubmit} className="flex items-center gap-2 w-full sm:w-80">
                        <div className="relative w-full">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            type="text"
                            placeholder={language === "vi" ? "Tìm kiếm trong bảng..." : "Search rows..."}
                            value={searchRow}
                            onChange={(e) => setSearchRow(e.target.value)}
                            className="pl-9 h-9 text-xs bg-slate-950/70 border-slate-800 focus:border-sky-500 rounded-xl placeholder:text-slate-500 text-slate-200 font-medium"
                          />
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          className="h-9 px-3 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl cursor-pointer"
                        >
                          {language === "vi" ? "Tìm" : "Filter"}
                        </Button>
                      </form>

                      {/* Limit Per Page Selector */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-end">
                        <span>{language === "vi" ? "Hiển thị:" : "Rows per page:"}</span>
                        <select
                          value={limit}
                          onChange={(e) => setLimit(Number(e.target.value))}
                          className="h-8 text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 font-bold cursor-pointer outline-none focus:border-sky-500"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>

                    {/* Table Data Grid View */}
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
                      {loadingData ? (
                        <div className="py-20 text-center space-y-3">
                          <Spinner className="h-6 w-6 text-sky-500 mx-auto" />
                          <p className="text-xs text-slate-400 font-medium">
                            {language === "vi" ? "Đang tải dữ liệu bảng..." : "Loading table rows..."}
                          </p>
                        </div>
                      ) : !tableData || tableData.rows.length === 0 ? (
                        <div className="py-16 text-center space-y-2 text-slate-400">
                          <Info className="h-8 w-8 text-slate-600 mx-auto" />
                          <p className="text-xs font-semibold">
                            {language === "vi" ? "Bảng này chưa có bản ghi nào" : "No records found in this table"}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-w-full custom-scrollbar">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="p-3 w-12 text-center">#</th>
                                {tableData.columns.map((col) => (
                                  <th key={col.name} className="p-3 font-mono whitespace-nowrap">
                                    <div className="flex flex-col">
                                      <span className="text-slate-200 font-extrabold">{col.name}</span>
                                      <span className="text-[9px] text-sky-400/80 font-mono font-medium lowercase">
                                        {col.type}
                                      </span>
                                    </div>
                                  </th>
                                ))}
                                <th className="p-3 text-right whitespace-nowrap">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                              {tableData.rows.map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                                  <td className="p-3 text-center text-slate-500 font-bold text-[10px]">
                                    {(page - 1) * limit + rowIdx + 1}
                                  </td>
                                  {tableData.columns.map((col) => {
                                    const val = row[col.name];
                                    const isPassword = col.name.toLowerCase().includes("password");
                                    const key = `${rowIdx}-${col.name}`;
                                    const showPass = showPasswordMap[key];

                                    return (
                                      <td key={col.name} className="p-3 max-w-xs truncate text-slate-300">
                                        {val === null || val === undefined ? (
                                          <span className="text-slate-600 italic font-sans text-[11px]">null</span>
                                        ) : typeof val === "boolean" ? (
                                          <Badge
                                            className={
                                              val
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                                                : "bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px]"
                                            }
                                          >
                                            {String(val)}
                                          </Badge>
                                        ) : isPassword ? (
                                          <div className="flex items-center gap-1.5">
                                            <span>{showPass ? String(val) : "••••••••"}</span>
                                            <button
                                              type="button"
                                              onClick={() => togglePasswordVisibility(rowIdx, col.name)}
                                              className="text-slate-500 hover:text-slate-300 transition-colors"
                                            >
                                              {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                            </button>
                                          </div>
                                        ) : typeof val === "object" ? (
                                          <button
                                            onClick={() => setSelectedRecord(row)}
                                            className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold hover:bg-sky-500/20 transition-all cursor-pointer"
                                          >
                                            {Array.isArray(val) ? `Array[${val.length}]` : "Object {...}"}
                                          </button>
                                        ) : (
                                          <span className="truncate block" title={String(val)}>
                                            {String(val)}
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="p-3 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedRecord(row)}
                                      className="h-7 px-2.5 text-[11px] font-bold gap-1 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg cursor-pointer"
                                    >
                                      <FileJson className="h-3.5 w-3.5" />
                                      <span>JSON</span>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Pagination Controls */}
                    {tableData && tableData.pagination.totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <p className="text-xs text-slate-400">
                          {language === "vi" ? "Trang" : "Page"}{" "}
                          <span className="font-bold text-white">{tableData.pagination.page}</span> /{" "}
                          <span className="font-bold text-white">{tableData.pagination.totalPages}</span> (
                          {language === "vi" ? "Tổng" : "Total"}{" "}
                          <span className="font-bold text-sky-400">{tableData.pagination.totalRows}</span>{" "}
                          {language === "vi" ? "bản ghi" : "rows"})
                        </p>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={page <= 1}
                            onClick={() => handlePageChange(1)}
                            className="h-8 w-8 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronsLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={page <= 1}
                            onClick={() => handlePageChange(page - 1)}
                            className="h-8 w-8 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>

                          <span className="px-3 py-1 text-xs font-bold text-slate-200 bg-slate-950 rounded-lg border border-slate-800">
                            {page}
                          </span>

                          <Button
                            variant="outline"
                            size="icon"
                            disabled={page >= tableData.pagination.totalPages}
                            onClick={() => handlePageChange(page + 1)}
                            className="h-8 w-8 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={page >= tableData.pagination.totalPages}
                            onClick={() => handlePageChange(tableData.pagination.totalPages)}
                            className="h-8 w-8 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: SCHEMA EXPLORER */}
                {activeTab === "schema" && tableData && (
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-3">Tên Cột (Column)</th>
                          <th className="p-3">Kiểu Dữ Liệu (Data Type)</th>
                          <th className="p-3">Có Thể Null (Nullable)</th>
                          <th className="p-3">Giá Trị Mặc Định (Default)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                        {tableData.columns.map((col) => (
                          <tr key={col.name} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-bold text-sky-400">{col.name}</td>
                            <td className="p-3 text-slate-300">
                              <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px] font-mono">
                                {col.type}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {col.nullable ? (
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                                  YES (NULL)
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px]">
                                  NO (NOT NULL)
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-slate-400">
                              {col.default ? (
                                <span className="text-slate-300 text-[11px] font-mono">{col.default}</span>
                              ) : (
                                <span className="text-slate-600 italic font-sans text-[11px]">none</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

        {/* ROW DETAIL JSON MODAL */}
        {selectedRecord && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              
              {/* Modal Top Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-sky-400" />
                  <h3 className="text-base font-bold text-white font-mono">
                    {selectedTable} Record Detail
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyJson(selectedRecord)}
                    className="h-8 text-xs font-bold gap-1.5 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl cursor-pointer"
                  >
                    {copiedJson ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-sky-400" />}
                    <span>{copiedJson ? "Đã sao chép!" : "Copy JSON"}</span>
                  </Button>

                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors rounded-lg cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Syntax Highlighted JSON Body */}
              <div className="p-5 overflow-y-auto flex-1 bg-slate-950/90 font-mono text-xs text-sky-300 custom-scrollbar">
                <pre className="whitespace-pre-wrap break-all leading-relaxed">
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 text-right bg-slate-950/60">
                <Button
                  onClick={() => setSelectedRecord(null)}
                  className="h-9 px-5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl cursor-pointer"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AuthShell>
  );
}
