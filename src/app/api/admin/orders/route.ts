import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isServerAdminEmail } from "@/lib/server/admin-access";

export const runtime = "nodejs";

class AdminOrdersError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type DeletePayload = {
  action: "delete";
  orderId: string;
};

type AdminOrdersPayload = DeletePayload;

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "").trim();
}

async function assertAdminEmail(email?: string | null) {
  const allowed = await isServerAdminEmail(email);
  if (!allowed) {
    throw new AdminOrdersError("Admin access denied.", 403);
  }
}

async function deleteOrder(orderId: string) {
  const db = getAdminDb();
  await db.collection("orders").doc(orderId).delete();
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AdminOrdersError("Missing authorization token.", 401);

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    await assertAdminEmail(decoded.email);

    const body = (await request.json()) as AdminOrdersPayload;
    if (!body?.action) {
      throw new AdminOrdersError("Missing action.");
    }

    if (body.action === "delete") {
      if (!body.orderId) throw new AdminOrdersError("orderId is required.");
      await deleteOrder(body.orderId);
      return NextResponse.json({ ok: true });
    }

    throw new AdminOrdersError("Unsupported action.");
  } catch (error) {
    if (error instanceof AdminOrdersError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Admin order request failed." },
      { status: 500 },
    );
  }
}
