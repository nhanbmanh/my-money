"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-settings-modal"));
    }, 100);
  }, [router]);

  return null;
}
