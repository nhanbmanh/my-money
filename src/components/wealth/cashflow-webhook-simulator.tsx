"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Webhook,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  RefreshCw
} from "lucide-react";

interface SimulatorProps {
  onSuccess: () => void;
}

export function CashflowWebhookSimulator({ onSuccess }: SimulatorProps) {
  const [eventType, setEventType] = useState<"EXPENSE" | "TRANSFER">("EXPENSE");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [amount, setAmount] = useState("500000");
  const [description, setDescription] = useState("Thanh toán tiền điện thoại qua Webhook");

  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<any>(null);
  const [eventLogs, setEventLogs] = useState<any[]>([]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
  };

  const handleSendWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setResponseResult({ error: "Vui lòng nhập số tiền hợp lệ" });
      return;
    }

    setLoading(true);
    setResponseResult(null);

    const payload = {
      eventType,
      targetAccountId,
      destinationAccountId: eventType === "TRANSFER" ? destinationAccountId : undefined,
      amount: Number(amount),
      description,
      sourceName: "External App Webhook"
    };

    try {
      const res = await fetch("/api/wealth/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setResponseResult(data);

      if (res.ok) {
        setEventLogs((prev) => [
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            payload,
            result: data
          },
          ...prev
        ]);
        onSuccess();
      }
    } catch (err: any) {
      setResponseResult({ error: err.message || "Lỗi khi gọi Webhook API" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Simulator */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Webhook className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <span>Trình Giả Lập Webhook Chi Tiêu & Chuyển Tiền (Engine 1)</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Bắt các sự kiện Webhook từ ứng dụng chi tiêu bên ngoài để tự động cập nhật số dư & ròng gia sản.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSendWebhook} className="space-y-4">
            {/* Event Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Loại Sự Kiện Webhook (Event Type)</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEventType("EXPENSE")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    eventType === "EXPENSE"
                      ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "border-slate-200 dark:border-slate-800 bg-background"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                    <span>1. Event EXPENSE</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-normal mt-1">
                    Trừ số dư Tài khoản Thanh Khoản &rarr; Giảm Net Worth
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEventType("TRANSFER")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    eventType === "TRANSFER"
                      ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                      : "border-slate-200 dark:border-slate-800 bg-background"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="h-4 w-4 text-sky-600" />
                    <span>2. Event TRANSFER</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-normal mt-1">
                    Chuyển giữa các tài khoản &rarr; Net Worth Giữ Nguyên
                  </div>
                </button>
              </div>
            </div>

              <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300">
                <span>Webhook sẽ tự động trừ trực tiếp số dư từ danh mục <strong>Tài Sản Thanh Khoản (Cash)</strong> mà không cần phân loại ví phức tạp.</span>
              </div>

            {/* Amount & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Số Tiền (VND)</Label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Mô Tả Giao Dịch</Label>
                <Input
                  placeholder="Ghi chú chi tiêu..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              <span>{loading ? "Đang gửi Webhook..." : "Bắn Webhook Giả Lập Ngay"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Response Preview & Logs */}
      <div className="space-y-6">
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>Kết Quả Xử Lý API Webhook (Live Response)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {responseResult ? (
              <div className="space-y-3">
                {responseResult.success ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-300 dark:border-emerald-900 text-xs space-y-1">
                    <div className="font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Xử Lý Thành Công Sự Kiện {responseResult.event}!</span>
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-300">
                      Tài khoản tác động: <strong>{responseResult.targetAccountName}</strong>
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-300">
                      Tác động Net Worth:{" "}
                      <strong className={responseResult.netWorthImpact < 0 ? "text-rose-600" : "text-emerald-600"}>
                        {formatVND(responseResult.netWorthImpact)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-300 text-xs text-rose-600 font-bold">
                    {responseResult.error}
                  </div>
                )}

                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
                  {JSON.stringify(responseResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-muted-foreground font-medium">
                Vui lòng bấm nút "Bắn Webhook Giả Lập Ngay" ở bảng bên trái để kiểm thử phản hồi JSON!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Activity History */}
        {eventLogs.length > 0 && (
          <Card className="border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-wider">
                Lịch Sử Sự Kiện Webhook Đã Bắn ({eventLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {eventLogs.map((log) => (
                  <div key={log.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sky-600">{log.payload.eventType}</span>
                      <span className="text-muted-foreground ml-2">({log.payload.description})</span>
                    </div>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200">
                      {formatVND(log.payload.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
