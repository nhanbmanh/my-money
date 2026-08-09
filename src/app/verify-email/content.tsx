"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { KeyRound, Mail, Sparkles, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const { t, language } = useLanguage();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || (language === "vi" ? "Mã xác thực không chính xác hoặc đã hết hạn." : "Invalid or expired OTP code."));
      return;
    }
    router.push("/login");
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setResending(true);
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setResending(false);
    if (!res.ok) {
      setError(data.error || (language === "vi" ? "Không thể gửi lại mã OTP. Vui lòng thử lại sau." : "Failed to resend OTP code. Please try again."));
      return;
    }
    setInfo(language === "vi" ? "Mã OTP mới đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư!" : "New OTP code sent to your email. Please check your inbox!");
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden px-4 py-12">
      {/* Ambient Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Card */}
      <div className="relative w-full max-w-md backdrop-blur-2xl bg-slate-900/80 border border-slate-800/90 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 hover:border-slate-700/80">
        
        {/* Top Banner Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-sky-500 to-emerald-400" />

        <div className="p-8 sm:p-10 space-y-7">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-tr from-purple-500/20 via-sky-500/10 to-emerald-500/20 border border-purple-500/30 text-purple-400 shadow-inner mb-1">
              <KeyRound className="h-8 w-8 text-purple-400" />
            </div>
            
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                <span>MyNOTE</span>
                <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
              </h1>
              <p className="text-xs text-purple-400 font-extrabold tracking-wide uppercase mt-0.5">
                Note my life
              </p>
              <p className="text-xs text-slate-400 mt-1.5 font-medium italic">
                {language === "vi" ? "“Bảo mật tài khoản — An tâm ghi chép mỗi ngày”" : "“Account Security — Safe daily tracking”"}
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 rounded-full bg-slate-950/80 border border-slate-800 text-sky-400 font-bold text-xs">
                <Mail className="h-3.5 w-3.5" />
                <span>{email || "your-email@example.com"}</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-6">
            
            {/* OTP Inputs */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setError("");
                }}
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="w-11 h-12 text-base font-bold bg-slate-950/70 border-slate-700 text-slate-100 rounded-xl" />
                  <InputOTPSlot index={1} className="w-11 h-12 text-base font-bold bg-slate-950/70 border-slate-700 text-slate-100 rounded-xl" />
                  <InputOTPSlot index={2} className="w-11 h-12 text-base font-bold bg-slate-950/70 border-slate-700 text-slate-100 rounded-xl" />
                  <InputOTPSlot index={3} className="w-11 h-12 text-base font-bold bg-slate-950/70 border-slate-700 text-slate-100 rounded-xl" />
                  <InputOTPSlot index={4} className="w-11 h-12 text-base font-bold bg-slate-950/70 border-slate-700 text-slate-100 rounded-xl" />
                  <InputOTPSlot index={5} className="w-11 h-12 text-base font-bold bg-slate-950/70 border-slate-700 text-slate-100 rounded-xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Error or Info Banners */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {info && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{info}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full h-11 text-xs font-bold gap-2 bg-gradient-to-r from-purple-600 via-sky-600 to-emerald-500 hover:from-purple-700 hover:to-emerald-600 text-white rounded-xl shadow-lg shadow-purple-500/20 transition-all cursor-pointer border-0 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>{t("common.loading")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{language === "vi" ? "Xác nhận & Hoàn tất" : "Verify & Complete"}</span>
                </>
              )}
            </Button>

            {/* Resend OTP Button */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              <a
                href="/login"
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t("auth.btnLogin")}</span>
              </a>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
                <span>{resending ? (language === "vi" ? "Đang gửi..." : "Sending...") : (language === "vi" ? "Gửi lại mã OTP" : "Resend OTP")}</span>
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
