"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Mail,
  Calendar,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  NotebookPen,
  CalendarDays,
  Landmark,
  KeyRound,
  UserCheck,
  Save,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  bod?: string | null;
  gender?: string | null;
  emailVerified: boolean;
  createdAt: string;
  stats: {
    cashFlowCount: number;
    noteCount: number;
    calendarCount: number;
    holdingCount: number;
    sourceCount: number;
  };
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"INFO" | "SECURITY">("INFO");

  // Info Form State
  const [username, setUsername] = useState("");
  const [bod, setBod] = useState("");
  const [gender, setGender] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data: UserProfile = await res.json();
        setProfile(data);
        setUsername(data.username || "");
        setBod(data.bod ? new Date(data.bod).toISOString().split("T")[0] : "");
        setGender(data.gender || "MALE");
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Save Info
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMessage(null);

    if (!username.trim() || username.trim().length < 2) {
      setInfoMessage({ type: "error", text: "Tên người dùng phải có ít nhất 2 ký tự" });
      return;
    }

    try {
      setSavingInfo(true);
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          bod: bod || null,
          gender: gender || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setInfoMessage({ type: "success", text: "Cập nhật thông tin cá nhân thành công!" });
        setProfile((prev) => (prev ? { ...prev, username, bod, gender } : null));
        // Update session name if present
        if (updateSession) {
          await updateSession({ name: username.trim(), user: { name: username.trim() } });
        }
      } else {
        setInfoMessage({ type: "error", text: data.error || "Không thể cập nhật thông tin" });
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setInfoMessage({ type: "error", text: "Lỗi kết nối máy chủ" });
    } finally {
      setSavingInfo(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: "error", text: "Vui lòng nhập mật khẩu hiện tại" });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Mật khẩu mới và mật khẩu xác nhận không khớp" });
      return;
    }

    try {
      setChangingPassword(true);
      const res = await fetch("/api/user/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordMessage({ type: "success", text: "Đổi mật khẩu thành công!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage({ type: "error", text: data.error || "Không thể đổi mật khẩu" });
      }
    } catch (err) {
      console.error("Error changing password:", err);
      setPasswordMessage({ type: "error", text: "Lỗi kết nối máy chủ" });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="w-full flex-1 p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Đang tải thông tin cá nhân...</p>
      </div>
    );
  }

  const initialLetter = (profile?.username || session?.user?.name || "U")[0].toUpperCase();
  const dateJoinedFormatted = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner / Avatar Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Badge */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 text-4xl font-extrabold text-white shadow-inner">
            {initialLetter}
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 border-2 border-white text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          {/* User Basic Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile?.username}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-0.5 text-xs font-semibold text-sky-100 border border-white/20">
                <UserCheck className="h-3.5 w-3.5 text-emerald-300" />
                Tài khoản chính
              </span>
            </div>

            <p className="text-sm text-sky-100/90 font-medium flex items-center justify-center sm:justify-start gap-2">
              <Mail className="h-4 w-4 text-sky-200" />
              {profile?.email}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-sky-200/80 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Tham gia: {dateJoinedFormatted}
              </span>
              <span className="flex items-center gap-1.5">
                {profile?.emailVerified ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Email đã xác thực
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-300" /> Email chưa xác thực
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Overview Grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/15">
          <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-sky-200 text-xs font-semibold mb-1">
              <Wallet className="h-4 w-4 text-sky-300" />
              Giao Dịch
            </div>
            <p className="text-xl font-bold text-white">{profile?.stats.cashFlowCount || 0}</p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-purple-200 text-xs font-semibold mb-1">
              <NotebookPen className="h-4 w-4 text-purple-300" />
              Ghi Chú
            </div>
            <p className="text-xl font-bold text-white">{profile?.stats.noteCount || 0}</p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-indigo-200 text-xs font-semibold mb-1">
              <CalendarDays className="h-4 w-4 text-indigo-300" />
              Lịch Hẹn
            </div>
            <p className="text-xl font-bold text-white">{profile?.stats.calendarCount || 0}</p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-200 text-xs font-semibold mb-1">
              <Landmark className="h-4 w-4 text-emerald-300" />
              Hồ Sơ Tài Sản
            </div>
            <p className="text-xl font-bold text-white">{(profile?.stats.holdingCount || 0) + (profile?.stats.sourceCount || 0)}</p>
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("INFO")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer",
            activeTab === "INFO"
              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <User className="h-4 w-4" />
          Thông Tin Cá Nhân
        </button>

        <button
          onClick={() => setActiveTab("SECURITY")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer",
            activeTab === "SECURITY"
              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <KeyRound className="h-4 w-4" />
          Bảo Mật & Mật Khẩu
        </button>
      </div>

      {/* Tab 1: Personal Info Form */}
      {activeTab === "INFO" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <User className="h-5 w-5 text-sky-500" />
              Chỉnh sửa thông tin tài khoản
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cập nhật biệt danh hiển thị, ngày sinh và giới tính của bạn.
            </p>
          </div>

          {infoMessage && (
            <div
              className={cn(
                "p-3.5 rounded-xl text-sm flex items-center gap-2.5 font-medium border",
                infoMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              )}
            >
              {infoMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              {infoMessage.text}
            </div>
          )}

          <form onSubmit={handleSaveInfo} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tên người dùng (Username) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập tên hiển thị"
                    className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Địa chỉ Email</label>
                <div className="relative">
                  <Input
                    value={profile?.email || ""}
                    disabled
                    className="pl-9 bg-slate-100 dark:bg-slate-800/60 text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400 italic">Email đăng nhập không thể thay đổi trực tiếp.</p>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ngày sinh</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={bod}
                    onChange={(e) => setBod(e.target.value)}
                    className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Giới tính</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác / Khai báo sau</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={savingInfo} className="gap-2 bg-sky-600 hover:bg-sky-700 text-white">
                {savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu Thay Đổi
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Change Password Form */}
      {activeTab === "SECURITY" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-sky-500" />
              Đổi mật khẩu tài khoản
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hãy nhập mật khẩu hiện tại để xác minh danh tính trước khi thiết lập mật khẩu mới.
            </p>
          </div>

          {passwordMessage && (
            <div
              className={cn(
                "p-3.5 rounded-xl text-sm flex items-center gap-2.5 font-medium border",
                passwordMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              )}
            >
              {passwordMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mật khẩu hiện tại <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={changingPassword} className="gap-2 bg-sky-600 hover:bg-sky-700 text-white w-full sm:w-auto">
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Cập Nhật Mật Khẩu
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
