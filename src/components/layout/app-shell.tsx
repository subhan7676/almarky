import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { RouteTransition } from "@/components/animations/route-transition";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SupportFab } from "@/components/layout/support-fab";
import { DeviceDealNotifier } from "@/components/notifications/device-deal-notifier";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[radial-gradient(circle_at_top,_#dbe5f3,_#f8fafc_42%,_#e7edf5_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] overflow-hidden">
        <div className="absolute -left-10 top-10 size-44 rounded-full bg-cyan-300/40 blur-3xl anim-blob-float" />
        <div className="absolute right-0 top-24 size-56 rounded-full bg-blue-400/25 blur-3xl anim-blob-float [animation-delay:1200ms]" />
        <div className="absolute left-1/2 top-4 size-48 -translate-x-1/2 rounded-full bg-slate-400/25 blur-3xl anim-blob-float [animation-delay:600ms]" />
      </div>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 pb-24 pt-3 sm:px-6 sm:pt-6 md:pb-6 lg:px-8">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <SiteFooter />
      <MobileBottomNav />
      <SupportFab />
      <DeviceDealNotifier />
    </div>
  );
}
