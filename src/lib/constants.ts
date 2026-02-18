export const BRAND_NAME = "Almarky";
export const CUSTOMER_SUPPORT_EMAIL = "almarkycustomerservice@gmail.com";

export const ADMIN_PANEL_SECRET_TAPS = 5;
export const ADMIN_ENTRY_SESSION_KEY = "almarky_admin_entry_v1";

export const CURRENCY = "PKR";

export const PAKISTAN_PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Gilgit-Baltistan",
  "Azad Jammu and Kashmir",
] as const;

export const DEFAULT_IMAGE_FALLBACK =
  "/globe.svg";

export const PHONE_PK_REGEX = /^((\+92)|(0))3[0-9]{9}$/;

export const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  received: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};
