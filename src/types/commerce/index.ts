export type PriceMode = "auto" | "manual";

export type OrderStatus = "pending" | "delivered" | "cancelled";
export type LocalOrderReceiptStatus = "pending" | "received";

export type TimestampLike = {
  toDate: () => Date;
};

export type DateLike = Date | TimestampLike | number | string | null | undefined;

export interface ProductColor {
  colorName: string;
  colorHex: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  type: string;
  images: string[];
  isVisible: boolean;
  isDeleted: boolean;
  isHotDeal?: boolean;
  priceMode: PriceMode;
  originalPrice: number;
  discountPercent: number;
  sellingPrice: number;
  deliveryFee: number;
  colors: ProductColor[];
  totalStock: number;
  createdBy: string;
  hotDealNotifiedAt?: DateLike;
  createdAt?: Date | TimestampLike | null;
  updatedAt?: Date | TimestampLike | null;
}

export interface ProductSnapshot {
  name: string;
  slug: string;
  image: string;
  type: string;
  sellingPrice: number;
  originalPrice: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productSnapshot: ProductSnapshot;
  colorName: string;
  quantity: number;
  selectedForCheckout: boolean;
  unitPrice: number;
  deliveryFee: number;
  updatedAt?: Date | TimestampLike | null;
}

export interface LocalCartItem {
  id: string;
  productId: string;
  productSnapshot: ProductSnapshot;
  colorName: string;
  quantity: number;
  selectedForCheckout: boolean;
  unitPrice: number;
  deliveryFee: number;
  updatedAt: number;
}

export interface CheckoutCartSelection {
  productId: string;
  colorName: string;
  quantity: number;
  productName?: string;
  productSlug?: string;
  productImage?: string;
  unitPrice?: number;
  deliveryFee?: number;
  productSnapshot?: ProductSnapshot;
}

export interface OrderItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  color: string;
  quantity: number;
  unitPrice: number;
  deliveryFee: number;
  lineTotal: number;
}

export interface CustomerDetails {
  fullName: string;
  phonePk: string;
  province: string;
  city: string;
  tehsil: string;
  district: string;
  houseAddress: string;
  shopName?: string;
}

export interface LocalProfileSettings {
  preferredLanguage: "English" | "Urdu";
  appNotifications: boolean;
  deviceNotifications: boolean;
  smsUpdates: boolean;
  marketingOptIn: boolean;
}

export interface LocalProfileData extends CustomerDetails {
  displayName: string;
  email: string;
  settings: LocalProfileSettings;
}

export interface OrderPricing {
  subtotal: number;
  deliveryTotal: number;
  grandTotal: number;
}

export interface Order {
  id: string;
  uid: string;
  orderNumber: string;
  items: OrderItem[];
  pricing: OrderPricing;
  customerDetails: CustomerDetails;
  status: OrderStatus;
  orderSheetId?: string;
  orderSheetUrl?: string;
  createdAt?: DateLike;
  updatedAt?: DateLike;
}

export interface ProductFormInput {
  name: string;
  description: string;
  category: string;
  type: string;
  images: string[];
  isVisible: boolean;
  isHotDeal: boolean;
  priceMode: PriceMode;
  originalPrice: number;
  discountPercent: number;
  sellingPrice: number;
  deliveryFee: number;
  colors: ProductColor[];
}

export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  lastLoginAt?: Date | TimestampLike | null;
}

export interface AdminSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  storeNotice: string;
  maintenanceMode: boolean;
  updatedBy: string;
  updatedAt?: Date | TimestampLike | null;
}

export interface AdminSettingsInput {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  storeNotice: string;
  maintenanceMode: boolean;
}

export type ContactMessageStatus =
  | "received"
  | "emailed"
  | "email_failed"
  | "resolved";

export interface ContactMessage {
  id: string;
  fullName: string;
  email: string;
  phonePk: string;
  subject: string;
  message: string;
  to: string;
  status: ContactMessageStatus;
  source: string;
  failureReason?: string;
  replyText?: string;
  repliedBy?: string;
  repliedAt?: DateLike;
  createdAt?: DateLike;
  updatedAt?: DateLike;
}

export type NotificationKind = "deal" | "update" | "reply";

export interface Notification {
  id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  isActive: boolean;
  linkUrl?: string;
  createdBy: string;
  createdAt?: DateLike;
  updatedAt?: DateLike;
}

export interface NotificationFormInput {
  title: string;
  body: string;
  kind: NotificationKind;
  isActive: boolean;
  linkUrl?: string;
}

export interface LocalSentMessage {
  id: string;
  email: string;
  subject: string;
  message: string;
  createdAt: number;
}
