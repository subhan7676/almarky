import "server-only";

const LOCKED_ADMIN_EMAIL = "subhanahmadofficialcompany@gmail.com";

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export async function isServerAdminEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  return Boolean(normalized && normalized === LOCKED_ADMIN_EMAIL);
}
