import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { deleteCloudinaryImages } from "@/lib/cloudinary-server";
import { isServerAdminEmail } from "@/lib/server/admin-access";
import { computeSellingPrice, slugify } from "@/lib/utils";
import type { ProductFormInput } from "@/types/commerce";

export const runtime = "nodejs";

class AdminProductsError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type SavePayload = {
  action: "save";
  productId?: string;
  input: ProductFormInput;
};

type ToggleVisibilityPayload = {
  action: "toggleVisibility";
  productId: string;
  visible: boolean;
};

type SoftDeletePayload = {
  action: "softDelete";
  productId: string;
};

type DeletePayload = {
  action: "delete";
  productId: string;
};

type AdminProductsPayload =
  | SavePayload
  | ToggleVisibilityPayload
  | SoftDeletePayload
  | DeletePayload;

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "").trim();
}

async function assertAdminEmail(email?: string | null) {
  const allowed = await isServerAdminEmail(email);
  if (!allowed) {
    throw new AdminProductsError("Admin access denied.", 403);
  }
}

function normalizeInput(input: ProductFormInput, adminEmail: string) {
  const colors = input.colors.map((color) => ({
    colorName: color.colorName.trim(),
    colorHex: color.colorHex.trim(),
    stock: Math.max(0, Math.floor(Number(color.stock) || 0)),
  }));

  if (!input.name?.trim()) throw new AdminProductsError("Product name is required.");
  if (!input.description?.trim()) {
    throw new AdminProductsError("Product description is required.");
  }
  if (!input.images?.length) {
    throw new AdminProductsError("At least one product image is required.");
  }
  if (!colors.length || colors.some((item) => !item.colorName)) {
    throw new AdminProductsError("At least one valid color is required.");
  }

  const discountPercent = Math.max(0, Math.min(100, Number(input.discountPercent) || 0));
  const originalPrice = Math.max(0, Number(input.originalPrice) || 0);
  const sellingPrice =
    input.priceMode === "auto"
      ? computeSellingPrice(originalPrice, discountPercent)
      : Math.max(0, Number(input.sellingPrice) || 0);

  return {
    name: input.name.trim(),
    slug: slugify(input.name),
    description: input.description.trim(),
    category: input.category.trim(),
    type: input.type.trim(),
    images: input.images.map((item) => item.trim()).filter(Boolean),
    isVisible: Boolean(input.isVisible),
    isHotDeal: Boolean(input.isHotDeal),
    isDeleted: false,
    priceMode: input.priceMode,
    originalPrice,
    discountPercent,
    sellingPrice,
    deliveryFee: Math.max(0, Number(input.deliveryFee) || 0),
    colors,
    totalStock: colors.reduce((sum, color) => sum + color.stock, 0),
    createdBy: adminEmail,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function buildHotDealNotificationPayload({
  productId,
  productName,
  productSlug,
  adminEmail,
}: {
  productId: string;
  productName: string;
  productSlug: string;
  adminEmail: string;
}) {
  return {
    title: `Hot Deal: ${productName}`,
    body: `${productName} is now a Hot Deal on Almarky. Tap to open.`,
    kind: "deal",
    isActive: true,
    linkUrl: `/product/${productSlug}`,
    createdBy: adminEmail,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    source: "hot-deal",
    productId,
    productName,
  };
}

async function createHotDealNotification({
  productId,
  productName,
  productSlug,
  adminEmail,
}: {
  productId: string;
  productName: string;
  productSlug: string;
  adminEmail: string;
}) {
  const db = getAdminDb();
  const noteRef = db.collection("notifications").doc();
  await noteRef.set(
    buildHotDealNotificationPayload({
      productId,
      productName,
      productSlug,
      adminEmail,
    }),
  );
}

async function saveProduct(body: SavePayload, adminEmail: string) {
  const db = getAdminDb();
  const payload = normalizeInput(body.input, adminEmail);
  const productsRef = db.collection("products");
  const duplicateQuery = await productsRef
    .where("slug", "==", payload.slug)
    .where("isDeleted", "==", false)
    .get();
  const duplicate = duplicateQuery.docs.find((doc) => doc.id !== body.productId);
  if (duplicate) {
    throw new AdminProductsError("A product with this name slug already exists.");
  }

  const existingSnapshot = body.productId
    ? await productsRef.doc(body.productId).get()
    : null;
  const existingData = existingSnapshot?.exists ? existingSnapshot.data() : null;

  if (body.productId) {
    await productsRef.doc(body.productId).set(payload, { merge: true });
    if (
      payload.isHotDeal &&
      payload.isVisible &&
      !(existingData as { isHotDeal?: boolean } | null)?.isHotDeal
    ) {
      await createHotDealNotification({
        productId: body.productId,
        productName: payload.name,
        productSlug: payload.slug,
        adminEmail,
      });
      await productsRef.doc(body.productId).set(
        {
          hotDealNotifiedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    return body.productId;
  }

  const createdRef = productsRef.doc();
  await createdRef.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
  if (payload.isHotDeal && payload.isVisible) {
    await createHotDealNotification({
      productId: createdRef.id,
      productName: payload.name,
      productSlug: payload.slug,
      adminEmail,
    });
    await createdRef.set(
      {
        hotDealNotifiedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  return createdRef.id;
}

async function toggleVisibility(body: ToggleVisibilityPayload) {
  const db = getAdminDb();
  await db.collection("products").doc(body.productId).set(
    {
      isVisible: Boolean(body.visible),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function softDelete(body: SoftDeletePayload) {
  const db = getAdminDb();
  await db.collection("products").doc(body.productId).set(
    {
      isDeleted: true,
      isVisible: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function deleteProduct(body: DeletePayload) {
  const db = getAdminDb();
  const docRef = db.collection("products").doc(body.productId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return { deletedImages: 0, skippedImages: 0 };
  }
  const data = snapshot.data() as { images?: string[] } | undefined;
  const images = Array.isArray(data?.images) ? data?.images : [];
  const { deleted, skipped } = await deleteCloudinaryImages(images);
  await docRef.delete();
  return { deletedImages: deleted, skippedImages: skipped };
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AdminProductsError("Missing authorization token.", 401);

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    await assertAdminEmail(decoded.email);
    const adminEmail = decoded.email ?? "";

    const body = (await request.json()) as AdminProductsPayload;
    if (!body?.action) {
      throw new AdminProductsError("Missing action.");
    }

    if (body.action === "save") {
      const productId = await saveProduct(body, adminEmail);
      return NextResponse.json({ productId });
    }

    if (body.action === "toggleVisibility") {
      if (!body.productId) throw new AdminProductsError("productId is required.");
      await toggleVisibility(body);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "softDelete") {
      if (!body.productId) throw new AdminProductsError("productId is required.");
      await softDelete(body);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete") {
      if (!body.productId) throw new AdminProductsError("productId is required.");
      const result = await deleteProduct(body);
      return NextResponse.json({ ok: true, ...result });
    }

    throw new AdminProductsError("Unsupported action.");
  } catch (error) {
    if (error instanceof AdminProductsError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    const message = "Admin product request failed.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
