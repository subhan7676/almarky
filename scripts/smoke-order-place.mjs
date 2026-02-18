import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });
dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return String(value).trim();
}

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

function getDb(app) {
  const dbId =
    process.env.FIREBASE_DATABASE_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID?.trim() ||
    "default";
  return getFirestore(app, dbId);
}

function normalizeColors(colors) {
  if (!Array.isArray(colors)) return [];
  return colors.map((color) => ({
    colorName: String(color?.colorName ?? "").trim(),
    colorHex: String(color?.colorHex ?? "").trim(),
    stock: Math.max(0, Number(color?.stock ?? 0) || 0),
  }));
}

async function signInWithCustomToken(apiKey, customToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    },
  );

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  if (!response.ok || !parsed?.idToken) {
    throw new Error(
      `Custom-token sign-in failed (${response.status}): ${text.slice(0, 240)}`,
    );
  }
  return parsed.idToken;
}

async function callPlaceOrder(baseUrl, idToken, payload) {
  const response = await fetch(`${baseUrl}/api/orders/place`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  if (!response.ok || !parsed?.orderId) {
    throw new Error(`Order API failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return parsed;
}

async function main() {
  const baseUrl = process.env.SMOKE_BASE_URL?.trim() || "http://127.0.0.1:3000";
  const apiKey = requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const app = getAdminApp();
  const db = getDb(app);
  const auth = getAuth(app);

  const productSnapshot = await db
    .collection("products")
    .where("isVisible", "==", true)
    .where("isDeleted", "==", false)
    .limit(50)
    .get();

  if (productSnapshot.empty) {
    throw new Error("No visible products found for smoke order test.");
  }

  let selected = null;
  for (const doc of productSnapshot.docs) {
    const data = doc.data();
    const colors = normalizeColors(data.colors);
    const color = colors.find((item) => item.stock > 0);
    if (color) {
      selected = {
        id: doc.id,
        name: String(data.name ?? "Smoke Product"),
        slug: String(data.slug ?? ""),
        image: String((Array.isArray(data.images) ? data.images[0] : "") ?? ""),
        colorName: color.colorName,
        unitPrice: Math.max(0, Number(data.sellingPrice ?? 0) || 0),
        deliveryFee: Math.max(0, Number(data.deliveryFee ?? 0) || 0),
        beforeStock: color.stock,
      };
      break;
    }
  }

  if (!selected) {
    throw new Error("No product with available stock found for smoke order test.");
  }

  const testUid = `smoke-user-${Date.now()}`;
  const customToken = await auth.createCustomToken(testUid);
  const idToken = await signInWithCustomToken(apiKey, customToken);

  const result = await callPlaceOrder(baseUrl, idToken, {
    selectedItems: [
      {
        productId: selected.id,
        colorName: selected.colorName,
        quantity: 1,
        productName: selected.name,
        productSlug: selected.slug,
        productImage: selected.image,
        unitPrice: selected.unitPrice,
        deliveryFee: selected.deliveryFee,
        productSnapshot: {
          name: selected.name,
          slug: selected.slug,
          image: selected.image,
          type: "Smoke",
          sellingPrice: selected.unitPrice,
          originalPrice: selected.unitPrice,
        },
      },
    ],
    customerDetails: {
      fullName: "Smoke Test User",
      phonePk: "03001234567",
      province: "Punjab",
      city: "Lahore",
      tehsil: "Model Town",
      district: "Lahore",
      houseAddress: "Smoke Test Address",
      shopName: "Smoke Shop",
    },
  });

  const orderDoc = await db.collection("orders").doc(result.orderId).get();
  if (!orderDoc.exists) {
    throw new Error("Order API returned success but order doc not found in Firestore.");
  }

  const updatedProduct = await db.collection("products").doc(selected.id).get();
  const updatedColors = normalizeColors(updatedProduct.data()?.colors);
  const updatedColor = updatedColors.find(
    (item) => item.colorName.toLowerCase() === selected.colorName.toLowerCase(),
  );
  if (!updatedColor) {
    throw new Error("Product color missing after order placement.");
  }
  if (updatedColor.stock !== selected.beforeStock - 1) {
    throw new Error(
      `Stock did not decrement correctly. Before=${selected.beforeStock}, After=${updatedColor.stock}`,
    );
  }

  const keepOrder = String(process.env.SMOKE_KEEP_ORDER ?? "").toLowerCase() === "true";
  if (!keepOrder) {
    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection("orders").doc(result.orderId);
      const currentOrder = await transaction.get(orderRef);
      if (!currentOrder.exists) return;

      for (const item of resultItemList(currentOrder.data())) {
        const productRef = db.collection("products").doc(item.productId);
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists) continue;

        const colors = normalizeColors(productSnap.data()?.colors);
        const index = colors.findIndex(
          (color) => color.colorName.toLowerCase() === item.color.toLowerCase(),
        );
        if (index < 0) continue;

        colors[index].stock += Math.max(1, item.quantity);
        const totalStock = colors.reduce((sum, color) => sum + color.stock, 0);

        transaction.update(productRef, {
          colors,
          totalStock,
        });
      }

      transaction.delete(orderRef);
    });
  }

  console.log("SMOKE_ORDER_OK");
  console.log(`ORDER_ID=${result.orderId}`);
  console.log(`ORDER_NUMBER=${result.orderNumber}`);
  console.log(`ORDER_SHEET_URL=${result.orderSheetUrl || ""}`);
  console.log(`PRODUCT_ID=${selected.id}`);
  console.log(`COLOR=${selected.colorName}`);
  console.log(`STOCK_BEFORE=${selected.beforeStock}`);
  console.log(`STOCK_AFTER=${updatedColor.stock}`);
  console.log(`ORDER_CLEANED=${keepOrder ? "no" : "yes"}`);
}

function resultItemList(orderData) {
  const raw = Array.isArray(orderData?.items) ? orderData.items : [];
  return raw
    .map((item) => ({
      productId: String(item?.productId ?? "").trim(),
      color: String(item?.color ?? "").trim(),
      quantity: Math.max(1, Math.floor(Number(item?.quantity ?? 1) || 1)),
    }))
    .filter((item) => item.productId && item.color);
}

main().catch((error) => {
  console.error("SMOKE_ORDER_FAIL");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
