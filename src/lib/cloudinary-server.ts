import "server-only";
import crypto from "crypto";

const CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

function hasCredentials() {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

function isTransformSegment(segment: string) {
  if (!segment) return false;
  if (segment.includes(",")) return true;
  return /(c_|w_|h_|q_|f_|g_|ar_)/.test(segment);
}

export function extractCloudinaryPublicId(url: string) {
  if (!url || !CLOUD_NAME) return null;
  if (!url.includes(`/res.cloudinary.com/${CLOUD_NAME}/`)) return null;
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rest = url.slice(idx + marker.length).split("?")[0] || "";
  let segments = rest.split("/").filter(Boolean);
  while (segments.length && isTransformSegment(segments[0])) {
    segments = segments.slice(1);
  }
  if (segments[0] && /^v\d+$/.test(segments[0])) {
    segments = segments.slice(1);
  }
  if (!segments.length) return null;
  const publicIdWithExt = segments.join("/");
  return publicIdWithExt.replace(/\.[^/.]+$/, "");
}

async function deleteCloudinaryByPublicId(publicId: string) {
  if (!hasCredentials()) {
    throw new Error("Cloudinary credentials missing.");
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`)
    .digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    api_key: API_KEY,
    timestamp: String(timestamp),
    signature,
    invalidate: "true",
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
    { method: "POST", body },
  );
  if (!response.ok) {
    throw new Error(`Cloudinary delete failed (${response.status}).`);
  }
  const result = (await response.json()) as { result?: string };
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("Cloudinary delete failed.");
  }
}

export async function deleteCloudinaryImages(urls: string[]) {
  if (!urls.length) return { deleted: 0, skipped: 0 };
  if (!hasCredentials()) {
    throw new Error("Cloudinary credentials missing.");
  }
  const publicIds = Array.from(
    new Set(
      urls
        .map((url) => extractCloudinaryPublicId(url))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let deleted = 0;
  const skipped = urls.length - publicIds.length;

  for (const publicId of publicIds) {
    await deleteCloudinaryByPublicId(publicId);
    deleted += 1;
  }

  return { deleted, skipped };
}
