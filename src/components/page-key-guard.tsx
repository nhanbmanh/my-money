"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Landmark, KeyRound, Lock, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight, AlertCircle } from "lucide-react";

interface PageKeyGuardProps {
  children: React.ReactNode;
}

export function PageKeyGuard({ children }: PageKeyGuardProps) {
  const [checking, setChecking] = useState(true);
  const [isRequired, setIsRequired] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [inputKey, setInputKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkKeyRequirement = async () => {
      try {
        // Check if cookie page_key_verified is already true
        const hasVerifiedCookie = document.cookie
          .split("; ")
          .some((row) => row.startsWith("page_key_verified=true"));

        const res = await fetch("/api/auth/verify-key-page");
        const data = await res.json();

        if (data.isRequired) {
          setIsRequired(true);
          if (hasVerifiedCookie) {
            setUnlocked(true);
          } else {
            setUnlocked(false);
          }
        } else {
          setIsRequired(false);
          setUnlocked(true);
        }
      } catch (err) {
        console.error("Error checking KEY_PAGE requirement:", err);
        setUnlocked(true);
      } finally {
        setChecking(false);
      }
    };

    checkKeyRequirement();
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/verify-key-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: inputKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Mã truy cập trang không chính xác!");
        return;
      }

      setUnlocked(true);
    } catch (err: any) {
      setErrorMsg("Lỗi kết nối khi xác thực mã truy cập trang!");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 text-slate-100">
        <Spinner className="h-8 w-8 text-sky-500" />
      </div>
    );
  }

  if (isRequired && !unlocked) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden px-4 py-12">
        {/* Background Ambient Glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[160px] pointer-events-none" />

        {/* Main Card */}
        <div className="relative w-full max-w-md backdrop-blur-2xl bg-slate-900/80 border border-slate-800/90 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300">
          
          {/* Top Gradient Banner Accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-400" />

          <div className="p-8 sm:p-10 space-y-7">
            
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 via-blue-500/10 to-emerald-500/20 border border-sky-500/30 text-sky-400 shadow-inner mb-1">
                <KeyRound className="h-8 w-8 text-sky-400" />
              </div>
              
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                  <span>Mã Truy Cập Trang</span>
                  <Sparkles className="h-4 w-4 text-sky-400 animate-pulse" />
                </h1>
                <p className="text-xs text-sky-400 font-extrabold tracking-wide uppercase mt-0.5">
                  MyNOTE Protected Gate
                </p>
                <p className="text-xs text-slate-400 mt-2 font-medium italic">
                  “Vui lòng nhập Mã Truy Cập (KEY_PAGE) để vào trang Đăng Nhập & Đăng Ký”
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleUnlock} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Mã Truy Cập (KEY_PAGE)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="Nhập mã truy cập..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="pl-10 pr-10 h-11 text-xs bg-slate-950/60 border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-100 rounded-xl placeholder:text-slate-500 font-medium"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !inputKey.trim()}
                className="w-full h-11 text-xs font-bold gap-2 bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white rounded-xl shadow-lg shadow-sky-500/20 transition-all border-0 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>Đang kiểm tra mã...</span>
                  </>
                ) : (
                  <>
                    <span>Mở Khóa Trang</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-semibold pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Bảo vệ riêng tư riêng với KEY_PAGE</span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
