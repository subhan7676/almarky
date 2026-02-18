"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { RequireAuth } from "@/components/auth/require-auth";
import { AdminPanelNav } from "@/app/admin/panel/components/admin-panel-nav";
import { AlmarkyLogo } from "@/components/branding/almarky-logo";

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <RequireAuth adminOnly>
      <section className="space-y-3 sm:space-y-4">
        <header className="anim-hero-gradient rounded-2xl border border-slate-700/20 bg-[linear-gradient(135deg,#0f172a,#1f2937)] p-4 text-white shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
                Admin Control
              </p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">Control Center</h1>
              <p className="mt-1 text-xs text-slate-300">{user?.email}</p>
            </div>
            <AlmarkyLogo variant="mono-light" />
          </div>
        </header>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[240px_1fr]">
          <AdminPanelNav />
          <div className="anim-page-enter">{children}</div>
        </div>
      </section>
    </RequireAuth>
  );
}
