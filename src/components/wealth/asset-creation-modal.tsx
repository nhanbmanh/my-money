"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarketTicker, BASE_POPULAR_TICKERS } from "@/lib/market-ticker-service";
import {
  getCategoryConfig,
  AssetCategoryType,
} from "@/lib/asset-category-types";
import {
  Search,
  CheckCircle2,
  Wallet,
  TrendingUp,
  Building2,
  Landmark,
  HandCoins,
  Percent,
  PlusCircle,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  selectedCategoryType?: AssetCategoryType;
  onSuccess: () => void;
}

export function AssetCreationModal({
  open,
  onOpenChange,
  selectedCategoryType = 0,
  onSuccess,
}: ModalProps) {
  const [categoryType, setCategoryType] = useState<AssetCategoryType>(selectedCategoryType);

  useEffect(() => {
    setCategoryType(selectedCategoryType);
  }, [selectedCategoryType, open]);

  const catConfig = getCategoryConfig(categoryType);

  // Form State
  const [amount, setAmount] = useState(""); // Shared amount / value input
  const [assetName, setAssetName] = useState("");

  // Type 1 Growth state
  const [growthSubTab, setGrowthSubTab] = useState<"MARKET" | "GOLD">("MARKET");
  const [selectedUnit, setSelectedUnit] = useState<string>("Chỉ");
  const [tickerQuery, setTickerQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MarketTicker[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<MarketTicker | null>(null);
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [calcMode, setCalcMode] = useState<"NAV" | "TOTAL">("NAV");
  const [totalAmount, setTotalAmount] = useState("");
  const [searchingTickers, setSearchingTickers] = useState(false);

  // Type 2 Physical state
  const [valuationMethod, setValuationMethod] = useState<"MANUAL" | "AUTO_APPRECIATION">("MANUAL");
  const [appreciationRate, setAppreciationRate] = useState("5");
  const [isInvestable, setIsInvestable] = useState(true);

  // Type 3 & 4 Debt & Lending state
  const [interestRate, setInterestRate] = useState("8.5");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Secondary Notification Modal State for Liquid Asset adjustment
  const [showLiquidNoticeModal, setShowLiquidNoticeModal] = useState(false);
  const [liquidNoticeDetails, setLiquidNoticeDetails] = useState<{
    action: "DEDUCT" | "ADD";
    amount: number;
    titleText: string;
  } | null>(null);
  const [adjustingLiquid, setAdjustingLiquid] = useState(false);

  useEffect(() => {
    setErrorMsg("");
    setAmount("");
    setAssetName("");
    setTickerQuery("");
    setSelectedTicker(null);
    setQuantity("");
    setBuyPrice("");
    setCalcMode("NAV");
    setTotalAmount("");
    setGrowthSubTab("MARKET");
    setSelectedUnit("Cổ phiếu");
  }, [categoryType, open]);

  const formatNumberWithDots = (val: string | number) => {
    if (!val && val !== 0) return "";
    if (typeof val === "number") {
      if (isNaN(val)) return "";
      return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(val));
    }
    const clean = val.replace(/\D/g, "");
    if (!clean) return "";
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(clean));
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

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Search tickers for Type 1
  useEffect(() => {
    if (categoryType !== 1) return;
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
  }, [tickerQuery, categoryType, open]);

  const handleSelectTicker = (ticker: MarketTicker) => {
    setSelectedTicker(ticker);
    setAssetName(ticker.name);
    if (ticker.defaultUnit) {
      setSelectedUnit(ticker.defaultUnit);
    } else if (ticker.assetClass === "GOLD") {
      setSelectedUnit("Chỉ");
    } else if (ticker.assetClass === "CRYPTO") {
      setSelectedUnit("Coin");
    } else if (ticker.assetClass === "CCQ") {
      setSelectedUnit("CCQ");
    } else {
      setSelectedUnit("Cổ phiếu");
    }
    if (ticker.currentPrice > 0) {
      setBuyPrice(formatNumberWithDots(ticker.currentPrice));
    }
  };

  // Standard conversion ratios relative to Chỉ (1 Chỉ = 3.75g = 0.1 Lượng)
  const getUnitFactorInChỉ = (unit: string): number => {
    switch (unit) {
      case "Lượng":
        return 10;
      case "Chỉ":
        return 1;
      case "Ounce":
        return 8.2942;
      case "Gram":
        return 1 / 3.75; // 0.2666667
      case "Kg":
        return 1000 / 3.75; // 266.66667
      default:
        return 1;
    }
  };

  const handleUnitChange = (newUnit: string) => {
    const oldUnit = selectedUnit;
    if (oldUnit === newUnit) return;

    setSelectedUnit(newUnit);

    if (growthSubTab === "GOLD") {
      const oldFactor = getUnitFactorInChỉ(oldUnit);
      const newFactor = getUnitFactorInChỉ(newUnit);
      const ratio = oldFactor / newFactor;

      // 1. Convert Unit Price (buyPrice)
      const rawBuyPrice = parseRawNumber(buyPrice);
      if (rawBuyPrice > 0) {
        const newBuyPrice = Math.round(rawBuyPrice / ratio);
        setBuyPrice(formatNumberWithDots(newBuyPrice));
      }

      // 2. Convert Quantity (quantity)
      const rawQty = parseDecimalQuantity(quantity);
      if (rawQty > 0) {
        const newQty = rawQty * ratio;
        const formattedQty = Number(newQty.toFixed(4)).toString();
        setQuantity(formattedQty);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      let payload: any = { categoryType };

      // Type 0: Liquid Asset
      if (categoryType === 0) {
        const val = parseRawNumber(amount);
        if (val <= 0) {
          setErrorMsg("Vui lòng nhập giá trị tài sản thanh khoản hợp lệ.");
          setLoading(false);
          return;
        }
        payload.estimatedCurrentValue = val;
      }

      // Type 1: Growth Asset
      if (categoryType === 1) {
        const qtyNum = parseDecimalQuantity(quantity);
        const ticker = selectedTicker?.symbol || tickerQuery.trim();

        if (!ticker || qtyNum <= 0) {
          setErrorMsg("Vui lòng nhập ticker và số lượng sở hữu hợp lệ.");
          setLoading(false);
          return;
        }

        let calculatedPrice = parseRawNumber(buyPrice);
        if (calcMode === "TOTAL") {
          const totAmt = parseRawNumber(totalAmount);
          if (totAmt <= 0) {
            setErrorMsg("Vui lòng nhập tổng số tiền mua hợp lệ.");
            setLoading(false);
            return;
          }
          calculatedPrice = totAmt / qtyNum;
        } else {
          if (calculatedPrice <= 0) {
            setErrorMsg("Vui lòng nhập giá mua / NAV hợp lệ.");
            setLoading(false);
            return;
          }
        }

        payload.symbolOrTicker = ticker;
        payload.assetName = assetName || `Tài sản ${ticker}`;
        payload.assetClass = growthSubTab === "GOLD" ? "GOLD" : (selectedTicker?.assetClass || "STOCKS");
        payload.quantity = qtyNum;
        payload.buyPrice = calculatedPrice;
        payload.unit = selectedUnit || (growthSubTab === "GOLD" ? "Chỉ" : "Cổ phiếu");
      }

      // Type 2: Physical Asset
      if (categoryType === 2) {
        const val = parseRawNumber(amount);
        if (!assetName.trim() || val <= 0) {
          setErrorMsg("Vui lòng nhập tên tài sản và giá trị hợp lệ.");
          setLoading(false);
          return;
        }
        payload.assetName = assetName.trim();
        payload.estimatedCurrentValue = val;
        payload.valuationMethod = valuationMethod;
        payload.appreciationRate = parseRawNumber(appreciationRate);
        payload.isInvestable = isInvestable;
      }

      // Type 3: Debt / Mortgage Asset
      if (categoryType === 3) {
        const debt = parseRawNumber(amount);
        if (!assetName.trim() || debt <= 0) {
          setErrorMsg("Vui lòng nhập tên tài sản và khoản vay hợp lệ.");
          setLoading(false);
          return;
        }
        payload.assetName = assetName.trim();
        payload.debtAmount = debt;
        payload.interestRate = parseFloat(interestRate) || 0;
      }

      // Type 4: Lending Asset
      if (categoryType === 4) {
        const val = parseRawNumber(amount);
        if (!assetName.trim() || val <= 0) {
          setErrorMsg("Vui lòng nhập tên tài sản và giá trị cho vay hợp lệ.");
          setLoading(false);
          return;
        }
        payload.assetName = assetName.trim();
        payload.estimatedCurrentValue = val;
        payload.interestRate = parseFloat(interestRate) || 0;
      }

      const res = await fetch("/api/wealth/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      setLoading(false);

      if (!res.ok) {
        setErrorMsg(resData.error || "Không thể khởi tạo tài sản.");
        return;
      }

      // Check if liquid asset notice modal needs to be triggered (for Type 1, 2, 3, 4)
      const txValue = resData.transactionValue || resData.addedValue || 0;

      if (categoryType !== 0 && txValue > 0) {
        const action: "DEDUCT" | "ADD" = categoryType === 3 ? "ADD" : "DEDUCT";
        setLiquidNoticeDetails({
          action,
          amount: txValue,
          titleText:
            action === "ADD"
              ? `Cộng ${formatVND(txValue)} vào tài sản thanh khoản`
              : `Trừ ${formatVND(txValue)} vào tài sản thanh khoản`,
        });
        setShowLiquidNoticeModal(true);
      } else {
        onSuccess();
        onOpenChange(false);
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || "Lỗi máy chủ.");
    }
  };

  const handleConfirmLiquidAdjustment = async () => {
    if (!liquidNoticeDetails) return;
    setAdjustingLiquid(true);

    try {
      await fetch("/api/wealth/liquid-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: liquidNoticeDetails.action,
          amount: liquidNoticeDetails.amount,
        }),
      });
    } catch (e) {
      console.error("Error adjusting liquid asset:", e);
    } finally {
      setAdjustingLiquid(false);
      setShowLiquidNoticeModal(false);
      setLiquidNoticeDetails(null);
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleSkipLiquidAdjustment = () => {
    setShowLiquidNoticeModal(false);
    setLiquidNoticeDetails(null);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showLiquidNoticeModal} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl">
          <DialogHeader className="p-6 pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <span>Khai Báo Tài Sản Mới</span>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                  {catConfig.name}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* TYPE 0: TÀI SẢN THANH KHOẢN */}
            {categoryType === 0 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 text-xs text-sky-700 dark:text-sky-300 space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-sky-500" />
                    Tài sản thanh khoản cố định
                  </div>
                  <p>
                    Tài sản thanh khoản được khởi tạo với tên mặc định <strong>"Tài sản thanh khoản"</strong> và tự động tính vào Danh mục đầu tư. Mỗi lần nhập thêm, số dư mới sẽ tự động cộng dồn vào tài sản hiện có.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Giá trị tài sản bổ sung (VND) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(formatNumberWithDots(e.target.value))}
                      className="h-10 text-sm font-bold text-right pr-8 bg-slate-50 dark:bg-slate-800 rounded-xl"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">₫</span>
                  </div>
                  {amount && (
                    <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 text-right">
                      {formatVND(parseRawNumber(amount))}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TYPE 1: TÀI SẢN TĂNG TRƯỞNG (Market Driven Flow A + Gold & Precious Metals) */}
            {categoryType === 1 && (
              <div className="space-y-4">
                {/* Sub-Tab Selector: Market vs Gold */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setGrowthSubTab("MARKET");
                      setSelectedTicker(null);
                      setTickerQuery("");
                      setSelectedUnit("Cổ phiếu");
                    }}
                    className={cn(
                      "py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      growthSubTab === "MARKET"
                        ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs"
                        : "text-slate-500 hover:text-foreground"
                    )}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Chứng Khoán / Crypto / CCQ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGrowthSubTab("GOLD");
                      setSelectedTicker(null);
                      setTickerQuery("GOLD");
                      setSelectedUnit("Chỉ");
                    }}
                    className={cn(
                      "py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      growthSubTab === "GOLD"
                        ? "bg-amber-500 text-white font-extrabold shadow-xs"
                        : "text-slate-500 hover:text-foreground"
                    )}
                  >
                    <span>🪙 Vàng & Kim Loại Quý</span>
                  </button>
                </div>

                {/* World Rate Note Banner for Gold */}
                {growthSubTab === "GOLD" && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-start gap-2">
                    <Globe className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>Lưu ý nguồn giá:</strong> Tỷ giá niêm yết & biến động % của Vàng & Kim loại quý được cập nhật realtime theo sàn hàng hóa thế giới (thitruonghanghoa.com & SJC), quy đổi theo tỷ giá USD/VND.
                    </div>
                  </div>
                )}

                {/* Search Ticker Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {growthSubTab === "GOLD" ? "Chọn Sản Phẩm Vàng & Kim Loại Quý" : "Tìm kiếm Ticker hoặc Tên Tài sản"}
                    </Label>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{growthSubTab === "GOLD" ? "LIVE GOLD FEED" : "LIVE MARKET API"}</span>
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder={growthSubTab === "GOLD" ? "Tìm Vàng SJC, PNJ, Doji, Vàng nhẫn 9999, XAU/USD..." : "Gõ mã Ticker (ví dụ: HPG, BTC, SJC, DCDS, FPT)..."}
                      value={tickerQuery}
                      onChange={(e) => {
                        setTickerQuery(e.target.value);
                        if (!e.target.value) setSelectedTicker(null);
                      }}
                      className="h-10 pl-9 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl"
                    />
                  </div>

                  {/* Ticker Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60">
                    {(searchResults.length > 0
                      ? (growthSubTab === "GOLD" ? searchResults.filter((t) => t.assetClass === "GOLD") : searchResults)
                      : BASE_POPULAR_TICKERS.filter((t) => growthSubTab === "GOLD" ? t.assetClass === "GOLD" : t.assetClass !== "GOLD").slice(0, 8)
                    ).map((t) => {
                      const isSelected = selectedTicker?.symbol === t.symbol;
                      return (
                        <button
                          key={t.symbol}
                          type="button"
                          onClick={() => handleSelectTicker(t)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-[80px]",
                            isSelected
                              ? "border-sky-500 bg-sky-500/10 dark:bg-sky-950/40 shadow-xs"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-sky-500/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-slate-900 dark:text-slate-100">{t.symbol}</span>
                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />}
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 truncate">{t.name}</span>
                          
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="font-extrabold text-[11px] text-sky-500 dark:text-sky-400">
                              {formatVND(t.currentPrice)}
                            </span>
                            {t.change24h !== undefined && (
                              <span
                                className={cn(
                                  "text-[9px] font-black px-1.5 py-0.2 rounded-md flex items-center gap-0.5 shrink-0",
                                  t.change24h >= 0
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                )}
                              >
                                {t.change24h >= 0 ? "+" : ""}{t.change24h.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Measurement Unit Selector (Đơn Vị Tính) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Đơn Vị Đo Lường Số Lượng
                  </Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(growthSubTab === "GOLD"
                      ? ["Chỉ", "Lượng", "Ounce", "Gram", "Kg"]
                      : ["Cổ phiếu", "Coin", "CCQ", "Đơn vị"]
                    ).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => handleUnitChange(u)}
                        className={cn(
                          "px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                          selectedUnit === u
                            ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Ticker Preview */}
                {selectedTicker && (
                  <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {selectedTicker.symbol} - {selectedTicker.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {(() => {
                          const tickerBaseUnit = selectedTicker.defaultUnit || (selectedTicker.assetClass === "GOLD" ? "Chỉ" : "Cổ phiếu");
                          const basePriceInChỉ = selectedTicker.currentPrice / getUnitFactorInChỉ(tickerBaseUnit);
                          const currentUnitMarketPrice = Math.round(basePriceInChỉ * getUnitFactorInChỉ(selectedUnit));
                          return (
                            <span>Giá thị trường: <strong>{formatVND(currentUnitMarketPrice)}</strong> / {selectedUnit}</span>
                          );
                        })()}
                        {selectedTicker.change24h !== undefined && (
                          <span
                            className={cn(
                              "text-[10px] font-extrabold px-1.5 py-0.2 rounded-md",
                              selectedTicker.change24h >= 0
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {selectedTicker.change24h >= 0 ? "+" : ""}{selectedTicker.change24h.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTicker(null)}
                      className="text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    >
                      Đổi sản phẩm
                    </Button>
                  </div>
                )}

                {/* Calculation Mode & Inputs */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Phương Thức Khai Báo Giá Vốn
                    </Label>
                    <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setCalcMode("NAV");
                          setTotalAmount("");
                        }}
                        className={cn(
                          "py-1 px-3 rounded-lg transition-all cursor-pointer text-xs",
                          calcMode === "NAV"
                            ? "bg-sky-500 text-white font-extrabold shadow-xs"
                            : "text-slate-500 dark:text-slate-400 hover:text-foreground"
                        )}
                      >
                        Nhập Giá / NAV
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCalcMode("TOTAL");
                          setBuyPrice("");
                        }}
                        className={cn(
                          "py-1 px-3 rounded-lg transition-all cursor-pointer text-xs",
                          calcMode === "TOTAL"
                            ? "bg-sky-500 text-white font-extrabold shadow-xs"
                            : "text-slate-500 dark:text-slate-400 hover:text-foreground"
                        )}
                      >
                        Nhập Tổng Tiền Mua
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Số Lượng Sở Hữu ({selectedUnit})
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={growthSubTab === "GOLD" ? `Ví dụ: 5 ${selectedUnit} hoặc 1.5` : "Ví dụ: 1000 hoặc 820.5 hoặc 0."}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value.replace(",", "."))}
                        className="h-10 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl"
                        required
                      />
                    </div>

                    {calcMode === "NAV" ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Giá Vốn Mua (VND / 1 {selectedUnit})
                        </Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder={growthSubTab === "GOLD" ? "Điền theo giá trên hóa đơn / thực tế" : "Tự động điền theo giá thị trường"}
                          value={buyPrice}
                          onChange={(e) => setBuyPrice(formatNumberWithDots(e.target.value))}
                          className="h-10 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Tổng Số Tiền Mua Ban Đầu (VND)
                        </Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="Ví dụ: 39.000.000"
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(formatNumberWithDots(e.target.value))}
                          className="h-10 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {calcMode === "NAV" && parseDecimalQuantity(quantity) > 0 && parseRawNumber(buyPrice) > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">💡 Tổng số tiền đầu tư tự động tính:</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatVND(parseDecimalQuantity(quantity) * parseRawNumber(buyPrice))}
                      </span>
                    </div>
                  )}

                  {calcMode === "TOTAL" && parseDecimalQuantity(quantity) > 0 && parseRawNumber(totalAmount) > 0 && (
                    <div className="p-3 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">💡 Giá vốn 1 {selectedUnit} tự động tính:</span>
                      <span className="font-extrabold text-sky-600 dark:text-sky-400">
                        {formatVND(parseRawNumber(totalAmount) / parseDecimalQuantity(quantity))} / {selectedUnit}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TYPE 2: TÀI SẢN VẬT CHẤT */}
            {categoryType === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Tên tài sản vật chất <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="VD: Căn hộ Vinhomes, Xe Mazda CX-5, Vàng miếng..."
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="h-10 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Giá trị tài sản (VND) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(formatNumberWithDots(e.target.value))}
                      className="h-10 text-sm font-bold text-right pr-8 bg-slate-50 dark:bg-slate-800 rounded-xl"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">₫</span>
                  </div>
                  {amount && (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                      {formatVND(parseRawNumber(amount))}
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Phương pháp định giá hàng ngày
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setValuationMethod("MANUAL")}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                        valuationMethod === "MANUAL"
                          ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      )}
                    >
                      <span>Chỉnh sửa thủ công</span>
                      <span className="text-[10px] font-normal opacity-80">Cập nhật giá khi cần</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValuationMethod("AUTO_APPRECIATION")}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                        valuationMethod === "AUTO_APPRECIATION"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      )}
                    >
                      <span>Tự động tăng trưởng (%)</span>
                      <span className="text-[10px] font-normal opacity-80">Tự cộng % theo năm</span>
                    </button>
                  </div>
                </div>

                {valuationMethod === "AUTO_APPRECIATION" && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5 text-emerald-500" />
                      Tỷ lệ tăng trưởng dự kiến (%/năm)
                    </Label>
                    <Input
                      type="text"
                      placeholder="5"
                      value={appreciationRate}
                      onChange={(e) => setAppreciationRate(e.target.value)}
                      className="h-9 text-xs font-bold rounded-lg"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isInvestablePhysical"
                    checked={isInvestable}
                    onChange={(e) => setIsInvestable(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <Label htmlFor="isInvestablePhysical" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    Gắn cờ "Tài sản đầu tư" (Tính vào danh mục đầu tư)
                  </Label>
                </div>
              </div>
            )}

            {/* TYPE 3: TÀI SẢN THẾ CHẤP - NỢ */}
            {categoryType === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Tên khoản nợ / Tài sản thế chấp <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="VD: Vay mua nhà Shinhan Bank, Vay mua xe VPBank..."
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="h-10 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Khoản vay (VND) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(formatNumberWithDots(e.target.value))}
                      className="h-10 text-sm font-bold text-right pr-8 bg-slate-50 dark:bg-slate-800 rounded-xl"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">₫</span>
                  </div>
                  {amount && (
                    <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 text-right">
                      {formatVND(parseRawNumber(amount))}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Lãi suất vay (%/năm)
                  </Label>
                  <Input
                    type="text"
                    placeholder="8.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="h-10 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* TYPE 4: TÀI SẢN CHO VAY */}
            {categoryType === 4 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Tên tài sản cho vay / Tiền gửi <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="VD: Cho Anh A vay cá nhân, Tiền gửi tiết kiệm VCB..."
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="h-10 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Giá trị cho vay / Tiền gửi (VND) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(formatNumberWithDots(e.target.value))}
                      className="h-10 text-sm font-bold text-right pr-8 bg-slate-50 dark:bg-slate-800 rounded-xl"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">₫</span>
                  </div>
                  {amount && (
                    <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 text-right">
                      {formatVND(parseRawNumber(amount))}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Lãi suất (%/năm)
                  </Label>
                  <Input
                    type="text"
                    placeholder="6.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="h-10 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs rounded-xl"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl gap-1.5"
              >
                {loading ? "Đang xử lý..." : "Thêm Tài Sản"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SECONDARY NOTIFICATION MODAL FOR LIQUID ASSET ADJUSTMENT */}
      <Dialog open={showLiquidNoticeModal} onOpenChange={setShowLiquidNoticeModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span>Biến Động Tài Sản Thanh Khoản</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">
              Tài sản thanh khoản có biến động mới. Vui lòng lựa chọn hành động thích hợp:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-3">
            {liquidNoticeDetails && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
                Lượng tiền biến động:{" "}
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {formatVND(liquidNoticeDetails.amount)}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipLiquidAdjustment}
                className="w-full text-xs font-semibold text-slate-700 dark:text-slate-300 justify-start h-11 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                1. Tôi sẽ khai báo thu chi sau
              </Button>

              <Button
                type="button"
                disabled={adjustingLiquid}
                onClick={handleConfirmLiquidAdjustment}
                className="w-full text-xs font-bold text-white justify-start h-11 rounded-2xl bg-sky-600 hover:bg-sky-700"
              >
                2. {liquidNoticeDetails?.titleText}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
