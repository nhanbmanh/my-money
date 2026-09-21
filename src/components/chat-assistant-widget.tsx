"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Send,
  X,
  Sparkles,
  RefreshCw,
  Wallet,
  NotebookPen,
  CalendarDays,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Mode = "AUTO" | "CASHFLOW" | "NOTE" | "CALENDAR";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  intent?: "CASHFLOW" | "NOTE" | "CALENDAR" | "UNKNOWN";
  previewOnly?: boolean;
  parsedData?: any;
  isConfirmed?: boolean;
  isCancelled?: boolean;
  createdData?: any;
  timestamp: Date;
  isInitialWelcome?: boolean;
}

export function ChatAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode>("AUTO");

  const initialWelcomeMessage: Message = {
    id: "welcome-1",
    sender: "assistant",
    text: "👋 Chào bạn! Tôi là **Trợ Lý AI MyNOTE**.\nBạn có thể nhắn tin bằng tiếng Việt tự nhiên (VD: *Chi 50k phở TPBank*, *Thu 15tr lương VCB*, *Ghi chú: Mã wifi...*) hoặc chọn thao tác bên dưới:",
    timestamp: new Date(),
    isInitialWelcome: true,
  };

  const [messages, setMessages] = useState<Message[]>([initialWelcomeMessage]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const selectMode = (mode: Mode) => {
    setActiveMode(mode);
    let confirmText = "";
    if (mode === "CASHFLOW") {
      confirmText = "✅ **Đã chọn chế độ: 💸 Khai báo giao dịch Thu/Chi**\nHãy nhập khoản chi hoặc thu nhập (VD: *Chi 50k ăn phở TPBank*, *Thu 15tr lương VCB*)...";
    } else if (mode === "NOTE") {
      confirmText = "✅ **Đã chọn chế độ: 📝 Tạo Ghi chú**\nHãy nhập nội dung ghi chú (VD: *Mật khẩu wifi là 123456*, *Mã số thuế...*)...";
    } else if (mode === "CALENDAR") {
      confirmText = "✅ **Đã chọn chế độ: 📅 Tạo Lịch công việc**\nHãy nhập lịch hẹn hoặc công việc (VD: *Mai 14h họp team*, *20/9 đi khám*)...";
    } else {
      confirmText = "🔄 **Đã chuyển sang chế độ Tự Động (AUTO)**.\nAI sẽ tự phát hiện ý định tin nhắn của bạn.";
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "assistant",
        text: confirmText,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend || inputMessage).trim();
    if (!rawText || loading) return;

    if (rawText === "1" || rawText === "1." || rawText.toLowerCase() === "thu chi" || rawText.toLowerCase().includes("khai báo thu chi")) {
      if (!textToSend) setInputMessage("");
      selectMode("CASHFLOW");
      return;
    }
    if (rawText === "2" || rawText === "2." || rawText.toLowerCase() === "ghi chú" || rawText.toLowerCase().includes("tạo ghi chú")) {
      if (!textToSend) setInputMessage("");
      selectMode("NOTE");
      return;
    }
    if (rawText === "3" || rawText === "3." || rawText.toLowerCase() === "lịch việc" || rawText.toLowerCase().includes("tạo lịch")) {
      if (!textToSend) setInputMessage("");
      selectMode("CALENDAR");
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: rawText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: rawText, selectedIntent: activeMode }),
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: data.replyText || "✅ Đã phân tích xong câu lệnh!",
          intent: data.intent,
          previewOnly: data.previewOnly,
          parsedData: data.parsedData,
          createdData: data.createdData,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "assistant",
            text: "⚠️ Xin lỗi, có lỗi xảy ra khi xử lý câu lệnh của bạn!",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("Chat assistant error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: "⚠️ Đã xảy ra lỗi kết nối. Vui lòng kiểm tra lại mạng!",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async (msgId: string, parsedData: any) => {
    setLoading(true);

    try {
      const res = await fetch("/api/chat/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmSave: true, pendingData: parsedData }),
      });

      if (res.ok) {
        const data = await res.json();

        // Mark message as confirmed
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, isConfirmed: true } : m))
        );

        // Append confirmation response bubble
        const confirmMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: data.replyText || "✅ Đã lưu vào cơ sở dữ liệu thành công!",
          intent: data.intent,
          createdData: data.createdData,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, confirmMsg]);

        // Refresh dashboard views
        if (data.intent === "CASHFLOW") {
          window.dispatchEvent(new CustomEvent("refresh-cashflows"));
        } else if (data.intent === "NOTE") {
          window.dispatchEvent(new CustomEvent("refresh-notes"));
        } else if (data.intent === "CALENDAR") {
          window.dispatchEvent(new CustomEvent("refresh-calendar"));
        }
      } else {
        alert("⚠️ Không thể lưu dữ liệu. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error("Confirm save error:", err);
      alert("⚠️ Đã xảy ra lỗi kết nối mạng!");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSave = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isCancelled: true } : m))
    );

    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "❌ **Đã hủy bỏ bản ghi.** Bạn có thể nhập lại câu lệnh khác.",
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const SUGGESTIONS_MAP: Record<Mode, string[]> = {
    AUTO: ["Chi 45k phở TPBank", "Thu 15tr lương VCB", "Pass wifi 123456", "Mai 14h họp team"],
    CASHFLOW: ["Chi 45k phở TPBank", "Thu 15tr tiền lương VCB", "Chi 200k tiền điện Momo", "Thu 500k tiền thưởng"],
    NOTE: ["Mật khẩu wifi là 123456", "Mã số thuế 0109876543", "Tài khoản VCB: 1012345678"],
    CALENDAR: ["Mai 14h họp team", "20/9 đi khám sức khỏe", "Chiều nay 17h đón con", "25/12 sinh nhật"],
  };

  const getPlaceholder = () => {
    switch (activeMode) {
      case "CASHFLOW":
        return "Nhập thu/chi (VD: Chi 50k phở VCB)...";
      case "NOTE":
        return "Nhập ghi chú (VD: Pass wifi 123456...)...";
      case "CALENDAR":
        return "Nhập lịch việc (VD: Mai 14h họp team...)...";
      default:
        return "Nhập câu lệnh bất kỳ...";
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <div className="fixed bottom-5 right-5 z-[100]">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className="h-13 w-13 rounded-full bg-gradient-to-tr from-sky-500 via-indigo-600 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white shadow-2xl shadow-sky-500/40 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center p-0 relative border-2 border-white/20 cursor-pointer"
            title="Mở Trợ Lý AI Chat"
          >
            <Sparkles className="h-6 w-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>
          </Button>
        )}
      </div>

      {/* Floating Chat Widget Panel */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-[100] w-[380px] max-w-[calc(100vw-32px)] h-[540px] max-h-[calc(100vh-80px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-3.5 px-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
                  Trợ Lý AI MyNOTE
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-sky-100/80 font-medium">Xác nhận thông tin trước khi lưu</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveMode("AUTO");
                  setMessages([initialWelcomeMessage]);
                }}
                className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-sky-100 hover:text-white cursor-pointer"
                title="Làm mới trò chuyện"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-sky-100 hover:text-white cursor-pointer"
                title="Đóng chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                    msg.sender === "user"
                      ? "bg-sky-600 text-white rounded-tr-xs"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}
                  </p>

                  {/* Initial Option Action Buttons */}
                  {msg.isInitialWelcome && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 dark:border-slate-700/80 pt-2.5">
                      <button
                        onClick={() => selectMode("CASHFLOW")}
                        className="w-full p-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-left transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Wallet className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-emerald-800 dark:text-emerald-300 text-[11.5px]">
                              1. Khai báo Thu / Chi
                            </p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              Ghi nhận chi tiêu, tiền lương...
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        onClick={() => selectMode("NOTE")}
                        className="w-full p-2 px-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-left transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-purple-500 text-white flex items-center justify-center shrink-0">
                            <NotebookPen className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-purple-800 dark:text-purple-300 text-[11.5px]">
                              2. Tạo Ghi chú
                            </p>
                            <p className="text-[10px] text-purple-600 dark:text-purple-400">
                              Lưu mật khẩu, tài khoản...
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        onClick={() => selectMode("CALENDAR")}
                        className="w-full p-2 px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-left transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0">
                            <CalendarDays className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-indigo-800 dark:text-indigo-300 text-[11.5px]">
                              3. Tạo Lịch công việc
                            </p>
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400">
                              Lịch họp, lịch hẹn ngày giờ...
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  )}

                  {/* PREVIEW CONFIRMATION ACTION BUTTONS */}
                  {msg.previewOnly && !msg.isConfirmed && !msg.isCancelled && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <button
                        onClick={() => handleConfirmSave(msg.id, msg.parsedData)}
                        disabled={loading}
                        className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {loading ? "Đang lưu..." : "Lưu"}
                      </button>

                      <button
                        onClick={() => handleCancelSave(msg.id)}
                        disabled={loading}
                        className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  )}

                  {msg.isConfirmed && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Đã xác nhận và lưu vào hệ thống</span>
                    </div>
                  )}

                  {msg.isCancelled && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700 text-[10.5px] font-bold text-slate-400 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-rose-400" />
                      <span>Đã hủy bỏ câu lệnh này</span>
                    </div>
                  )}

                  {/* Created Data Preview Badge */}
                  {msg.createdData && msg.intent === "CASHFLOW" && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                        {msg.createdData.cashType === "Expense" ? (
                          <ArrowDownCircle className="h-3.5 w-3.5 text-rose-500" />
                        ) : (
                          <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </div>
                      <span className="font-mono font-bold">
                        {msg.createdData.amountOfMoney?.toLocaleString("vi-VN")} đ
                      </span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">
                        {msg.createdData.sourceName}
                      </span>
                    </div>
                  )}

                  {msg.createdData && msg.intent === "NOTE" && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-[11px] font-semibold text-purple-600 dark:text-purple-300">
                      <NotebookPen className="h-3.5 w-3.5 text-purple-500" />
                      <span>{msg.createdData.title}</span>
                    </div>
                  )}

                  {msg.createdData && msg.intent === "CALENDAR" && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                      <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{msg.createdData.title}</span>
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-slate-400 px-1 pt-0.5">
                  {msg.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 italic text-[11px] p-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-500" />
                <span>Trợ lý AI đang suy nghĩ...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>



          {/* Input Bar */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={loading}
              className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 focus-visible:ring-sky-500"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputMessage.trim()}
              className="h-10 w-10 p-0 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shrink-0 cursor-pointer shadow-md shadow-sky-500/20"
              title="Gửi"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
