import { cn } from "@/lib/utils";

export type AlmarkyMarkProps = {
  className?: string;
  variant?: "gradient" | "mono-light" | "mono-dark";
  title?: string;
};

const strokeByVariant: Record<
  NonNullable<AlmarkyMarkProps["variant"]>,
  { primary: string; secondary: string }
> = {
  gradient: {
    primary: "#1f2937",
    secondary: "#111827",
  },
  "mono-light": {
    primary: "#f8fafc",
    secondary: "#f8fafc",
  },
  "mono-dark": {
    primary: "#111827",
    secondary: "#111827",
  },
};

export function AlmarkyMark({
  className,
  variant = "gradient",
  title,
}: AlmarkyMarkProps) {
  const palette = strokeByVariant[variant];
  const labelled = Boolean(title);

  return (
    <svg
      viewBox="0 0 360 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-auto", className)}
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M24 226L172 56"
        stroke={palette.primary}
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M172 56L336 226H120L220 112"
        stroke={palette.secondary}
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

