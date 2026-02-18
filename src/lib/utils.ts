import { clsx } from "clsx";
import { CURRENCY, PHONE_PK_REGEX } from "@/lib/constants";
import type { DateLike } from "@/types/commerce";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

const pkrFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export function formatPKR(amount: number) {
  return pkrFormatter.format(amount);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function toDate(value: DateLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if ("toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  return null;
}

export function computeSellingPrice(
  originalPrice: number,
  discountPercent: number,
) {
  const safeOriginal = Number.isFinite(originalPrice) ? originalPrice : 0;
  const safeDiscount = Number.isFinite(discountPercent) ? discountPercent : 0;
  const discountRatio = Math.max(0, Math.min(100, safeDiscount)) / 100;
  return Math.round(safeOriginal * (1 - discountRatio));
}

export function buildCartItemId(productId: string, colorName: string) {
  const normalizedColor = slugify(colorName);
  return `${productId}_${normalizedColor}`;
}

export function isValidPakistaniPhone(value: string) {
  return PHONE_PK_REGEX.test(value.trim());
}

export function generateOrderNumber() {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 900 + 100);
  return `ALM-${stamp}-${random}`;
}

export function optimizeImageUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
  },
) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) {
    return url;
  }
  const [base, rest] = url.split("/image/upload/");
  if (!base || !rest) return url;
  const transforms = [
    "f_auto",
    "q_auto",
    options?.width ? `w_${Math.max(1, Math.floor(options.width))}` : "",
    options?.height ? `h_${Math.max(1, Math.floor(options.height))}` : "",
    options?.width && options?.height ? "c_fill" : "",
  ]
    .filter(Boolean)
    .join(",");
  return `${base}/image/upload/${transforms}/${rest.replace(/^\/+/, "")}`;
}
