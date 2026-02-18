import { NextRequest, NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { createOrderSpreadsheet } from "@/lib/google/orders-sheets";
import { generateOrderNumber, isValidPakistaniPhone } from "@/lib/utils";
import type {
  CheckoutCartSelection,
  CustomerDetails,
  OrderItem,
} from "@/types/commerce";

export const runtime = "nodejs";
export const maxDuration = 60;

class CheckoutError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "").trim();
}

function validateCustomerDetails(details: CustomerDetails) {
  if (!details.fullName?.trim()) throw new CheckoutError("Full name is required.");
  if (!details.phonePk?.trim()) throw new CheckoutError("Phone number is required.");
  if (!isValidPakistaniPhone(details.phonePk)) {
    throw new CheckoutError("Enter a valid Pakistani phone number.");
  }
  if (!details.province?.trim()) throw new CheckoutError("Province is required.");
  if (!details.city?.trim()) throw new CheckoutError("City is required.");
  if (!details.tehsil?.trim()) throw new CheckoutError("Tehsil is required.");
  if (!details.district?.trim()) throw new CheckoutError("District is required.");
  if (!details.houseAddress?.trim()) {
    throw new CheckoutError("House address is required.");
  }
}

function safeNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function normalizeCustomerDetails(input: CustomerDetails): CustomerDetails {
  return {
    fullName: input.fullName.trim(),
    phonePk: input.phonePk.trim(),
    province: input.province.trim(),
    city: input.city.trim(),
    tehsil: input.tehsil.trim(),
    district: input.district.trim(),
    houseAddress: input.houseAddress.trim(),
    shopName: input.shopName?.trim() ?? "",
  };
}

function normalizeOrderItems(selectedItems: CheckoutCartSelection[]) {
  return selectedItems.map((item, index) => {
    const productId = item.productId?.trim();
    const color = item.colorName?.trim();
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const unitPrice = safeNumber(item.unitPrice);
    const deliveryFee = safeNumber(item.deliveryFee);
    const name =
      item.productName?.trim() || item.productSnapshot?.name?.trim() || "Unknown Product";
    const slug = item.productSlug?.trim() || item.productSnapshot?.slug?.trim() || "";
    const image = item.productImage?.trim() || item.productSnapshot?.image?.trim() || "";

    if (!productId || !color) {
      throw new CheckoutError(
        `Selected item #${index + 1} is missing product or color.`,
      );
    }

    const lineTotal = unitPrice * quantity;
    const normalizedItem: OrderItem = {
      productId,
      name,
      slug,
      image,
      color,
      quantity,
      unitPrice,
      deliveryFee,
      lineTotal,
    };
    return normalizedItem;
  });
}

function matchColorName(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

async function saveOrderAndDecrementStock(params: {
  orderId: string;
  orderNumber: string;
  uid: string;
  email: string;
  orderItems: OrderItem[];
  customerDetails: CustomerDetails;
  subtotal: number;
  deliveryTotal: number;
  grandTotal: number;
}) {
  const db = getAdminDb();
  const products = db.collection("products");
  const orders = db.collection("orders");

  const decrementsByProduct = new Map<string, Map<string, number>>();
  for (const item of params.orderItems) {
    const byColor =
      decrementsByProduct.get(item.productId) ?? new Map<string, number>();
    byColor.set(item.color, (byColor.get(item.color) ?? 0) + item.quantity);
    decrementsByProduct.set(item.productId, byColor);
  }

  const productIds = Array.from(decrementsByProduct.keys());

  await db.runTransaction(async (transaction) => {
    const productRefs = productIds.map((productId) => products.doc(productId));
    const snapshots = productRefs.length
      ? await transaction.getAll(...productRefs)
      : [];
    const snapshotById = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    for (const snapshot of snapshots) {
      snapshotById.set(snapshot.id, snapshot);
    }

    for (const productId of productIds) {
      const snapshot = snapshotById.get(productId);
      const productRef = products.doc(productId);
      if (!snapshot || !snapshot.exists) {
        const name = params.orderItems.find((item) => item.productId === productId)?.name;
        throw new CheckoutError(
          `Product no longer exists: ${name || productId}. Refresh and try again.`,
        );
      }

      const data = snapshot.data() as {
        isDeleted?: boolean;
        colors?: Array<{
          colorName?: string;
          colorHex?: string;
          stock?: number;
        }>;
      };

      if (data.isDeleted) {
        const name = params.orderItems.find((item) => item.productId === productId)?.name;
        throw new CheckoutError(
          `Product is unavailable: ${name || productId}. Refresh and try again.`,
        );
      }

      const colors = Array.isArray(data.colors)
        ? data.colors.map((color) => ({
            colorName: String(color.colorName ?? "").trim(),
            colorHex: String(color.colorHex ?? "").trim(),
            stock: Math.max(0, Math.floor(Number(color.stock) || 0)),
          }))
        : [];

      const decrements = decrementsByProduct.get(productId) ?? new Map();
      for (const [colorName, quantity] of decrements.entries()) {
        const colorIndex = colors.findIndex((color) =>
          matchColorName(color.colorName, colorName),
        );
        const name = params.orderItems.find((item) => item.productId === productId)?.name;
        if (colorIndex < 0) {
          throw new CheckoutError(
            `Selected color not found for ${name || productId}. Refresh and try again.`,
          );
        }

        if (colors[colorIndex].stock < quantity) {
          throw new CheckoutError(
            `Insufficient stock for ${name || productId} (${colorName}).`,
          );
        }

        colors[colorIndex].stock -= quantity;
      }
      const totalStock = colors.reduce((sum, color) => sum + color.stock, 0);

      transaction.update(productRef, {
        colors,
        totalStock,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const orderRef = orders.doc(params.orderId);
    transaction.set(orderRef, {
      uid: params.uid,
      email: params.email,
      orderNumber: params.orderNumber,
      items: params.orderItems,
      pricing: {
        subtotal: params.subtotal,
        deliveryTotal: params.deliveryTotal,
        grandTotal: params.grandTotal,
      },
      customerDetails: params.customerDetails,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const bearerToken = getBearerToken(request);
    if (!bearerToken) {
      throw new CheckoutError("Missing authorization token.", 401);
    }

    const adminAuth = getAdminAuth();

    const decoded = await adminAuth.verifyIdToken(bearerToken);
    const uid = decoded.uid;
    const email = decoded.email ?? "";

    const body = (await request.json()) as {
      selectedItems?: CheckoutCartSelection[];
      customerDetails?: CustomerDetails;
    };

    const selectedItems = body.selectedItems ?? [];
    const customerDetails = body.customerDetails;

    if (!selectedItems.length) {
      throw new CheckoutError("Select at least one item before checkout.");
    }
    if (!customerDetails) {
      throw new CheckoutError("Customer details are required.");
    }
    validateCustomerDetails(customerDetails);

    const orderItems = normalizeOrderItems(selectedItems);
    const normalizedCustomer = normalizeCustomerDetails(customerDetails);
    const orderId = randomUUID();
    const orderNumber = generateOrderNumber();

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const deliveryTotal = orderItems.reduce((sum, item) => sum + item.deliveryFee, 0);
    const grandTotal = subtotal + deliveryTotal;

    await saveOrderAndDecrementStock({
      orderId,
      orderNumber,
      uid,
      email,
      orderItems,
      customerDetails: normalizedCustomer,
      subtotal,
      deliveryTotal,
      grandTotal,
    });

    // Create external archive copy after response to keep checkout fast.
    after(async () => {
      try {
        const sheet = await createOrderSpreadsheet({
          orderId,
          orderNumber,
          uid,
          email,
          customerDetails: normalizedCustomer,
          items: orderItems,
          subtotal,
          deliveryTotal,
          grandTotal,
          createdAt: new Date(),
        });

        await getAdminDb()
          .collection("orders")
          .doc(orderId)
          .set(
            {
              orderSheetId: sheet.spreadsheetId,
              orderSheetUrl: sheet.spreadsheetUrl,
              archiveStatus: "archived",
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      } catch {
        await getAdminDb()
          .collection("orders")
          .doc(orderId)
          .set(
            {
              archiveStatus: "delayed",
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
    });

    return NextResponse.json({
      orderId,
      orderNumber,
      message: "Order placed successfully.",
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    const rawMessage =
      error instanceof Error ? error.message : "Unexpected error placing order.";
    const normalized = rawMessage.toLowerCase();
    const message = normalized.includes("auth")
      ? "Authentication failed. Please login again and retry."
      : "Order service is temporarily unavailable. Please try again in a moment.";

    console.error("[orders/place] unexpected error:", rawMessage);
    return NextResponse.json({ message }, { status: 500 });
  }
}
