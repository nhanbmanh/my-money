"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, User, Mail, Lock, Landmark, Sparkles, ArrowRight, AlertCircle, ShieldCheck, Eye, EyeOff, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

import { PageKeyGuard } from "@/components/page-key-guard";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    gender: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [bod, setBod] = useState<Date | undefined>(undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.username.trim()) {
      setError("Vui lòng nhập tên người dùng.");
      return;
    }

    const emailTrimmed = form.email.trim();
    if (!emailTrimmed) {
      setError("Vui lòng nhập địa chỉ email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setError("Địa chỉ email không hợp lệ. Vui lòng nhập đúng định dạng (ví dụ: name@example.com).");
      return;
    }

    if (!form.password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    if (form.password.length < 8) {
      setError("Mật khẩu phải chứa ít nhất 8 ký tự.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        email: emailTrimmed,
        username: form.username.trim(),
        bod: bod ? bod.toISOString() : undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Đăng ký không thành công. Vui lòng kiểm tra lại.");
      setLoading(false);
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(emailTrimmed)}`);
    router.refresh();
  };

  return (
    <PageKeyGuard>
      <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden px-4 py-12">
        {/* Background Decorative Ambient Glows */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

        {/* Main Glassmorphism Card Container */}
        <div className="relative w-full max-w-md backdrop-blur-2xl bg-slate-900/80 border border-slate-800/90 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 hover:border-slate-700/80">
          
          {/* Top Gradient Banner Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-sky-500 to-blue-600" />

          <div className="p-8 sm:p-10 space-y-6">
            
            {/* Header & Logo */}
            <div className="text-center space-y-2.5">
              <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-sky-500/10 to-blue-500/20 border border-emerald-500/30 text-emerald-400 shadow-inner mb-1">
                <Landmark className="h-8 w-8 text-emerald-400" />
              </div>
              
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                  <span>MyNOTE</span>
                  <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
                </h1>
                <p className="text-xs text-emerald-400 font-extrabold tracking-wide uppercase mt-0.5">
                  Note my life
                </p>
                <p className="text-xs text-slate-400 mt-1.5 font-medium italic">
                  “Tích lũy mỗi ngày — Tự do tài chính trong tầm tay”
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              
              {/* Username Input */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-bold text-slate-300">
                  Tên người dùng
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="pl-10 h-11 text-xs bg-slate-950/60 border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl placeholder:text-slate-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-10 h-11 text-xs bg-slate-950/60 border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl placeholder:text-slate-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-slate-300">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-10 pr-10 h-11 text-xs bg-slate-950/60 border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl placeholder:text-slate-500 font-medium"
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

              {/* Birthday & Gender Row */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Ngày sinh</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-11 justify-start text-left text-xs bg-slate-950/60 border-slate-800 text-slate-100 rounded-xl font-medium px-3.5",
                          !bod && "text-slate-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
                        {bod ? format(bod, "dd/MM/yyyy") : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
                      <Calendar
                        mode="single"
                        selected={bod}
                        onSelect={setBod}
                        captionLayout="dropdown"
                        startMonth={new Date(1940, 0)}
                        endMonth={new Date()}
                        className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-xs font-bold text-slate-300">Giới tính</Label>
                  <Select
                    value={form.gender || undefined}
                    onValueChange={(value) => setForm({ ...form, gender: value })}
                  >
                    <SelectTrigger id="gender" className="w-full !h-11 text-xs bg-slate-950/60 border-slate-800 text-slate-100 rounded-xl font-medium px-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
                        <SelectValue placeholder="Chọn" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl z-[200] p-1 rounded-xl">
                      <SelectItem value="male" className="cursor-pointer text-slate-100 text-xs py-2 px-3 rounded-lg focus:bg-slate-100 focus:text-slate-950 focus:font-bold hover:bg-slate-100 hover:text-slate-950 transition-colors">Nam</SelectItem>
                      <SelectItem value="female" className="cursor-pointer text-slate-100 text-xs py-2 px-3 rounded-lg focus:bg-slate-100 focus:text-slate-950 focus:font-bold hover:bg-slate-100 hover:text-slate-950 transition-colors">Nữ</SelectItem>
                      <SelectItem value="other" className="cursor-pointer text-slate-100 text-xs py-2 px-3 rounded-lg focus:bg-slate-100 focus:text-slate-950 focus:font-bold hover:bg-slate-100 hover:text-slate-950 transition-colors">Khác</SelectItem>
                    </SelectContent>
                  </Select>
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
                className="w-full h-11 text-xs font-bold gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer border-0 mt-2"
              >
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>Đang xử lý đăng ký...</span>
                  </>
                ) : (
                  <>
                    <span>Tiếp tục (Xác nhận OTP)</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Switch to Login link */}
              <div className="pt-2 text-center border-t border-slate-800/80">
                <p className="text-xs text-slate-400">
                  Đã có tài khoản?{" "}
                  <a
                    href="/login"
                    className="font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors"
                  >
                    Đăng nhập ngay
                  </a>
                </p>
              </div>
            </form>

            {/* Footer Badges */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 font-semibold pt-1">
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                <span>Xác thực OTP Email</span>
              </div>
              <span>•</span>
              <div>Mã hóa chuẩn SSL</div>
            </div>

          </div>
        </div>
      </div>
    </PageKeyGuard>
  );
}
