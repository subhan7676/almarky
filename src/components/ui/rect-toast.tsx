"use client";

type RectToastProps = {
  open: boolean;
  message: string;
  tone?: "success" | "error" | "info";
};

const toneStyles: Record<NonNullable<RectToastProps["tone"]>, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-slate-200 bg-white text-slate-800",
};

export function RectToast({ open, message, tone = "success" }: RectToastProps) {
  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 top-4 z-[90] flex justify-center sm:inset-x-auto sm:right-5 sm:top-5 sm:justify-end">
      <div
        className={`w-full max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg sm:w-auto ${toneStyles[tone]}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
}

