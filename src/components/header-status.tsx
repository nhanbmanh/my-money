"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function HeaderStatus() {
  const { data: session } = useSession();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const timeLabel = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateLabel = now.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center text-xs text-muted-foreground leading-tight sm:leading-snug min-w-0">
      <span className="truncate">
        Xin chào, <strong className="text-foreground">{session?.user?.name}</strong>
      </span>
      <span className="hidden sm:inline mx-1 text-slate-400">·</span>
      <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
        Bây giờ là{" "}
        <strong className="text-foreground font-semibold">
          {timeLabel} · {dateLabel}
        </strong>
      </span>
    </div>
  );
}
