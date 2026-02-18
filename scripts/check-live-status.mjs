import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";

dotenv.config({ path: ".env.local" });
dotenv.config();

function has(key) {
  return Boolean(process.env[key] && String(process.env[key]).trim());
}

function value(key) {
  return String(process.env[key] ?? "").trim();
}

function adminCredentials() {
  return {
    projectId: value("FIREBASE_PROJECT_ID"),
    clientEmail: value("FIREBASE_CLIENT_EMAIL"),
    privateKey: value("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}

async function listFirestoreDatabaseIds() {
  const { projectId, clientEmail, privateKey } = adminCredentials();
  if (!projectId || !clientEmail || !privateKey) return [];

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  await auth.authorize();

  const firestoreApi = google.firestore({ version: "v1", auth });
  const result = await firestoreApi.projects.databases.list({
    parent: `projects/${projectId}`,
  });

  const items = result.data.databases ?? [];
  return items
    .map((db) => db.name?.split("/").pop() ?? "")
    .filter(Boolean);
}

async function checkFirestore() {
  const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
  const missing = required.filter((key) => !has(key));
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Missing Firebase admin env: ${missing.join(", ")}`,
    };
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
      credential: cert({
        projectId: value("FIREBASE_PROJECT_ID"),
        clientEmail: value("FIREBASE_CLIENT_EMAIL"),
        privateKey: value("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
      }),
    });

  const dbId =
    value("FIREBASE_DATABASE_ID") ||
    value("NEXT_PUBLIC_FIREBASE_DATABASE_ID") ||
    "default";

  try {
    const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    await db.listCollections();
    return {
      ok: true,
      message: dbId
        ? `Firestore reachable (databaseId=${dbId}).`
        : "Firestore reachable.",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.toLowerCase().includes("not_found")) {
      try {
        const ids = await listFirestoreDatabaseIds();
        if (ids.length > 0) {
          return {
            ok: false,
            message: `Firestore database ID mismatch. Available IDs: ${ids.join(
              ", ",
            )}. Set FIREBASE_DATABASE_ID and NEXT_PUBLIC_FIREBASE_DATABASE_ID to one of these IDs.`,
          };
        }
      } catch {
        // Ignore secondary lookup errors and return primary error.
      }
    }
    return { ok: false, message: `Firestore error: ${msg}` };
  }
}

async function checkAppsScript() {
  const endpoint = process.env.GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT?.trim();
  if (!endpoint) {
    return { ok: false, message: "GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT is missing." };
  }

  const payload = {
    orderId: "health-check-order",
    orderNumber: "ALM-HEALTH-CHECK",
    uid: "health-check-uid",
    email: "health@example.com",
    customerDetails: {
      fullName: "Health Check",
      phonePk: "03001234567",
      province: "Punjab",
      city: "Lahore",
      tehsil: "Model Town",
      district: "Lahore",
      houseAddress: "N/A",
      shopName: "",
    },
    items: [
      {
        name: "Health Product",
        productId: "health-product",
        color: "Black",
        quantity: 1,
        unitPrice: 1,
        deliveryFee: 0,
        lineTotal: 1,
      },
    ],
    pricing: {
      subtotal: 1,
      deliveryTotal: 0,
      grandTotal: 1,
    },
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      return {
        ok: false,
        message: `Apps Script HTTP ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    if (!parsed || (!parsed.orderSheetId && !parsed.orderSheetUrl)) {
      return {
        ok: false,
        message:
          "Apps Script reachable but not returning orderSheetId/orderSheetUrl.",
      };
    }

    return {
      ok: true,
      message: `Apps Script reachable. Sheet: ${parsed.orderSheetUrl || parsed.orderSheetId}`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Apps Script fetch failed: ${msg}` };
  }
}

async function main() {
  const firestore = await checkFirestore();
  const appsScript = await checkAppsScript();

  console.log("Firestore:", firestore.ok ? "OK" : "FAIL", "-", firestore.message);
  console.log("Apps Script:", appsScript.ok ? "OK" : "FAIL", "-", appsScript.message);

  if (!firestore.ok || !appsScript.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Health check failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
