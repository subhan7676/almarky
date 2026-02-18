import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const requiredPublic = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
];

const requiredServerBase = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

function hasValue(key) {
  return Boolean(process.env[key] && String(process.env[key]).trim());
}

function collectMissing(keys) {
  return keys.filter((key) => !hasValue(key));
}

const missingPublic = collectMissing(requiredPublic);
const missingServerBase = collectMissing(requiredServerBase);

const usingAppsScript = hasValue("GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT");
const usingServiceAccountSheets =
  hasValue("GOOGLE_SERVICE_ACCOUNT_EMAIL") &&
  hasValue("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

let missingModeVars = [];
let modeMessage = "";
let missingDbIdConfig = [];

if (usingAppsScript) {
  modeMessage = "Order mode: Google Apps Script";
  // shared secret optional
} else if (usingServiceAccountSheets) {
  modeMessage = "Order mode: Google Service Account";
} else {
  modeMessage = "Order mode: NOT CONFIGURED";
  missingModeVars = [
    "Set GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT OR set both GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  ];
}

const serverDbId = hasValue("FIREBASE_DATABASE_ID");
const clientDbId = hasValue("NEXT_PUBLIC_FIREBASE_DATABASE_ID");
if (serverDbId !== clientDbId) {
  missingDbIdConfig = [
    "Set BOTH FIREBASE_DATABASE_ID and NEXT_PUBLIC_FIREBASE_DATABASE_ID together (or remove both).",
  ];
}

if (
  missingPublic.length === 0 &&
  missingServerBase.length === 0 &&
  missingModeVars.length === 0 &&
  missingDbIdConfig.length === 0
) {
  console.log("Deploy env check passed.");
  console.log(modeMessage);
  process.exit(0);
}

console.error("Deploy env check failed.");
console.error(modeMessage);

if (missingPublic.length > 0) {
  console.error("\nMissing public env vars:");
  for (const key of missingPublic) console.error(`- ${key}`);
}

if (missingServerBase.length > 0) {
  console.error("\nMissing server env vars:");
  for (const key of missingServerBase) console.error(`- ${key}`);
}

if (missingModeVars.length > 0) {
  console.error("\nOrder mode config issue:");
  for (const line of missingModeVars) console.error(`- ${line}`);
}

if (missingDbIdConfig.length > 0) {
  console.error("\nFirestore database-id config issue:");
  for (const line of missingDbIdConfig) console.error(`- ${line}`);
}

process.exit(1);
