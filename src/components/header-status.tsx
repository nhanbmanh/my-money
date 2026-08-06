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
    <span className="text-xs sm:text-sm text-muted-foreground leading-6 truncate min-w-0">
      Xin chào,{" "}
      <strong className="text-foreground">{session?.user?.name}</strong>
      <span className="hidden sm:inline">
        <span> · </span>
        Bây giờ là{" "}
        <strong>
          {timeLabel} · {dateLabel}
        </strong>
      </span>
    </span>
  );
}
