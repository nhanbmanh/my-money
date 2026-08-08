"use client";

import { useState, useEffect } from "react";
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
import { searchMarketTickers, MarketTicker } from "@/lib/market-ticker-service";
import {
  Search,
  CheckCircle2,
  Building2,
  TrendingUp,
  CreditCard,
  Percent,
  PlusCircle,
  HelpCircle,
  AlertCircle
} from "lucide-react";

interface ModalProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  defaultFlow?: "MARKET_DRIVEN" | "CUSTOM_ILLIQUID";
  macroCategories: any[];
  holdings?: any[];
  onSuccess: () => void;
}

export function AssetCreationModal({
  open,
  onOpenChange,
  defaultFlow = "MARKET_DRIVEN",
  macroCategories,
  holdings = [],
  onSuccess
}: ModalProps) {
  const [activeTab, setActiveTab] = useState<"MARKET_DRIVEN" | "CUSTOM_ILLIQUID">(defaultFlow);

  const hasExistingLiquidHolding = holdings.some((h) => h.macroCategory?.code === "LIQUID");

  useEffect(() => {
    setActiveTab(defaultFlow);
  }, [defaultFlow, open]);

  // Flow A State
  const [tickerQuery, setTickerQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MarketTicker[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<MarketTicker | null>(null);
  const [flowAQuantity, setFlowAQuantity] = useState("");
  const [flowABuyPrice, setFlowABuyPrice] = useState("");
  const [flowACalcMode, setFlowACalcMode] = useState<"NAV" | "TOTAL">("NAV");
  const [flowATotalAmount, setFlowATotalAmount] = useState("");

  // Flow B State
  const [flowBName, setFlowBName] = useState("");
  const [flowBMacroCategoryId, setFlowBMacroCategoryId] = useState("");
  const [flowBEstimatedValue, setFlowBEstimatedValue] = useState("");
  const [flowBOriginalCost, setFlowBOriginalCost] = useState("");
  const [flowBValuationMethod, setFlowBValuationMethod] = useState<"MANUAL" | "AUTO_APPRECIATION">("MANUAL");
  const [flowBAppreciationRate, setFlowBAppreciationRate] = useState("5");
  const [flowBIsInvestable, setFlowBIsInvestable] = useState(true);
  const [flowBAssetClass, setFlowBAssetClass] = useState("REAL_ESTATE");

  // Linked Mortgage/Loan
  const [hasLinkedLiability, setHasLinkedLiability] = useState(false);
  const [liabilityName, setLiabilityName] = useState("");
  const [liabilityDebtAmount, setLiabilityDebtAmount] = useState("");
  const [liabilityInterestRate, setLiabilityInterestRate] = useState("8.5");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [searchingTickers, setSearchingTickers] = useState(false);

  useEffect(() => {
    setErrorMsg("");
  }, [activeTab, open]);

  const formatNumberWithDots = (val: string) => {
    if (!val) return "";
    const clean = val.replace(/\D/g, "");
    if (!clean) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(clean));
  };

  const parseRawNumber = (val: string) => {
    if (!val) return 0;
    const clean = val.replace(/\D/g, "");
    return Number(clean) || 0;
  };

  const parseDecimalQuantity = (val: string) => {
    if (!val) return 0;
    const clean = val.replace(",", ".");
    return parseFloat(clean) || 0;
  };

  // Search effect for Flow A
  useEffect(() => {
    let active = true;
    setSearchingTickers(true);

    fetch(`/api/wealth/tickers?q=${encodeURIComponent(tickerQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.tickers) {
          setSearchResults(data.tickers);
        }
      })
      .catch((err) => console.error("Error fetching tickers:", err))
      .finally(() => {
        if (active) setSearchingTickers(false);
      });

    return () => {
      active = false;
    };
  }, [tickerQuery, open]);

  useEffect(() => {
    if (macroCategories.length > 0) {
      const availableCats = macroCategories
        .filter((cat) => cat.code !== "STOCKS")
        .filter((cat) => !(hasExistingLiquidHolding && cat.code === "LIQUID"));

      if (availableCats.length > 0) {
        setFlowBMacroCategoryId(availableCats[0].id);
      }
    }
  }, [macroCategories, holdings]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
  };

  const handleSelectTicker = (ticker: MarketTicker) => {
    setSelectedTicker(ticker);
    setFlowABuyPrice(formatNumberWithDots(ticker.currentPrice.toString()));
  };

  const handleSubmitFlowA = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const qty = parseDecimalQuantity(flowAQuantity);
    if (!selectedTicker || !flowAQuantity || qty <= 0) {
      setErrorMsg("Vui lòng chọn tài sản thị trường và nhập số lượng lớn hơn 0.");
      return;
    }

    let calculatedBuyPrice = parseRawNumber(flowABuyPrice);
    if (flowACalcMode === "TOTAL") {
      const totalAmt = parseRawNumber(flowATotalAmount);
      if (totalAmt <= 0) {
        setErrorMsg("Vui lòng nhập tổng số tiền mua hợp lệ.");
        return;
      }
      calculatedBuyPrice = totalAmt / qty;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/wealth/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowType: "MARKET_DRIVEN",
          symbolOrTicker: selectedTicker.symbol,
          assetName: selectedTicker.name,
          assetClass: selectedTicker.assetClass,
          quantity: qty,
          buyPrice: calculatedBuyPrice
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSuccess();
      onOpenChange(false);
      resetForms();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi khởi tạo tài sản thị trường");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFlowB = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!flowBName.trim() || !flowBMacroCategoryId || (!flowBOriginalCost && !flowBEstimatedValue)) {
      setErrorMsg("Vui lòng điền tên tài sản, danh mục và giá vốn ban đầu.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/wealth/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowType: "CUSTOM_ILLIQUID",
          assetName: flowBName.trim(),
          macroCategoryId: flowBMacroCategoryId,
          assetClass: flowBAssetClass,
          estimatedValue: parseRawNumber(flowBOriginalCost || flowBEstimatedValue),
          originalCost: parseRawNumber(flowBOriginalCost || flowBEstimatedValue),
          valuationMethod: flowBValuationMethod,
          annualAppreciationRate: Number(flowBAppreciationRate || 0),
          isInvestable: flowBIsInvestable,
          hasLinkedLiability,
          liabilityName: liabilityName || `Vay thế chấp - ${flowBName}`,
          liabilityDebtAmount: parseRawNumber(liabilityDebtAmount),
          liabilityInterestRate: Number(liabilityInterestRate)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSuccess();
      onOpenChange(false);
      resetForms();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi khởi tạo tài sản đặc thù");
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setTickerQuery("");
    setSelectedTicker(null);
    setFlowAQuantity("");
    setFlowABuyPrice("");
    setFlowACalcMode("NAV");
    setFlowATotalAmount("");
    setFlowBName("");
    setFlowBEstimatedValue("");
    setFlowBOriginalCost("");
    setHasLinkedLiability(false);
    setLiabilityDebtAmount("");
    setErrorMsg("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <PlusCircle className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <span>Khai Báo & Thêm Tài Sản Mới</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Hỗ trợ 2 luồng quy trình thiết kế riêng cho Tài sản Niêm Yết Thị Trường và Tài Sản Đặc Thù/Bất Động Sản.
          </DialogDescription>
        </DialogHeader>

        {/* Inline Error Alert Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1 my-1 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="truncate">{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              className="text-xs font-extrabold text-rose-600 hover:text-rose-800 shrink-0 px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-muted rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("MARKET_DRIVEN")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "MARKET_DRIVEN"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-4 w-4 text-sky-500" />
            <span>Luồng A: Tài sản Thị trường (Cổ phiếu, Crypto, Vàng)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CUSTOM_ILLIQUID")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "CUSTOM_ILLIQUID"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4 text-emerald-500" />
            <span>Luồng B: Tài sản Đặc thù & Bất động sản</span>
          </button>
        </div>

        {/* FLOW A FORM */}
        {activeTab === "MARKET_DRIVEN" && (
          <form onSubmit={handleSubmitFlowA} className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-bold">Tìm kiếm Ticker hoặc Tên Tài sản</Label>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>LIVE MARKET API</span>
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Gõ mã Ticker (ví dụ: HPG, BTC, SJC, DCDS, FPT)..."
                  value={tickerQuery}
                  onChange={(e) => setTickerQuery(e.target.value)}
                  className="pl-9 text-xs rounded-xl"
                />
              </div>

              {/* Autocomplete Ticker Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                {searchResults.map((ticker) => {
                  const isSelected = selectedTicker?.symbol === ticker.symbol;
                  return (
                    <button
                      type="button"
                      key={ticker.symbol}
                      onClick={() => handleSelectTicker(ticker)}
                      className={`p-2 rounded-xl text-left border text-xs transition-all flex flex-col justify-between min-h-[72px] cursor-pointer ${
                        isSelected
                          ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold ring-2 ring-sky-500/20"
                          : "border-slate-200 dark:border-slate-800 bg-background hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-sm">{ticker.symbol}</span>
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground font-medium w-full">{ticker.name}</div>
                      <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 mt-1">
                        {ticker.currentPrice.toLocaleString()} VND
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedTicker && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-200 dark:border-sky-900 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <div className="min-w-0 truncate">
                  <span className="font-bold text-sky-700 dark:text-sky-300">Đã chọn: {selectedTicker.symbol}</span>
                  <span className="text-muted-foreground ml-1.5 truncate">({selectedTicker.name})</span>
                </div>
                <div className="font-extrabold text-sky-600 dark:text-sky-400 shrink-0">
                  Giá EOD: {selectedTicker.currentPrice.toLocaleString()} VND
                </div>
              </div>
            )}

            {/* Calculation Method Selector */}
            <div className="space-y-3 pt-2 border-t border-border mt-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phương Thức Khai Báo Giá Vốn
                </Label>
                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl gap-1 text-[11px] font-bold border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setFlowACalcMode("NAV");
                      setFlowATotalAmount("");
                    }}
                    className={`py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                      flowACalcMode === "NAV"
                        ? "bg-sky-500 text-white shadow-xs font-extrabold"
                        : "text-slate-500 dark:text-slate-400 hover:text-foreground"
                    }`}
                  >
                    Nhập Giá / NAV
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFlowACalcMode("TOTAL");
                      setFlowABuyPrice("");
                    }}
                    className={`py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                      flowACalcMode === "TOTAL"
                        ? "bg-sky-500 text-white shadow-xs font-extrabold"
                        : "text-slate-500 dark:text-slate-400 hover:text-foreground"
                    }`}
                  >
                    Nhập Tổng Tiền Mua
                  </button>
                </div>
              </div>

              {flowACalcMode === "NAV" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold block min-h-[16px]">Số Lượng Sở Hữu</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ví dụ: 1000 hoặc 820.5 hoặc 0.05"
                        value={flowAQuantity}
                        onChange={(e) => setFlowAQuantity(e.target.value.replace(",", "."))}
                        className="h-10 text-xs rounded-xl font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold block min-h-[16px]">Giá Vốn Mua / NAV (VND/Đơn vị)</Label>
                      <Input
                        type="text"
                        placeholder="Tự động điền theo giá thị trường hoặc tự nhập"
                        value={flowABuyPrice}
                        onChange={(e) => setFlowABuyPrice(formatNumberWithDots(e.target.value))}
                        className="h-10 text-xs rounded-xl font-bold text-sky-600 dark:text-sky-400"
                        required
                      />
                    </div>
                  </div>

                  {parseDecimalQuantity(flowAQuantity) > 0 && parseRawNumber(flowABuyPrice) > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">💡 Tổng số tiền đầu tư tự động tính:</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatVND(parseDecimalQuantity(flowAQuantity) * parseRawNumber(flowABuyPrice))}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold block min-h-[16px]">Số Lượng Sở Hữu</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ví dụ: 1000 hoặc 820.5 hoặc 0.05"
                        value={flowAQuantity}
                        onChange={(e) => setFlowAQuantity(e.target.value.replace(",", "."))}
                        className="h-10 text-xs rounded-xl font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold block min-h-[16px] text-emerald-600 dark:text-emerald-400">
                        Tổng Số Tiền Mua / Đầu Tư (VND)
                      </Label>
                      <Input
                        type="text"
                        placeholder="Ví dụ: 25.000.000"
                        value={flowATotalAmount}
                        onChange={(e) => setFlowATotalAmount(formatNumberWithDots(e.target.value))}
                        className="h-10 text-xs rounded-xl font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  {parseDecimalQuantity(flowAQuantity) > 0 && parseRawNumber(flowATotalAmount) > 0 && (
                    <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs font-medium flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">💡 Giá Vốn / NAV đơn vị tự động tính:</span>
                      <span className="font-extrabold text-sky-600 dark:text-sky-400 text-sm">
                        {formatVND(parseRawNumber(flowATotalAmount) / parseDecimalQuantity(flowAQuantity))} / đơn vị
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !selectedTicker}
              className="w-full h-11 bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all border-0 cursor-pointer mt-4"
            >
              {loading ? "Đang ghi nhận..." : "Xác Nhận Thêm Tài Sản Thị Trường"}
            </Button>
          </form>
        )}

        {/* FLOW B FORM */}
        {activeTab === "CUSTOM_ILLIQUID" && (
          <form onSubmit={handleSubmitFlowB} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tên Tài Sản Đặc Thù / Bất Động Sản</Label>
                <Input
                  placeholder="Ví dụ: Căn hộ Landmark 81, Xe Mercedes C200, Vốn góp Startup X"
                  value={flowBName}
                  onChange={(e) => setFlowBName(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Cấp Danh Mục Chính</Label>
                <select
                  value={flowBMacroCategoryId}
                  onChange={(e) => setFlowBMacroCategoryId(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  {macroCategories
                    .filter((cat) => cat.code !== "STOCKS")
                    .filter((cat) => !(hasExistingLiquidHolding && cat.code === "LIQUID"))
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Giá Vốn / Giá Trị Ban Đầu (VND)</Label>
              <Input
                type="text"
                placeholder="Ví dụ: 150.000.000"
                value={flowBOriginalCost || flowBEstimatedValue}
                onChange={(e) => {
                  const val = formatNumberWithDots(e.target.value);
                  setFlowBOriginalCost(val);
                  setFlowBEstimatedValue(val);
                }}
                className="h-10 text-xs rounded-xl font-bold text-emerald-600 dark:text-emerald-400"
                required
              />
            </div>

            {/* Valuation Method */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Label className="text-xs font-bold">Phương Pháp Định Giá Hàng Ngày</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFlowBValuationMethod("MANUAL")}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all text-left cursor-pointer ${
                    flowBValuationMethod === "MANUAL"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-slate-200 dark:border-slate-800 bg-background"
                  }`}
                >
                  <div>Chỉnh Sửa Thủ Công</div>
                  <div className="text-[10px] font-normal text-muted-foreground">Chỉ cập nhật khi bạn sửa tay</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFlowBValuationMethod("AUTO_APPRECIATION")}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all text-left cursor-pointer ${
                    flowBValuationMethod === "AUTO_APPRECIATION"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-slate-200 dark:border-slate-800 bg-background"
                  }`}
                >
                  <div>Tự Tăng Giá Theo Năm (%)</div>
                  <div className="text-[10px] font-normal text-muted-foreground">Tự tính tỷ lệ tăng trưởng EOD</div>
                </button>
              </div>

              {flowBValuationMethod === "AUTO_APPRECIATION" && (
                <div className="mt-2 space-y-1">
                  <Label className="text-[11px] font-bold">Tỷ Lệ Tăng Trưởng Hàng Năm Dự Kiến (%)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={flowBAppreciationRate}
                    onChange={(e) => setFlowBAppreciationRate(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Toggle Investable & Asset Class */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Gắn Cờ "Tài Sản Đầu Tư"</div>
                <div className="text-[11px] text-muted-foreground">Tắt nếu đây là tài sản tiêu dùng cá nhân (xe cộ, đồ sưu tầm) không tính vào danh mục đầu tư</div>
              </div>
              <input
                type="checkbox"
                checked={flowBIsInvestable}
                onChange={(e) => setFlowBIsInvestable(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Optional Linked Mortgage/Loan Creation */}
            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    Tạo Khoản Vay Thế Chấp Gắn Kèm
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hasLinkedLiability}
                  onChange={(e) => setHasLinkedLiability(e.target.checked)}
                  className="h-4 w-4 text-rose-600 rounded cursor-pointer"
                />
              </div>

              {hasLinkedLiability && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Số Dư Khoản Vay Thế Chấp (VND)</Label>
                    <Input
                      type="text"
                      placeholder="Ví dụ: 3.000.000.000"
                      value={liabilityDebtAmount}
                      onChange={(e) => setLiabilityDebtAmount(formatNumberWithDots(e.target.value))}
                      className="h-9 text-xs rounded-xl font-bold text-rose-600 dark:text-rose-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Lãi Suất Vay (%/năm)</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="8.5"
                      value={liabilityInterestRate}
                      onChange={(e) => setLiabilityInterestRate(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all border-0 cursor-pointer mt-4"
            >
              {loading ? "Đang khởi tạo..." : "Xác Nhận Thêm Tài Sản Đặc Thù"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
