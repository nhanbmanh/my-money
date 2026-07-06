"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { PlusCircle, LogOut, User, Menu, X } from "lucide-react";

interface HeaderProps {
  onOpenModal: () => void;
}

export function Header({ onOpenModal }: HeaderProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-sky-50 border-b border-gray-200 shadow-sm px-6 py-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <h1 className="text-xl font-bold text-sky-700">Tiền của tao đâu</h1>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          <Button onClick={onOpenModal} className="gap-2" size="sm">
            <PlusCircle className="h-4 w-4" />
            Khai báo thu chi
          </Button>
          <a
            href="/profile"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="h-4 w-4" />
            <span>
              Xin chào, <strong>{session?.user?.name}</strong>
            </span>
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-sky-100 transition-colors"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown — position absolute, slide from top */}
      <div
        className={[
          "md:hidden absolute left-0 right-0 z-50",
          "bg-sky-50 border-b border-gray-200 shadow-md px-6",
          "overflow-hidden transition-all duration-300 ease-in-out",
          menuOpen ? "max-h-60 py-3 opacity-100" : "max-h-0 py-0 opacity-0",
        ].join(" ")}
        style={{ top: "100%" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-2">
          <a
            href="/profile"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-1 py-1 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            <User className="h-4 w-4" />
            <span>
              Xin chào, <strong>{session?.user?.name}</strong>
            </span>
          </a>

          <Button
            onClick={() => {
              onOpenModal();
              setMenuOpen(false);
            }}
            className="gap-2 w-full justify-start"
            size="sm"
          >
            <PlusCircle className="h-4 w-4" />
            Khai báo thu chi
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="gap-2 w-full justify-start text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </div>
    </header>
  );
}
