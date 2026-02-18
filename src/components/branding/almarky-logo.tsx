import { cn } from "@/lib/utils";
import { AlmarkyMark } from "@/components/branding/almarky-mark";

export type AlmarkyLogoProps = {
  className?: string;
  showWordmark?: boolean;
  wordmark?: "ALMARKY";
  variant?: "gradient" | "mono-light" | "mono-dark";
  markClassName?: string;
  wordmarkClassName?: string;
};

export function AlmarkyLogo({
  className,
  showWordmark = true,
  wordmark = "ALMARKY",
  variant = "gradient",
  markClassName,
  wordmarkClassName,
}: AlmarkyLogoProps) {
  const textColorClass =
    variant === "mono-light" ? "text-slate-50" : "text-slate-900";

  return (
    <div className={cn("anim-interactive inline-flex items-center gap-2.5", className)}>
      <AlmarkyMark
        variant={variant}
        className={cn("h-8 sm:h-9", markClassName)}
        title="Almarky mark"
      />
      {showWordmark ? (
        <span
          className={cn(
            "font-display text-sm font-black tracking-[0.24em] sm:text-base",
            textColorClass,
            wordmarkClassName,
          )}
        >
          {wordmark}
        </span>
      ) : null}
    </div>
  );
}
