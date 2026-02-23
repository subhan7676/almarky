import type { User } from "firebase/auth";
import {
  QueryDocumentSnapshot,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  waitForPendingWrites,
  where,
  writeBatch,
} from "firebase/firestore";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";
import { slugify } from "@/lib/utils";
import type {
  AdminSettings,
  AdminSettingsInput,
  AdminUser,
  CartItem,
  CheckoutCartSelection,
  ContactMessage,
  ContactMessageStatus,
  Notification,
  NotificationFormInput,
  Order,
  OrderStatus,
  Product,
  ProductFormInput,
} from "@/types/commerce";

const STORE_PRODUCTS_LIMIT = 120;
const ADMIN_PRODUCTS_LIMIT = 500;
const USER_CART_ITEMS_LIMIT = 200;
const USER_ORDERS_LIMIT = 200;
const ADMIN_ORDERS_LIMIT = 500;
const ADMIN_USERS_LIMIT = 500;
const ADMIN_CONTACT_MESSAGES_LIMIT = 500;
const ACTIVE_NOTIFICATIONS_LIMIT = 200;
const ADMIN_NOTIFICATIONS_LIMIT = 500;

export function getReadableFirestoreError(error: unknown) {
  const raw = error instanceof Error ? error.message : "Data request failed.";
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("5 not_found") ||
    normalized.includes("not_found") ||
    normalized.includes("firestore") && normalized.includes("not found")
  ) {
    return "Data service is temporarily unavailable.";
  }

  if (
    normalized.includes("permission-denied") ||
    normalized.includes("insufficient permissions")
  ) {
    return "You are not authorized for this action.";
  }

  if (
    normalized.includes("failed-precondition") &&
    normalized.includes("index")
  ) {
    return "Data is being prepared. Please try again shortly.";
  }

  if (
    normalized.includes("network") ||
    normalized.includes("unavailable") ||
    normalized.includes("deadline")
  ) {
    return "Network issue while loading data.";
  }

  return "Request failed. Please try again.";
}

function timestampToMillis(value: unknown) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

function mapProduct(snapshot: QueryDocumentSnapshot) {
  const data = snapshot.data() as Omit<Product, "id">;
  return { id: snapshot.id, ...data } as Product;
}

function mapCartItem(snapshot: QueryDocumentSnapshot) {
  const data = snapshot.data() as Omit<CartItem, "id">;
  return { id: snapshot.id, ...data } as CartItem;
}

function mapOrder(snapshot: QueryDocumentSnapshot) {
  const data = snapshot.data() as Omit<Order, "id">;
  return { id: snapshot.id, ...data } as Order;
}

function mapAdminUser(snapshot: QueryDocumentSnapshot) {
  const data = snapshot.data() as Omit<AdminUser, "id">;
  return { id: snapshot.id, ...data } as AdminUser;
}

function mapContactMessage(snapshot: QueryDocumentSnapshot) {
  const data = snapshot.data() as Omit<ContactMessage, "id">;
  return { id: snapshot.id, ...data } as ContactMessage;
}

function mapNotification(snapshot: QueryDocumentSnapshot) {
  const data = snapshot.data() as Omit<Notification, "id">;
  return { id: snapshot.id, ...data } as Notification;
}

export function subscribeVisibleProducts(
  onData: (products: Product[]) => void,
  onError?: (error: Error) => void,
  maxItems = STORE_PRODUCTS_LIMIT,
) {
  const db = getClientDb();
  const productsQuery = query(
    collection(db, "products"),
    where("isVisible", "==", true),
    where("isDeleted", "==", false),
    limit(Math.max(1, maxItems)),
  );

  return onSnapshot(
    productsQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((item) => mapProduct(item))
        .sort(
          (a, b) => timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt),
        );
      onData(mapped);
    },
    (error) => onError?.(error),
  );
}

export function subscribeProductBySlug(
  slug: string,
  onData: (product: Product | null) => void,
  onError?: (error: Error) => void,
) {
  const db = getClientDb();
  const productQuery = query(
    collection(db, "products"),
    where("slug", "==", slug),
    where("isVisible", "==", true),
    where("isDeleted", "==", false),
  );

  return onSnapshot(
    productQuery,
    (snapshot) => {
      if (snapshot.empty) {
        onData(null);
        return;
      }
      onData(mapProduct(snapshot.docs[0]));
    },
    (error) => onError?.(error),
  );
}

export function subscribeAdminProducts(
  onData: (products: Product[]) => void,
  onError?: (error: Error) => void,
  maxItems = ADMIN_PRODUCTS_LIMIT,
) {
  const db = getClientDb();
  const productsQuery = query(
    collection(db, "products"),
    where("isDeleted", "==", false),
    limit(Math.max(1, maxItems)),
  );

  return onSnapshot(
    productsQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((item) => mapProduct(item))
        .sort(
          (a, b) => timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt),
        );
      onData(mapped);
    },
    (error) => onError?.(error),
  );
}

export function subscribeCartItems(
  uid: string,
  onData: (items: CartItem[]) => void,
  onError?: (error: Error) => void,
) {
  const db = getClientDb();
  const cartQuery = query(collection(db, "carts", uid, "items"), limit(USER_CART_ITEMS_LIMIT));

  return onSnapshot(
    cartQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((item) => mapCartItem(item))
        .sort(
          (a, b) => timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt),
        );
      onData(mapped);
    },
    (error) => onError?.(error),
  );
}

export function subscribeUserOrders(
  uid: string,
  onData: (orders: Order[]) => void,
  onError?: (error: Error) => void,
  maxItems = USER_ORDERS_LIMIT,
) {
  const db = getClientDb();
  const ordersQuery = query(
    collection(db, "orders"),
    where("uid", "==", uid),
    limit(Math.max(1, maxItems)),
  );

  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((item) => mapOrder(item))
        .sort(
          (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt),
        );
      onData(mapped);
    },
    (error) => onError?.(error),
  );
}

export function subscribeUserOrderById(
  uid: string,
  orderId: string,
  onData: (order: Order | null) => void,
  onError?: (error: Error) => void,
) {
  const db = getClientDb();
  const orderRef = doc(db, "orders", orderId);

  return onSnapshot(
    orderRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      const data = snapshot.data() as Omit<Order, "id">;
      if (data.uid !== uid) {
        onData(null);
        return;
      }

      onData({ id: snapshot.id, ...data } as Order);
    },
    (error) => onError?.(error),
  );
}

export function subscribeAdminOrders(
  onData: (orders: Order[]) => void,
  onError?: (error: Error) => void,
  maxItems = ADMIN_ORDERS_LIMIT,
) {
  const db = getClientDb();
  const ordersQuery = query(collection(db, "orders"), limit(Math.max(1, maxItems)));

  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((item) => mapOrder(item))
        .sort(
          (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt),
        );
      onData(mapped);
    },
    (error) => onError?.(error),
  );
}

export function subscribeAdminUsers(
  onData: (users: AdminUser[]) => void,
  onError?: (error: Error) => void,
  maxItems = ADMIN_USERS_LIMIT,
) {
  const db = getClientDb();
  const usersQuery = query(collection(db, "users"), limit(Math.max(1, maxItems)));

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((item) => mapAdminUser(item))
        .sort(
          (a, b) =>
            timestampToMillis(b.lastLoginAt) - timestampToMillis(a.lastLoginAt),
        );
      onData(mapped);
    },
    (error) => onError?.(error),
  );
}

export function subscribeAdminContactMessages(
  onData: (messages: ContactMessage[]) => void,
  onError?: (error: Error) => void,
  maxItems = ADMIN_CONTACT_MESSAGES_LIMIT,
) {
  const db = getClientDb();
  const contactQuery = query(
    collection(db, "contactMessages"),
    limit(Math.max(1, maxItems)),
  );

  return onSnapshot(
    contactQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((item) => mapContactMessage(item))
        .sort(
          (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt),
        );
      onData(mapped);
    },
    (error) => onError?.(error),
  );
}

export function subscribeActiveNotifications(
  onData: (notifications: Notification[]) => void,
  onError?: (error: Error) => void,
  maxItems = ACTIVE_NOTIFICATIONS_LIMIT,
) {
  const db = getClientDb();
  const notificationsQuery = query(
    collection(db, "notifications"),
    where("isActive", "==", true),
    limit(Math.max(1, maxItems)),
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((item) => mapNotification(item))
        .sort(
          (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt),
        );
      onData(mapped);
    },
    (error) => onError?.(error),
  );
}

export function subscribeUserInboxNotifications(
  userEmail: string,
  onData: (notifications: Notification[]) => void,
  onError?: (error: Error) => void,
  maxItems = 120,
) {
  const email = String(userEmail ?? "").trim().toLowerCase();
  if (!email) {
    onData([]);
    return () => {};
  }

  const db = getClientDb();
  const inboxQuery = query(
    collection(db, "mailboxes", email, "notifications"),
    limit(Math.max(1, maxItems)),
  );

  return onSnapshot(
    inboxQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((item) => mapNotification(item))
        .filter((item) => item.isActive !== false)
        .sort(
          (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt),
        );
      onData(mapped);
    },
    (error) => onError?.(error),
  );
}

export function subscribeAdminNotifications(
  onData: (notifications: Notification[]) => void,
  onError?: (error: Error) => void,
  maxItems = ADMIN_NOTIFICATIONS_LIMIT,
) {
  const db = getClientDb();
  const notificationsQuery = query(
    collection(db, "notifications"),
    limit(Math.max(1, maxItems)),
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((item) => mapNotification(item))
        .sort(
          (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt),
        );
      onData(mapped);
    },
    (error) => onError?.(error),
  );
}

const adminSettingsDefaults: AdminSettingsInput = {
  storeName: "Almarky",
  supportEmail: "",
  supportPhone: "",
  storeNotice: "",
  maintenanceMode: false,
};

export function subscribeAdminSettings(
  onData: (settings: AdminSettings) => void,
  onError?: (error: Error) => void,
) {
  const db = getClientDb();
  const settingsRef = doc(db, "adminSettings", "global");

  return onSnapshot(
    settingsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData({
          ...adminSettingsDefaults,
          updatedBy: "",
          updatedAt: null,
        });
        return;
      }
      const data = snapshot.data() as Partial<AdminSettings>;
      onData({
        ...adminSettingsDefaults,
        ...data,
        updatedBy: data.updatedBy ?? "",
      });
    },
    (error) => onError?.(error),
  );
}

export function subscribeStoreSettings(
  onData: (settings: AdminSettings) => void,
  onError?: (error: Error) => void,
) {
  return subscribeAdminSettings(onData, onError);
}

export async function upsertUserProfile(user: User) {
  const db = getClientDb();
  await setDoc(
    doc(db, "users", user.uid),
    {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
      lastLoginAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveAdminSettings(
  input: AdminSettingsInput,
  adminEmail: string,
) {
  const db = getClientDb();
  await setDoc(
    doc(db, "adminSettings", "global"),
    {
      ...input,
      updatedBy: adminEmail,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await waitForPendingWrites(db);
}

export async function addOrUpdateCartItem(
  uid: string,
  product: Product,
  colorName: string,
  quantity: number,
) {
  const db = getClientDb();
  const safeQty = Math.max(1, quantity);
  const colorToken = slugify(colorName);
  const itemId = `${product.id}_${colorToken}`;
  const itemRef = doc(db, "carts", uid, "items", itemId);
  const existing = await getDoc(itemRef);

  if (existing.exists()) {
    const current = existing.data() as CartItem;
    await updateDoc(itemRef, {
      quantity: current.quantity + safeQty,
      selectedForCheckout: true,
      unitPrice: product.sellingPrice,
      deliveryFee: product.deliveryFee,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(itemRef, {
    productId: product.id,
    productSnapshot: {
      name: product.name,
      slug: product.slug,
      image: product.images[0] ?? "",
      type: product.type,
      sellingPrice: product.sellingPrice,
      originalPrice: product.originalPrice,
    },
    colorName,
    quantity: safeQty,
    selectedForCheckout: true,
    unitPrice: product.sellingPrice,
    deliveryFee: product.deliveryFee,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleCartItemSelection(
  uid: string,
  cartItemId: string,
  selectedForCheckout: boolean,
) {
  const db = getClientDb();
  await updateDoc(doc(db, "carts", uid, "items", cartItemId), {
    selectedForCheckout,
    updatedAt: serverTimestamp(),
  });
}

export async function setAllCartSelection(uid: string, checked: boolean) {
  const db = getClientDb();
  const allItems = await getDocs(collection(db, "carts", uid, "items"));
  await Promise.all(
    allItems.docs.map((item) =>
      updateDoc(item.ref, {
        selectedForCheckout: checked,
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

export async function updateCartQuantity(
  uid: string,
  cartItemId: string,
  quantity: number,
) {
  const db = getClientDb();
  await updateDoc(doc(db, "carts", uid, "items", cartItemId), {
    quantity: Math.max(1, quantity),
    updatedAt: serverTimestamp(),
  });
}

export async function removeCartItem(uid: string, cartItemId: string) {
  const db = getClientDb();
  await deleteDoc(doc(db, "carts", uid, "items", cartItemId));
}

async function callAdminProductsApi<TResponse>(
  payload: Record<string, unknown>,
) {
  const auth = getClientAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Login is required.");
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch("/api/admin/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as TResponse & { message?: string };
  if (!response.ok) {
    throw new Error(result.message ?? "Admin product request failed.");
  }
  return result;
}

async function callAdminOrdersApi<TResponse>(payload: Record<string, unknown>) {
  const auth = getClientAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Login is required.");
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch("/api/admin/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as TResponse & { message?: string };
  if (!response.ok) {
    throw new Error(result.message ?? "Admin order request failed.");
  }
  return result;
}

export async function saveProduct(
  input: ProductFormInput,
  _adminEmail: string,
  productId?: string,
) {
  const result = await callAdminProductsApi<{ productId: string }>({
    action: "save",
    input,
    productId,
  });
  return result.productId;
}

export async function softDeleteProduct(productId: string) {
  await callAdminProductsApi<{ ok: true }>({
    action: "softDelete",
    productId,
  });
}

export async function deleteProduct(productId: string) {
  const result = await callAdminProductsApi<{
    ok: true;
    deletedImages?: number;
    skippedImages?: number;
  }>({
    action: "delete",
    productId,
  });
  return result;
}

export async function toggleProductVisibility(productId: string, visible: boolean) {
  await callAdminProductsApi<{ ok: true }>({
    action: "toggleVisibility",
    productId,
    visible,
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const db = getClientDb();
  await updateDoc(doc(db, "orders", orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
  await waitForPendingWrites(db);
}

export async function updateContactMessageStatus(
  contactId: string,
  status: ContactMessageStatus,
) {
  const db = getClientDb();
  await updateDoc(doc(db, "contactMessages", contactId), {
    status,
    updatedAt: serverTimestamp(),
  });
  await waitForPendingWrites(db);
}

export async function replyToContactMessage(payload: {
  contactId: string;
  userEmail: string;
  subject: string;
  replyText: string;
  adminEmail: string;
}) {
  const db = getClientDb();
  const email = String(payload.userEmail ?? "").trim().toLowerCase();
  const subject = String(payload.subject ?? "").trim();
  const replyText = String(payload.replyText ?? "").trim();
  const adminEmail = String(payload.adminEmail ?? "").trim().toLowerCase();

  if (!payload.contactId?.trim()) throw new Error("Missing message id.");
  if (!email) throw new Error("User email is missing.");
  if (!replyText) throw new Error("Reply text is required.");
  if (!adminEmail) throw new Error("Admin email is missing.");

  await setDoc(
    doc(db, "contactMessages", payload.contactId),
    {
      replyText,
      repliedBy: adminEmail,
      repliedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const noteRef = doc(collection(db, "mailboxes", email, "notifications"));
  await setDoc(noteRef, {
    title: subject ? `Reply: ${subject}` : "Reply from support",
    body: replyText,
    kind: "reply",
    isActive: true,
    linkUrl: "/notifications",
    createdBy: adminEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    source: "contact-reply",
    contactId: payload.contactId,
  });

  await waitForPendingWrites(db);
  return noteRef.id;
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function buildInboxNotificationPayload(
  input: NotificationFormInput,
  adminEmail: string,
) {
  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();
  const linkUrl = String(input.linkUrl ?? "").trim();
  const kind = input.kind === "deal" ? "deal" : "update";

  if (!title) throw new Error("Title is required.");
  if (!body) throw new Error("Message is required.");

  return {
    title,
    body,
    kind,
    isActive: true,
    linkUrl,
    createdBy: normalizeEmail(adminEmail),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    source: "admin-message",
  };
}

export async function sendInboxNotificationToUser(
  userEmail: string,
  input: NotificationFormInput,
  adminEmail: string,
) {
  const email = normalizeEmail(userEmail);
  if (!email) throw new Error("User email is required.");

  const db = getClientDb();
  const noteRef = doc(collection(db, "mailboxes", email, "notifications"));
  await setDoc(noteRef, buildInboxNotificationPayload(input, adminEmail));
  await waitForPendingWrites(db);
  return noteRef.id;
}

export async function sendInboxNotificationToAllUsers(
  userEmails: string[],
  input: NotificationFormInput,
  adminEmail: string,
) {
  const emails = Array.from(
    new Set(userEmails.map((value) => normalizeEmail(value)).filter(Boolean)),
  );
  if (emails.length === 0) throw new Error("No users found.");

  const db = getClientDb();
  const payload = buildInboxNotificationPayload(input, adminEmail);

  const CHUNK_SIZE = 450; // batch limit is 500, keep margin
  for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = emails.slice(i, i + CHUNK_SIZE);
    for (const email of chunk) {
      const noteRef = doc(collection(db, "mailboxes", email, "notifications"));
      batch.set(noteRef, payload);
    }
    await batch.commit();
  }

  await waitForPendingWrites(db);
  return emails.length;
}

export async function saveNotification(
  input: NotificationFormInput,
  adminEmail: string,
  notificationId?: string,
) {
  const db = getClientDb();

  const payload = {
    title: input.title.trim(),
    body: input.body.trim(),
    kind: input.kind,
    isActive: Boolean(input.isActive),
    linkUrl: String(input.linkUrl ?? "").trim(),
    createdBy: adminEmail.trim().toLowerCase(),
    updatedAt: serverTimestamp(),
  };

  if (!payload.title) throw new Error("Title is required.");
  if (!payload.body) throw new Error("Message is required.");

  if (notificationId) {
    await setDoc(doc(db, "notifications", notificationId), payload, { merge: true });
    await waitForPendingWrites(db);
    return notificationId;
  }

  const createdRef = doc(collection(db, "notifications"));
  await setDoc(createdRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
  await waitForPendingWrites(db);
  return createdRef.id;
}

export async function toggleNotificationActive(
  notificationId: string,
  nextActive: boolean,
) {
  const db = getClientDb();
  await updateDoc(doc(db, "notifications", notificationId), {
    isActive: Boolean(nextActive),
    updatedAt: serverTimestamp(),
  });
  await waitForPendingWrites(db);
}

export async function deleteNotification(notificationId: string) {
  const db = getClientDb();
  await deleteDoc(doc(db, "notifications", notificationId));
  await waitForPendingWrites(db);
}

export async function deleteOrderById(orderId: string) {
  if (!orderId?.trim()) throw new Error("Order id is required.");
  await callAdminOrdersApi<{ ok: true }>({
    action: "delete",
    orderId,
  });
}

export async function placeOrderFromCart(
  selectedItems: CheckoutCartSelection[],
  customerDetails: {
    fullName: string;
    phonePk: string;
    province: string;
    city: string;
    tehsil: string;
    district: string;
    houseAddress: string;
    shopName?: string;
  },
) {
  const auth = getClientAuth();
  const currentUser = auth.currentUser;
  const idToken = currentUser ? await currentUser.getIdToken() : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  const response = await fetch("/api/orders/place", {
    method: "POST",
    headers,
    body: JSON.stringify({
      selectedItems,
      customerDetails,
    }),
  });

  const result = (await response.json()) as {
    message?: string;
    orderId?: string;
    orderNumber?: string;
    warning?: string | null;
  };

  if (!response.ok) {
    throw new Error(result.message ?? "Order placement failed.");
  }

  return result;
}
