import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { CUSTOMER_SUPPORT_EMAIL } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const maxDuration = 30;

class ContactError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ContactPayload = {
  fullName?: string;
  email?: string;
  phonePk?: string;
  subject?: string;
  message?: string;
};

type ContactRelayResult =
  | {
      delivered: true;
    }
  | {
      delivered: false;
      reason: "legacy_endpoint";
    };

function requireString(value: unknown) {
  return String(value ?? "").trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getContactReceiverEmail() {
  return (
    process.env.CONTACT_RECEIVER_EMAIL?.trim() ||
    CUSTOMER_SUPPORT_EMAIL
  );
}

function getContactEndpoint() {
  return (
    process.env.GOOGLE_APPS_SCRIPT_CONTACT_ENDPOINT?.trim() ||
    process.env.GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT?.trim() ||
    ""
  );
}

function isLegacyOrderOnlyScriptMessage(input: string) {
  const message = input.toLowerCase();
  return (
    message.includes("missing orderid") ||
    message.includes("missing order number") ||
    message.includes("missing ordernumber") ||
    message.includes("missing customerdetails") ||
    message.includes("missing order items")
  );
}

function normalizePayload(input: ContactPayload) {
  const fullName = requireString(input.fullName);
  const email = requireString(input.email).toLowerCase();
  const phonePk = requireString(input.phonePk);
  const subject = requireString(input.subject);
  const message = requireString(input.message);

  if (!fullName) throw new ContactError("Full name is required.");
  if (!email) throw new ContactError("Email is required.");
  if (!isEmail(email)) throw new ContactError("Enter a valid email address.");
  if (!subject) throw new ContactError("Subject is required.");
  if (subject.length > 140) {
    throw new ContactError("Subject is too long. Keep it under 140 characters.");
  }
  if (!message) throw new ContactError("Message is required.");
  if (message.length < 10) {
    throw new ContactError("Message is too short.");
  }
  if (message.length > 4000) {
    throw new ContactError("Message is too long. Keep it under 4000 characters.");
  }

  return {
    fullName,
    email,
    phonePk,
    subject,
    message,
  };
}

async function sendContactViaAppsScript(payload: {
  fullName: string;
  email: string;
  phonePk: string;
  subject: string;
  message: string;
}): Promise<ContactRelayResult> {
  const endpoint = getContactEndpoint();
  if (!endpoint) {
    throw new ContactError("Support relay is temporarily unavailable.", 503);
  }

  const endpointUrl = new URL(endpoint);
  const sharedSecret = process.env.GOOGLE_APPS_SCRIPT_CONTACT_SECRET?.trim();
  if (sharedSecret) {
    endpointUrl.searchParams.set("secret", sharedSecret);
  }

  const requestBody = {
    type: "contact",
    to: getContactReceiverEmail(),
    fullName: payload.fullName,
    email: payload.email,
    phonePk: payload.phonePk,
    subject: payload.subject,
    message: payload.message,
    source: "almarky-web",
    submittedAt: new Date().toISOString(),
  };

  const controller = new AbortController();
  const timeoutMs = Math.max(
    10000,
    Number(process.env.GOOGLE_APPS_SCRIPT_TIMEOUT_MS || 60000),
  );
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    let parsed: { ok?: boolean; message?: string } | null = null;
    try {
      parsed = JSON.parse(text) as { ok?: boolean; message?: string };
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const detail = parsed?.message || text || `Contact endpoint error (${response.status}).`;
      if (isLegacyOrderOnlyScriptMessage(detail)) {
        return {
          delivered: false,
          reason: "legacy_endpoint",
        };
      }
      throw new ContactError(
        detail,
        502,
      );
    }

    if (!parsed || parsed.ok === false) {
      const detail = String(parsed?.message ?? "").trim();
      if (isLegacyOrderOnlyScriptMessage(detail)) {
        return {
          delivered: false,
          reason: "legacy_endpoint",
        };
      }
      throw new ContactError(
        detail || "Contact endpoint did not accept this message.",
        502,
      );
    }
    return { delivered: true };
  } catch (error) {
    if (error instanceof ContactError) throw error;
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Contact request timed out. Please try again."
        : error instanceof Error
          ? error.message
          : "Contact service request failed.";
    throw new ContactError(message, 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  let messageRefId = "";
  try {
    const input = (await request.json()) as ContactPayload;
    const payload = normalizePayload(input);

    const db = getAdminDb();
    const messageRef = db.collection("contactMessages").doc();
    messageRefId = messageRef.id;

    await messageRef.set({
      fullName: payload.fullName,
      email: payload.email,
      phonePk: payload.phonePk,
      subject: payload.subject,
      message: payload.message,
      to: getContactReceiverEmail(),
      status: "received",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      source: "web-contact-form",
    });

    try {
      const relayResult = await sendContactViaAppsScript(payload);

      if (!relayResult.delivered) {
        await messageRef.set(
          {
            status: "email_failed",
            failureReason: "Delivery delayed.",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        return NextResponse.json({
          ok: true,
          message: "Message sent successfully.",
          contactId: messageRef.id,
        });
      }

      await messageRef.set(
        {
          status: "emailed",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch {
      const warning = "Delivery delayed.";

      await messageRef.set(
        {
          status: "email_failed",
          failureReason: warning,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return NextResponse.json({
        ok: true,
        message: "Message sent successfully.",
        contactId: messageRef.id,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Message sent successfully.",
      contactId: messageRef.id,
    });
  } catch (error) {
    const fallbackMessage =
      error instanceof ContactError ? error.message : "Failed to send message.";
    const status = error instanceof ContactError ? error.status : 500;
    const storedFailureReason = status >= 500 ? "Delivery delayed." : fallbackMessage;

    if (messageRefId) {
      try {
        await getAdminDb().collection("contactMessages").doc(messageRefId).set(
          {
            status: "email_failed",
            failureReason: storedFailureReason,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } catch {
        // Ignore secondary persistence errors.
      }
    }

    return NextResponse.json(
      {
        ok: false,
        message:
          status >= 500
            ? "Support service is temporarily unavailable. Please try again shortly."
            : fallbackMessage,
      },
      { status },
    );
  }
}
