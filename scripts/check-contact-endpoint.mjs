import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function getEndpoint() {
  return (
    process.env.GOOGLE_APPS_SCRIPT_CONTACT_ENDPOINT?.trim() ||
    process.env.GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT?.trim() ||
    ""
  );
}

async function main() {
  const endpoint = getEndpoint();
  if (!endpoint) {
    console.error(
      "Contact endpoint not configured. Set GOOGLE_APPS_SCRIPT_CONTACT_ENDPOINT.",
    );
    process.exit(1);
  }

  const url = new URL(endpoint);
  const secret =
    process.env.GOOGLE_APPS_SCRIPT_CONTACT_SECRET?.trim() ||
    process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET?.trim() ||
    "";
  if (secret) {
    url.searchParams.set("secret", secret);
  }

  const payload = {
    type: "contact",
    to: process.env.CONTACT_RECEIVER_EMAIL?.trim() || "almarkycustomerservice@gmail.com",
    fullName: "Almarky Contact Health Check",
    email: "healthcheck@example.com",
    phonePk: "03001234567",
    subject: "Contact endpoint health check",
    message: "Automated health-check message from Almarky deploy check script.",
    source: "health-check",
    submittedAt: new Date().toISOString(),
  };

  const response = await fetch(url.toString(), {
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

  if (!response.ok || !parsed || parsed.ok === false) {
    const message = parsed?.message || text || `HTTP ${response.status}`;
    if (String(message).toLowerCase().includes("missing orderid")) {
      console.warn(
        "Contact endpoint is still old order-only script. Live app will keep contact message in Firestore fallback. Re-deploy latest Apps Script for direct email relay.",
      );
      process.exit(0);
    }
    console.error(`Contact endpoint check failed: ${message}`);
    process.exit(1);
  }

  console.log("Contact endpoint check passed.");
}

main().catch((error) => {
  console.error("Contact endpoint check failed:", error.message);
  process.exit(1);
});
