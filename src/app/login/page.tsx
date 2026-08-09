"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Landmark, Lock, Mail, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { PageKeyGuard } from "@/components/page-key-guard";

export default function LoginPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailTrimmed = form.email.trim();
    if (!emailTrimmed) {
      setError(language === "vi" ? "Vui lòng nhập địa chỉ email." : "Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setError(language === "vi" ? "Địa chỉ email không hợp lệ (ví dụ: name@example.com)." : "Invalid email format (e.g. name@example.com).");
      return;
    }

    if (!form.password) {
      setError(language === "vi" ? "Vui lòng nhập mật khẩu." : "Please enter your password.");
      return;
    }

    setLoading(true);

    const res = await signIn("credentials", {
      email: emailTrimmed,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res?.error === "EMAIL_NOT_VERIFIED") {
        setError(language === "vi" ? "Email chưa được xác thực. Vui lòng kiểm tra hộp thư để nhận mã OTP." : "Email not verified. Please check your inbox for OTP.");
      } else {
        setError(language === "vi" ? "Email hoặc mật khẩu không đúng. Vui lòng thử lại." : "Invalid email or password. Please try again.");
      }
      return;
    }

    const defaultRoute = localStorage.getItem("default_app_route") || "/financial-management";
    router.push(defaultRoute);
    router.refresh();
  };

  return (
    <PageKeyGuard>
      <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden px-4 py-12">
        {/* Background Decorative Ambient Glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none" />

        {/* Main Glassmorphism Card Container */}
        <div className="relative w-full max-w-md backdrop-blur-2xl bg-slate-900/80 border border-slate-800/90 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 hover:border-slate-700/80">
          
          {/* Top Gradient Banner Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-400" />

          <div className="p-8 sm:p-10 space-y-7">
            
            {/* Header & Logo */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 via-blue-500/10 to-emerald-500/20 border border-sky-500/30 text-sky-400 shadow-inner mb-1">
                <Landmark className="h-8 w-8 text-sky-400" />
              </div>
              
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                  <span>MyNOTE</span>
                  <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                </h1>
                <p className="text-xs text-sky-400 font-extrabold tracking-wide uppercase mt-0.5">
                  Note my life
                </p>
                <p className="text-xs text-slate-400 mt-1.5 font-medium italic">
                  {language === "vi" ? "“Ghi chép từng dòng tiền, an tâm quản trị gia sản cuộc sống”" : "“Track your cashflows, manage your wealth with peace of mind”"}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-300">
                  {t("auth.emailLabel")}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-10 h-11 text-xs bg-slate-950/60 border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-100 rounded-xl placeholder:text-slate-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold text-slate-300">
                    {t("auth.passwordLabel")}
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-10 pr-10 h-11 text-xs bg-slate-950/60 border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-100 rounded-xl placeholder:text-slate-500 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-xs font-bold gap-2 bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer border-0"
              >
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>{t("common.loading")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("auth.btnLogin")}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Switch to Register link */}
              <div className="pt-2 text-center border-t border-slate-800/80">
                <p className="text-xs text-slate-400">
                  {t("auth.noAccount")}{" "}
                  <a
                    href="/register"
                    className="font-bold text-sky-400 hover:text-sky-300 underline underline-offset-4 transition-colors"
                  >
                    {t("auth.btnRegister")}
                  </a>
                </p>
              </div>
            </form>

            {/* Footer Badges */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 font-semibold pt-1">
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>256-bit SSL Security</span>
              </div>
              <span>•</span>
              <div>Realtime Valuation</div>
            </div>

          </div>
        </div>
      </div>
    </PageKeyGuard>
  );
}
