import type { ProductFormInput } from "@/types/commerce";

export const defaultProductTemplate: ProductFormInput = {
  name: "",
  description: "",
  category: "",
  type: "",
  images: [],
  isVisible: true,
  isHotDeal: false,
  priceMode: "auto",
  originalPrice: 0,
  discountPercent: 0,
  sellingPrice: 0,
  deliveryFee: 0,
  colors: [{ colorName: "Default", colorHex: "#111827", stock: 1 }],
};
