"use client";

import type { ReactNode } from "react";

export function LoginHeroScene({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-[52vh] overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#eef4ff,#f6fbff_38%,#edf2f7)] p-2.5 shadow-sm sm:min-h-[65vh] sm:p-5">
      <div className="pointer-events-none absolute left-[-8%] top-8 size-40 rounded-full bg-sky-300/30 blur-3xl anim-blob-float" />
      <div className="pointer-events-none absolute right-[-6%] top-16 size-44 rounded-full bg-cyan-300/30 blur-3xl anim-blob-float [animation-delay:700ms]" />
      <div className="pointer-events-none absolute left-1/2 top-10 size-52 -translate-x-1/2 rounded-full bg-slate-400/20 blur-3xl anim-blob-float [animation-delay:1100ms]" />

      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute inset-x-6 bottom-10 top-10 rounded-[1.6rem] bg-[radial-gradient(circle_at_22%_34%,rgba(59,130,246,0.18),transparent_48%),radial-gradient(circle_at_78%_36%,rgba(6,182,212,0.16),transparent_48%),linear-gradient(180deg,#e6eefc,#f6fbff_45%,#edf2f7)]" />
        <svg
          viewBox="0 0 360 260"
          className="absolute left-1/2 top-1/2 h-32 w-auto -translate-x-1/2 -translate-y-1/2 opacity-25 sm:h-56"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M24 226L172 56"
            stroke="#0f172a"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M172 56L336 226H120L220 112"
            stroke="#0f172a"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="pointer-events-none absolute left-[16%] top-[52%] hidden h-1 w-[21%] rounded-full bg-slate-300/75 anim-login-handle-left sm:block" />
      <div className="pointer-events-none absolute right-[16%] top-[52%] hidden h-1 w-[21%] rounded-full bg-slate-300/75 anim-login-handle-right sm:block" />

      <div className="pointer-events-none absolute inset-x-10 bottom-8 h-10 rounded-full bg-slate-900/15 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-md px-2 pb-8 pt-12 sm:absolute sm:left-1/2 sm:top-[52%] sm:w-[min(92vw,30rem)] sm:-translate-x-1/2 sm:-translate-y-1/2">
        <div className="anim-login-card">{children}</div>
      </div>
    </div>
  );
}
