"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BRAND_NAME,
  ADMIN_ENTRY_SESSION_KEY,
  ADMIN_PANEL_SECRET_TAPS,
} from "@/lib/constants";
import { AlmarkyLogo } from "@/components/branding/almarky-logo";

export function SiteFooter() {
  const [tapCount, setTapCount] = useState(0);
  const router = useRouter();
  const timeoutRef = useRef<number | undefined>(undefined);

  const handleAdminTap = () => {
    const nextCount = tapCount + 1;
    setTapCount(nextCount);

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setTapCount(0), 1600);

    if (nextCount >= ADMIN_PANEL_SECRET_TAPS) {
      setTapCount(0);
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(ADMIN_ENTRY_SESSION_KEY, "1");
        } catch {
          // Ignore storage issues and continue navigation.
        }
      }
      router.push("/admin/login");
    }
  };

  return (
    <footer className="mt-10 border-t border-slate-300/70 bg-[linear-gradient(180deg,#f7f9fc,#eef2f7)] pb-24 md:pb-0">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:px-8">
        <div className="anim-page-enter flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <AlmarkyLogo className="anim-interactive" variant="mono-dark" />
            <p className="max-w-2xl">
              COD marketplace for Pakistan with up-to-date inventory, clear order
              status, and professional admin controls.
            </p>
          </div>
          <nav className="anim-list-stagger grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 sm:text-sm">
            <Link
              href="/about-us"
              className="anim-interactive rounded-lg px-2 py-1 hover:bg-slate-200/60"
            >
              About Us
            </Link>
            <Link
              href="/contact-us"
              className="anim-interactive rounded-lg px-2 py-1 hover:bg-slate-200/60"
            >
              Contact Us
            </Link>
            <Link
              href="/privacy-policy"
              className="anim-interactive rounded-lg px-2 py-1 hover:bg-slate-200/60"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="anim-interactive rounded-lg px-2 py-1 hover:bg-slate-200/60"
            >
              Terms of Service
            </Link>
          </nav>
          <button
            type="button"
            onClick={handleAdminTap}
            className="w-fit cursor-default select-none px-1 py-1 text-xs text-slate-400"
            aria-label="Footer text"
          >
            @2026 {BRAND_NAME}
          </button>
        </div>
      </div>
    </footer>
  );
}
