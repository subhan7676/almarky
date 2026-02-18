import type {
  AdminSettings,
  LocalCartItem,
  LocalOrderReceiptStatus,
  LocalProfileData,
  LocalSentMessage,
  Order,
  Product,
} from "@/types/commerce";

const CART_STORAGE_KEY = "almarky_local_cart_v1";
const PROFILE_STORAGE_KEY = "almarky_local_profile_v1";
const ORDERS_STORAGE_KEY = "almarky_local_orders_v1";
const ORDER_RECEIPTS_STORAGE_KEY = "almarky_local_order_receipts_v1";
const STORE_SETTINGS_CACHE_KEY = "almarky_store_settings_cache_v1";
const PRODUCT_CACHE_KEY = "almarky_product_cache_v1";
const NOTIFICATION_SEEN_STORAGE_KEY = "almarky_notification_seen_v1";
const NOTIFICATION_HIDDEN_STORAGE_KEY = "almarky_notification_hidden_v1";
const DEVICE_NOTIFICATION_SEEN_STORAGE_KEY = "almarky_device_notification_seen_v1";
const SEARCH_HISTORY_STORAGE_KEY = "almarky_search_history_v1";
const SENT_MESSAGES_STORAGE_KEY = "almarky_local_sent_messages_v1";

const NOTIFICATION_SEEN_EVENT = "almarky-notification-seen";

export const defaultLocalProfile: LocalProfileData = {
  displayName: "",
  email: "",
  fullName: "",
  phonePk: "",
  province: "",
  city: "",
  tehsil: "",
  district: "",
  houseAddress: "",
  shopName: "",
  settings: {
    preferredLanguage: "English",
    appNotifications: true,
    deviceNotifications: false,
    smsUpdates: true,
    marketingOptIn: false,
  },
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function dispatchStorageEvent(name: string) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(name));
  } catch {
    // Ignore browser event dispatch failures.
  }
}

type UserOrderReceiptMap = Record<string, LocalOrderReceiptStatus>;
type LocalOrderReceiptsStore = Record<string, UserOrderReceiptMap>;

function isLocalOrderReceiptStatus(value: unknown): value is LocalOrderReceiptStatus {
  return value === "pending" || value === "received";
}

function readLocalOrderReceiptsStore() {
  if (!canUseStorage()) return {} as LocalOrderReceiptsStore;
  try {
    const raw = localStorage.getItem(ORDER_RECEIPTS_STORAGE_KEY);
    if (!raw) return {} as LocalOrderReceiptsStore;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as LocalOrderReceiptsStore;
    }

    const normalized: LocalOrderReceiptsStore = {};
    for (const [uid, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const scoped: UserOrderReceiptMap = {};
      for (const [orderId, status] of Object.entries(value as Record<string, unknown>)) {
        if (isLocalOrderReceiptStatus(status)) {
          scoped[orderId] = status;
        }
      }
      if (Object.keys(scoped).length > 0) {
        normalized[uid] = scoped;
      }
    }
    return normalized;
  } catch {
    return {} as LocalOrderReceiptsStore;
  }
}

function writeLocalOrderReceiptsStore(store: LocalOrderReceiptsStore) {
  if (!canUseStorage()) return;
  localStorage.setItem(ORDER_RECEIPTS_STORAGE_KEY, JSON.stringify(store));
}

export function readLocalCart() {
  if (!canUseStorage()) return [] as LocalCartItem[];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalCartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function writeLocalCart(items: LocalCartItem[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function clearLocalCart() {
  if (!canUseStorage()) return;
  localStorage.removeItem(CART_STORAGE_KEY);
}

export function readLocalProfile() {
  if (!canUseStorage()) return defaultLocalProfile;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return defaultLocalProfile;
    const parsed = JSON.parse(raw) as LocalProfileData;
    return {
      ...defaultLocalProfile,
      ...parsed,
      settings: {
        ...defaultLocalProfile.settings,
        ...(parsed.settings ?? {}),
      },
    };
  } catch {
    return defaultLocalProfile;
  }
}

export function writeLocalProfile(profile: LocalProfileData) {
  if (!canUseStorage()) return;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function clearLocalProfile() {
  if (!canUseStorage()) return;
  localStorage.removeItem(PROFILE_STORAGE_KEY);
}

export function readLocalOrders() {
  if (!canUseStorage()) return [] as Order[];
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Order[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalOrders(orders: Order[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders.slice(0, 300)));
}

export function prependLocalOrder(order: Order) {
  const current = readLocalOrders();
  const deduped = current.filter((item) => item.id !== order.id);
  writeLocalOrders([order, ...deduped]);
}

export function findLocalOrderById(orderId: string) {
  return readLocalOrders().find((order) => order.id === orderId) ?? null;
}

export function readLocalOrderReceipts(uid: string) {
  if (!uid) return {} as UserOrderReceiptMap;
  const store = readLocalOrderReceiptsStore();
  return store[uid] ?? ({} as UserOrderReceiptMap);
}

export function setLocalOrderReceiptStatus(
  uid: string,
  orderId: string,
  status: LocalOrderReceiptStatus,
) {
  if (!uid || !orderId || !canUseStorage()) return;

  const store = readLocalOrderReceiptsStore();
  const scoped = { ...(store[uid] ?? ({} as UserOrderReceiptMap)) };

  if (status === "received") {
    scoped[orderId] = "received";
  } else {
    delete scoped[orderId];
  }

  if (Object.keys(scoped).length === 0) {
    delete store[uid];
  } else {
    store[uid] = scoped;
  }

  writeLocalOrderReceiptsStore(store);
}

type StoreSettingsCache = Pick<
  AdminSettings,
  "storeName" | "storeNotice" | "maintenanceMode"
> & {
  updatedAt: number;
};

const STORE_SETTINGS_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 6;
const PRODUCT_CACHE_MAX_AGE_MS = 1000 * 60 * 20;

type ProductCacheEnvelope = {
  updatedAt: number;
  items: Product[];
};

export function readStoreSettingsCache() {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(STORE_SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoreSettingsCache;
    if (!parsed) return null;
    if (
      typeof parsed.updatedAt !== "number" ||
      Date.now() - parsed.updatedAt > STORE_SETTINGS_CACHE_MAX_AGE_MS
    ) {
      localStorage.removeItem(STORE_SETTINGS_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoreSettingsCache(
  payload: Pick<AdminSettings, "storeName" | "storeNotice" | "maintenanceMode">,
) {
  if (!canUseStorage()) return;
  const cache: StoreSettingsCache = {
    ...payload,
    updatedAt: Date.now(),
  };
  localStorage.setItem(STORE_SETTINGS_CACHE_KEY, JSON.stringify(cache));
}

export function readProductsCache() {
  if (!canUseStorage()) return [] as Product[];
  try {
    const raw = localStorage.getItem(PRODUCT_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProductCacheEnvelope;
    if (!parsed || !Array.isArray(parsed.items)) return [];
    if (
      typeof parsed.updatedAt !== "number" ||
      Date.now() - parsed.updatedAt > PRODUCT_CACHE_MAX_AGE_MS
    ) {
      localStorage.removeItem(PRODUCT_CACHE_KEY);
      return [];
    }
    return parsed.items;
  } catch {
    return [];
  }
}

export function writeProductsCache(products: Product[]) {
  if (!canUseStorage()) return;
  const compactProducts = products.slice(0, 120).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    type: product.type,
    images: product.images,
    isVisible: product.isVisible,
    isDeleted: product.isDeleted,
    isHotDeal: Boolean(product.isHotDeal),
    priceMode: product.priceMode,
    originalPrice: product.originalPrice,
    discountPercent: product.discountPercent,
    sellingPrice: product.sellingPrice,
    deliveryFee: product.deliveryFee,
    colors: product.colors,
    totalStock: product.totalStock,
    createdBy: product.createdBy,
  })) as Product[];

  const payload: ProductCacheEnvelope = {
    updatedAt: Date.now(),
    items: compactProducts,
  };
  localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(payload));
}

type NotificationSeenStore = Record<string, number>;
type NotificationHiddenStore = Record<string, string[]>;

function readNotificationSeenStore() {
  if (!canUseStorage()) return {} as NotificationSeenStore;
  try {
    const raw = localStorage.getItem(NOTIFICATION_SEEN_STORAGE_KEY);
    if (!raw) return {} as NotificationSeenStore;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as NotificationSeenStore;
    }

    const normalized: NotificationSeenStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        normalized[key] = value;
      }
    }
    return normalized;
  } catch {
    return {} as NotificationSeenStore;
  }
}

function writeNotificationSeenStore(store: NotificationSeenStore) {
  if (!canUseStorage()) return;
  localStorage.setItem(NOTIFICATION_SEEN_STORAGE_KEY, JSON.stringify(store));
  dispatchStorageEvent(NOTIFICATION_SEEN_EVENT);
}

export function readNotificationLastSeen(userKey: string) {
  if (!userKey) return 0;
  const store = readNotificationSeenStore();
  return store[userKey] ?? 0;
}

export function writeNotificationLastSeen(userKey: string, lastSeenAt: number) {
  if (!userKey || !canUseStorage()) return;
  const safeValue = Number.isFinite(lastSeenAt) ? Math.max(0, lastSeenAt) : 0;
  const store = readNotificationSeenStore();
  store[userKey] = safeValue;
  writeNotificationSeenStore(store);
}

type DeviceNotificationSeenStore = Record<string, number>;

function readDeviceNotificationSeenStore() {
  if (!canUseStorage()) return {} as DeviceNotificationSeenStore;
  try {
    const raw = localStorage.getItem(DEVICE_NOTIFICATION_SEEN_STORAGE_KEY);
    if (!raw) return {} as DeviceNotificationSeenStore;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as DeviceNotificationSeenStore;
    }
    const normalized: DeviceNotificationSeenStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        normalized[key] = value;
      }
    }
    return normalized;
  } catch {
    return {} as DeviceNotificationSeenStore;
  }
}

function writeDeviceNotificationSeenStore(store: DeviceNotificationSeenStore) {
  if (!canUseStorage()) return;
  localStorage.setItem(DEVICE_NOTIFICATION_SEEN_STORAGE_KEY, JSON.stringify(store));
}

export function readDeviceNotificationLastSeen(userKey: string) {
  if (!userKey) return 0;
  const store = readDeviceNotificationSeenStore();
  return store[userKey] ?? 0;
}

export function writeDeviceNotificationLastSeen(userKey: string, lastSeenAt: number) {
  if (!userKey || !canUseStorage()) return;
  const safeValue = Number.isFinite(lastSeenAt) ? Math.max(0, lastSeenAt) : 0;
  const store = readDeviceNotificationSeenStore();
  store[userKey] = safeValue;
  writeDeviceNotificationSeenStore(store);
}

export function onNotificationSeenChange(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(NOTIFICATION_SEEN_EVENT, handler);
  return () => window.removeEventListener(NOTIFICATION_SEEN_EVENT, handler);
}

function readNotificationHiddenStore() {
  if (!canUseStorage()) return {} as NotificationHiddenStore;
  try {
    const raw = localStorage.getItem(NOTIFICATION_HIDDEN_STORAGE_KEY);
    if (!raw) return {} as NotificationHiddenStore;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as NotificationHiddenStore;
    }
    const normalized: NotificationHiddenStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      normalized[key] = value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 400);
    }
    return normalized;
  } catch {
    return {} as NotificationHiddenStore;
  }
}

function writeNotificationHiddenStore(store: NotificationHiddenStore) {
  if (!canUseStorage()) return;
  localStorage.setItem(NOTIFICATION_HIDDEN_STORAGE_KEY, JSON.stringify(store));
}

export function readHiddenNotifications(userKey: string) {
  if (!userKey) return [] as string[];
  const store = readNotificationHiddenStore();
  return store[userKey] ?? [];
}

export function hideNotificationForUser(userKey: string, notificationId: string) {
  if (!userKey || !notificationId || !canUseStorage()) return;
  const store = readNotificationHiddenStore();
  const current = store[userKey] ?? [];
  if (current.includes(notificationId)) return;
  store[userKey] = [notificationId, ...current].slice(0, 400);
  writeNotificationHiddenStore(store);
}

export function clearHiddenNotifications(userKey: string) {
  if (!userKey || !canUseStorage()) return;
  const store = readNotificationHiddenStore();
  if (store[userKey]) {
    delete store[userKey];
    writeNotificationHiddenStore(store);
  }
}

function readSearchHistoryStore() {
  if (!canUseStorage()) return [] as string[];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .slice(0, 20);
  } catch {
    return [];
  }
}

function writeSearchHistoryStore(items: string[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
}

export function readSearchHistory() {
  return readSearchHistoryStore();
}

export function addSearchHistory(term: string) {
  const next = String(term ?? "").trim();
  if (!next || !canUseStorage()) return;
  const store = readSearchHistoryStore();
  const deduped = store.filter((item) => item.toLowerCase() !== next.toLowerCase());
  writeSearchHistoryStore([next, ...deduped]);
}

export function clearSearchHistory() {
  if (!canUseStorage()) return;
  localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
}

type SentMessagesStore = Record<string, LocalSentMessage[]>;

function normalizeEmailKey(value: string) {
  return String(value || "").trim().toLowerCase();
}

function readSentMessagesStore() {
  if (!canUseStorage()) return {} as SentMessagesStore;
  try {
    const raw = localStorage.getItem(SENT_MESSAGES_STORAGE_KEY);
    if (!raw) return {} as SentMessagesStore;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as SentMessagesStore;
    }

    const normalized: SentMessagesStore = {};
    for (const [emailKey, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const list: LocalSentMessage[] = [];
      for (const entry of value) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
        const item = entry as Partial<LocalSentMessage>;
        const email = normalizeEmailKey(item.email ?? emailKey);
        if (!email) continue;
        const subject = String(item.subject ?? "").trim();
        const message = String(item.message ?? "").trim();
        const createdAt = Number(item.createdAt ?? 0);
        if (!subject || !message || !Number.isFinite(createdAt) || createdAt <= 0) {
          continue;
        }
        list.push({
          id: String(item.id ?? `${createdAt}`),
          email,
          subject,
          message,
          createdAt,
        });
      }
      if (list.length > 0) {
        normalized[normalizeEmailKey(emailKey)] = list.slice(0, 80);
      }
    }
    return normalized;
  } catch {
    return {} as SentMessagesStore;
  }
}

function writeSentMessagesStore(store: SentMessagesStore) {
  if (!canUseStorage()) return;
  localStorage.setItem(SENT_MESSAGES_STORAGE_KEY, JSON.stringify(store));
}

export function readLocalSentMessages(email: string) {
  const key = normalizeEmailKey(email);
  if (!key) return [] as LocalSentMessage[];
  const store = readSentMessagesStore();
  const messages = store[key] ?? [];
  return messages
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 60);
}

export function prependLocalSentMessage(payload: Omit<LocalSentMessage, "id" | "createdAt"> & {
  id?: string;
  createdAt?: number;
}) {
  const emailKey = normalizeEmailKey(payload.email);
  if (!emailKey || !canUseStorage()) return;

  const createdAt = Number.isFinite(payload.createdAt)
    ? Math.max(1, Number(payload.createdAt))
    : Date.now();

  const item: LocalSentMessage = {
    id: String(payload.id ?? `${createdAt}`),
    email: emailKey,
    subject: String(payload.subject ?? "").trim(),
    message: String(payload.message ?? "").trim(),
    createdAt,
  };

  if (!item.subject || !item.message) return;

  const store = readSentMessagesStore();
  const list = store[emailKey] ?? [];
  const deduped = list.filter((entry) => entry.id !== item.id);
  store[emailKey] = [item, ...deduped].slice(0, 60);
  writeSentMessagesStore(store);
}

export function removeLocalSentMessage(email: string, messageId: string) {
  const emailKey = normalizeEmailKey(email);
  if (!emailKey || !messageId || !canUseStorage()) return;

  const store = readSentMessagesStore();
  const list = store[emailKey] ?? [];
  const nextList = list.filter((entry) => entry.id !== messageId);

  if (nextList.length === 0) {
    delete store[emailKey];
  } else {
    store[emailKey] = nextList;
  }

  writeSentMessagesStore(store);
}

export function clearLocalSentMessages(email: string) {
  const emailKey = normalizeEmailKey(email);
  if (!emailKey || !canUseStorage()) return;
  const store = readSentMessagesStore();
  if (store[emailKey]) {
    delete store[emailKey];
    writeSentMessagesStore(store);
  }
}
