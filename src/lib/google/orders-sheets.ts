import { google } from "googleapis";
import type { CustomerDetails, OrderItem } from "@/types/commerce";

type OrderSheetPayload = {
  orderId: string;
  orderNumber: string;
  uid: string;
  email: string;
  customerDetails: CustomerDetails;
  items: OrderItem[];
  subtotal: number;
  deliveryTotal: number;
  grandTotal: number;
  createdAt: Date;
};

type OrderSheetResult = {
  spreadsheetId: string;
  spreadsheetUrl: string;
  masterLogged: boolean;
};

type AppsScriptOrderResponse = {
  ok?: boolean;
  message?: string;
  orderSheetId?: string;
  spreadsheetId?: string;
  fileId?: string;
  orderSheetUrl?: string;
  spreadsheetUrl?: string;
  fileUrl?: string;
  masterLogged?: boolean;
};

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function getAppsScriptEndpoint() {
  return process.env.GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT?.trim() ?? "";
}

function hasServiceAccountCredentials() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim(),
  );
}

function getServiceAccountPrivateKey() {
  return requireEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
}

type GoogleJwtClient = InstanceType<typeof google.auth.JWT>;

let cachedAuthClient: GoogleJwtClient | null = null;
let cachedSheetsClient: ReturnType<typeof google.sheets> | null = null;
let cachedDriveClient: ReturnType<typeof google.drive> | null = null;

function getAuthClient() {
  if (cachedAuthClient) return cachedAuthClient;

  const authClient = new google.auth.JWT({
    email: requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: getServiceAccountPrivateKey(),
    scopes: [SHEETS_SCOPE, DRIVE_SCOPE],
  });

  cachedAuthClient = authClient;
  return authClient;
}

function getSheetsClient() {
  if (cachedSheetsClient) return cachedSheetsClient;
  cachedSheetsClient = google.sheets({
    version: "v4",
    auth: getAuthClient(),
  });
  return cachedSheetsClient;
}

function getDriveClient() {
  if (cachedDriveClient) return cachedDriveClient;
  cachedDriveClient = google.drive({
    version: "v3",
    auth: getAuthClient(),
  });
  return cachedDriveClient;
}

function safeSheetTitle(value: string) {
  return value
    .replace(/[\\/:*?"<>|\[\]]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);
}

async function moveFileToFolderIfConfigured(fileId: string) {
  const folderId = process.env.GOOGLE_DRIVE_ORDERS_FOLDER_ID?.trim();
  if (!folderId) return;

  const drive = getDriveClient();
  const file = await drive.files.get({
    fileId,
    fields: "parents",
    supportsAllDrives: true,
  });
  const existingParents = file.data.parents?.join(",");

  await drive.files.update({
    fileId,
    addParents: folderId,
    removeParents: existingParents,
    fields: "id, parents",
    supportsAllDrives: true,
  });
}

async function appendToMasterSheet(params: {
  orderId: string;
  orderNumber: string;
  uid: string;
  email: string;
  customerDetails: CustomerDetails;
  subtotal: number;
  deliveryTotal: number;
  grandTotal: number;
  createdAt: Date;
  spreadsheetUrl: string;
}) {
  const spreadsheetId = process.env.GOOGLE_ORDERS_MASTER_SPREADSHEET_ID?.trim();
  if (!spreadsheetId) return false;

  const tabName = process.env.GOOGLE_ORDERS_SHEET_TAB?.trim() || "Orders";
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          params.createdAt.toISOString(),
          params.orderNumber,
          params.orderId,
          params.uid,
          params.email,
          params.customerDetails.fullName,
          params.customerDetails.phonePk,
          params.customerDetails.province,
          params.customerDetails.city,
          params.customerDetails.tehsil,
          params.customerDetails.district,
          params.customerDetails.houseAddress,
          params.customerDetails.shopName ?? "",
          params.subtotal,
          params.deliveryTotal,
          params.grandTotal,
          params.spreadsheetUrl,
        ],
      ],
    },
  });

  return true;
}

function buildOrderRows(payload: OrderSheetPayload) {
  const rows: Array<Array<string | number>> = [
    ["ALMARKY ORDER"],
    ["Order Number", payload.orderNumber],
    ["Order ID", payload.orderId],
    ["Created At", payload.createdAt.toISOString()],
    ["User UID", payload.uid],
    ["User Email", payload.email || "N/A"],
    [],
    ["Customer Details"],
    ["Full Name", payload.customerDetails.fullName],
    ["Phone", payload.customerDetails.phonePk],
    ["Province", payload.customerDetails.province],
    ["City", payload.customerDetails.city],
    ["Tehsil", payload.customerDetails.tehsil],
    ["District", payload.customerDetails.district],
    ["House Address", payload.customerDetails.houseAddress],
    ["Shop Name", payload.customerDetails.shopName?.trim() || "N/A"],
    [],
    ["Items"],
    [
      "#",
      "Product Name",
      "Product ID",
      "Color",
      "Quantity",
      "Unit Price",
      "Delivery Fee",
      "Line Total",
    ],
  ];

  payload.items.forEach((item, index) => {
    rows.push([
      index + 1,
      item.name,
      item.productId,
      item.color,
      item.quantity,
      item.unitPrice,
      item.deliveryFee,
      item.lineTotal,
    ]);
  });

  rows.push([]);
  rows.push(["Subtotal", payload.subtotal]);
  rows.push(["Delivery Total", payload.deliveryTotal]);
  rows.push(["Grand Total", payload.grandTotal]);

  return rows;
}

function normalizeAppsScriptResponse(
  response: AppsScriptOrderResponse,
  fallbackOrderId: string,
) {
  const providedSheetId =
    response.orderSheetId?.trim() ||
    response.spreadsheetId?.trim() ||
    response.fileId?.trim() ||
    "";
  const spreadsheetUrl =
    response.orderSheetUrl?.trim() ||
    response.spreadsheetUrl?.trim() ||
    response.fileUrl?.trim() ||
    "";

  if (!providedSheetId && !spreadsheetUrl) {
    throw new Error(
      "Apps Script responded without orderSheetId/orderSheetUrl. Deploy the full order-creation webhook script.",
    );
  }

  const spreadsheetId = providedSheetId || fallbackOrderId;

  return {
    spreadsheetId,
    spreadsheetUrl,
    masterLogged: Boolean(response.masterLogged),
  } satisfies OrderSheetResult;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createOrderViaAppsScript(
  payload: OrderSheetPayload,
): Promise<OrderSheetResult> {
  const endpoint = getAppsScriptEndpoint();
  if (!endpoint) {
    throw new Error("Missing required env: GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT");
  }

  const sharedSecret = process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET?.trim();
  const endpointUrl = new URL(endpoint);
  if (sharedSecret) {
    endpointUrl.searchParams.set("secret", sharedSecret);
  }
  const requestPayload = {
    source: "almarky-web",
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    uid: payload.uid,
    email: payload.email,
    customerDetails: payload.customerDetails,
    items: payload.items,
    pricing: {
      subtotal: payload.subtotal,
      deliveryTotal: payload.deliveryTotal,
      grandTotal: payload.grandTotal,
    },
    createdAt: payload.createdAt.toISOString(),
  };

  const timeoutMs = Math.max(
    15000,
    Number(process.env.GOOGLE_APPS_SCRIPT_TIMEOUT_MS || 60000),
  );
  const maxRetries = Math.min(
    4,
    Math.max(1, Number(process.env.GOOGLE_APPS_SCRIPT_MAX_RETRIES || 3)),
  );

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpointUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        cache: "no-store",
        signal: controller.signal,
      });

      const text = await response.text();
      let parsed: AppsScriptOrderResponse | null = null;
      try {
        parsed = JSON.parse(text) as AppsScriptOrderResponse;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        const detail = parsed?.message?.trim() || text.slice(0, 240) || "Unknown error";
        throw new Error(
          `Google Apps Script request failed (${response.status}): ${detail}`,
        );
      }

      if (!parsed) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes("script function not found: dopost")) {
          throw new Error(
            "Apps Script deployment does not include doPost(e). Paste the webhook script, save, create a new deployment version, and update GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT.",
          );
        }
        if (
          lowerText.includes("sign in") ||
          lowerText.includes("accounts.google.com")
        ) {
          throw new Error(
            "Apps Script endpoint requires Google login. Re-deploy Web App with access set to Anyone.",
          );
        }
        throw new Error(
          "Google Apps Script returned non-JSON response. Set deployment access to Anyone and return JSON from doPost.",
        );
      }

      if (parsed?.ok === false) {
        throw new Error(parsed.message || "Google Apps Script rejected the order.");
      }

      return normalizeAppsScriptResponse(parsed, payload.orderId);
    } catch (error) {
      const mappedError =
        error instanceof Error ? error : new Error("Unknown Apps Script error.");
      lastError = mappedError;

      const text = mappedError.message.toLowerCase();
      const isRetryable =
        text.includes("fetch failed") ||
        text.includes("network") ||
        text.includes("timeout") ||
        text.includes("timed out") ||
        text.includes("aborted");

      if (!isRetryable || attempt >= maxRetries) {
        break;
      }

      await sleep(700 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError) {
    const normalized = lastError.message.toLowerCase();
    if (normalized.includes("aborted")) {
      throw new Error(
        `Google Apps Script request timed out after ${timeoutMs}ms.`,
      );
    }
    throw lastError;
  }

  throw new Error("Google Apps Script request failed.");
}

export async function createOrderSpreadsheet(
  payload: OrderSheetPayload,
): Promise<OrderSheetResult> {
  if (getAppsScriptEndpoint()) {
    try {
      return await createOrderViaAppsScript(payload);
    } catch (appsScriptError) {
      if (!hasServiceAccountCredentials()) {
        throw appsScriptError;
      }
    }
  }

  const sheets = getSheetsClient();

  const title = safeSheetTitle(`Almarky Order ${payload.orderNumber}`);
  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title,
      },
      sheets: [{ properties: { title: "Order" } }],
    },
    fields: "spreadsheetId,spreadsheetUrl",
  });

  const spreadsheetId = createResponse.data.spreadsheetId;
  const spreadsheetUrl = createResponse.data.spreadsheetUrl;

  if (!spreadsheetId || !spreadsheetUrl) {
    throw new Error("Google Sheets did not return a spreadsheet id.");
  }

  await moveFileToFolderIfConfigured(spreadsheetId);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Order!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: buildOrderRows(payload),
    },
  });

  const masterLogged = await appendToMasterSheet({
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    uid: payload.uid,
    email: payload.email,
    customerDetails: payload.customerDetails,
    subtotal: payload.subtotal,
    deliveryTotal: payload.deliveryTotal,
    grandTotal: payload.grandTotal,
    createdAt: payload.createdAt,
    spreadsheetUrl,
  }).catch(() => false);

  return {
    spreadsheetId,
    spreadsheetUrl,
    masterLogged,
  };
}
