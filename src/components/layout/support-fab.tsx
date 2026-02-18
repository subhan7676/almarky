"use client";

import Link from "next/link";
import { Headset } from "lucide-react";

export function SupportFab() {
  return (
    <Link
      href="/contact-us"
      className="anim-support-fab fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.6)] backdrop-blur-sm hover:bg-slate-100 md:bottom-6 md:right-6 md:px-3 md:py-2 md:text-sm"
      aria-label="Contact support"
      title="Contact support"
    >
      <Headset className="size-4" />
      Support
    </Link>
  );
}
