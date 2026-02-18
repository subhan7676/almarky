"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

const HIDE_CLASS = "hide-nextjs-devtools";

export function DevtoolsVisibilityGate() {
  const { isAdmin } = useAuth();
  const pathname = usePathname();
  const showOnlyInAdminPanel = isAdmin && pathname.startsWith("/admin");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const html = document.documentElement;
    const body = document.body;
    if (!html || !body) return;

    const applyHiddenState = (hidden: boolean) => {
      if (hidden) {
        html.classList.add(HIDE_CLASS);
        body.classList.add(HIDE_CLASS);
        return;
      }
      html.classList.remove(HIDE_CLASS);
      body.classList.remove(HIDE_CLASS);
    };

    applyHiddenState(!showOnlyInAdminPanel);

    return () => {
      applyHiddenState(true);
    };
  }, [showOnlyInAdminPanel]);

  return null;
}
