import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });
dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return String(value).trim();
}

function getApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: required("FIREBASE_PROJECT_ID"),
      clientEmail: required("FIREBASE_CLIENT_EMAIL"),
      privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
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

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, options, retries = 3) {
  let lastError = null;
  for (let i = 1; i <= retries; i += 1) {
    try {
      return await fetchWithTimeout(url, options, 30000);
    } catch (error) {
      lastError = error;
      if (i < retries) {
        await sleep(i * 700);
      }
    }
  }
  throw lastError ?? new Error("fetch failed");
}

async function getAdminIdToken(adminEmail) {
  const app = getApp();
  const auth = getAuth(app);
  const apiKey = required("NEXT_PUBLIC_FIREBASE_API_KEY");
  const user = await auth.getUserByEmail(adminEmail);
  const customToken = await auth.createCustomToken(user.uid);

  const response = await fetchWithRetry(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(
      apiKey,
    )}`,
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
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  if (!response.ok || !parsed?.idToken) {
    throw new Error(`signIn failed (${response.status}): ${text.slice(0, 220)}`);
  }
  return parsed.idToken;
}

async function postAdminProducts(idToken, payload) {
  const response = await fetchWithRetry("http://127.0.0.1:3000/api/admin/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    throw new Error(`admin API failed (${response.status}): ${text.slice(0, 220)}`);
  }
  return parsed ?? {};
}

async function main() {
  const adminEmail = "subhanahmadofficialcompany@gmail.com";
  const idToken = await getAdminIdToken(adminEmail);

  const timestamp = Date.now();
  const name = `Smoke Admin Product ${timestamp}`;
  const imageUrl =
    "https://res.cloudinary.com/dowg2netu/image/upload/v1771332822/almarky/products/lv2tajbvr0hxvl81ia55.png";

  const createResult = await postAdminProducts(idToken, {
    action: "save",
    input: {
      name,
      description: "Smoke admin API product",
      category: "Smoke",
      type: "Test",
      images: [imageUrl],
      isVisible: true,
      priceMode: "manual",
      originalPrice: 1000,
      discountPercent: 0,
      sellingPrice: 900,
      deliveryFee: 100,
      colors: [{ colorName: "Black", colorHex: "#111827", stock: 2 }],
    },
  });

  const productId = String(createResult.productId || "").trim();
  if (!productId) {
    throw new Error("save action did not return productId.");
  }

  const db = getDb(getApp());
  const productRef = db.collection("products").doc(productId);
  const created = await productRef.get();
  if (!created.exists) {
    throw new Error("Created product not found in Firestore.");
  }
  const createdData = created.data() ?? {};
  const firstImage = Array.isArray(createdData.images) ? createdData.images[0] : "";
  if (!String(firstImage || "").includes("res.cloudinary.com")) {
    throw new Error("Saved product image URL is not Cloudinary URL.");
  }

  await postAdminProducts(idToken, {
    action: "softDelete",
    productId,
  });

  const afterDelete = await productRef.get();
  const afterData = afterDelete.data() ?? {};
  if (!afterData.isDeleted || afterData.isVisible !== false) {
    throw new Error("softDelete did not update isDeleted/isVisible correctly.");
  }

  console.log("ADMIN_PRODUCT_SMOKE_OK");
  console.log(`PRODUCT_ID=${productId}`);
  console.log(`IMAGE_URL=${firstImage}`);
}

main().catch((error) => {
  console.error("ADMIN_PRODUCT_SMOKE_FAIL");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
