import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });
dotenv.config();

const required = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `Missing required env vars: ${missing.join(", ")}. Add them in .env.local.`,
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const firestoreDatabaseId =
  process.env.FIREBASE_DATABASE_ID?.trim() ||
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID?.trim() ||
  "default";
const app = getApps()[0];
const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function priceFromMode(priceMode, originalPrice, discountPercent, sellingPrice) {
  if (priceMode === "manual") return Math.max(0, sellingPrice);
  const safeOriginal = Math.max(0, originalPrice);
  const safeDiscount = Math.max(0, Math.min(100, discountPercent));
  return Math.round(safeOriginal * (1 - safeDiscount / 100));
}

const cloudinaryBase = "https://res.cloudinary.com/demo/image/upload";

function sampleImages(seed) {
  return [
    `${cloudinaryBase}/w_1200,h_800,c_fill,q_auto/sample.jpg?seed=${seed}-1`,
    `${cloudinaryBase}/w_1200,h_800,c_fill,g_auto,q_auto/sample.jpg?seed=${seed}-2`,
    `${cloudinaryBase}/w_1200,h_800,c_fill,e_sharpen,q_auto/sample.jpg?seed=${seed}-3`,
  ];
}

const products = [
  {
    name: "Almarky AirBuds X20",
    description:
      "Wireless earbuds with deep bass, ENC calling, and 24-hour backup for everyday use.",
    category: "Electronics",
    type: "Earbuds",
    images: sampleImages("airbuds-x20"),
    isVisible: true,
    priceMode: "auto",
    originalPrice: 5499,
    discountPercent: 22,
    sellingPrice: 0,
    deliveryFee: 220,
    colors: [
      { colorName: "Matte Black", colorHex: "#111827", stock: 14 },
      { colorName: "Frost White", colorHex: "#f8fafc", stock: 9 },
      { colorName: "Navy Blue", colorHex: "#1e3a8a", stock: 7 },
    ],
  },
  {
    name: "Almarky Power Bank 20000mAh",
    description:
      "Fast charging power bank with dual USB output and Type-C input for travel and office.",
    category: "Electronics",
    type: "Power Bank",
    images: sampleImages("powerbank-20000"),
    isVisible: true,
    priceMode: "manual",
    originalPrice: 6999,
    discountPercent: 0,
    sellingPrice: 5999,
    deliveryFee: 260,
    colors: [
      { colorName: "Graphite", colorHex: "#334155", stock: 11 },
      { colorName: "Silver", colorHex: "#cbd5e1", stock: 8 },
    ],
  },
  {
    name: "Almarky Men Casual Shirt",
    description:
      "Breathable cotton casual shirt with regular fit for smart daily styling.",
    category: "Fashion",
    type: "Men Shirt",
    images: sampleImages("men-shirt"),
    isVisible: true,
    priceMode: "auto",
    originalPrice: 2999,
    discountPercent: 18,
    sellingPrice: 0,
    deliveryFee: 180,
    colors: [
      { colorName: "Sky Blue", colorHex: "#60a5fa", stock: 20 },
      { colorName: "Charcoal", colorHex: "#374151", stock: 13 },
      { colorName: "Olive", colorHex: "#4d7c0f", stock: 10 },
    ],
  },
  {
    name: "Almarky Women Handbag Prime",
    description:
      "Premium PU leather handbag with multiple compartments and detachable shoulder strap.",
    category: "Fashion",
    type: "Women Bag",
    images: sampleImages("women-handbag"),
    isVisible: true,
    priceMode: "manual",
    originalPrice: 4999,
    discountPercent: 0,
    sellingPrice: 4299,
    deliveryFee: 230,
    colors: [
      { colorName: "Classic Tan", colorHex: "#b45309", stock: 12 },
      { colorName: "Jet Black", colorHex: "#111827", stock: 15 },
    ],
  },
  {
    name: "Almarky Sports Running Shoes",
    description:
      "Lightweight running shoes with anti-slip sole and soft foam insole for long comfort.",
    category: "Footwear",
    type: "Running Shoes",
    images: sampleImages("running-shoes"),
    isVisible: true,
    priceMode: "auto",
    originalPrice: 8499,
    discountPercent: 27,
    sellingPrice: 0,
    deliveryFee: 280,
    colors: [
      { colorName: "Red Black", colorHex: "#991b1b", stock: 9 },
      { colorName: "Grey White", colorHex: "#9ca3af", stock: 10 },
      { colorName: "Royal Blue", colorHex: "#1d4ed8", stock: 6 },
    ],
  },
  {
    name: "Almarky LED Study Lamp",
    description:
      "Eye-care LED desk lamp with adjustable angle and 3 brightness levels for study setup.",
    category: "Home",
    type: "Lamp",
    images: sampleImages("study-lamp"),
    isVisible: true,
    priceMode: "auto",
    originalPrice: 2599,
    discountPercent: 15,
    sellingPrice: 0,
    deliveryFee: 190,
    colors: [
      { colorName: "Pearl White", colorHex: "#f8fafc", stock: 16 },
      { colorName: "Matte Black", colorHex: "#0f172a", stock: 8 },
    ],
  },
  {
    name: "Almarky Office Backpack 22L",
    description:
      "Water-resistant office backpack with laptop sleeve and ergonomic shoulder support.",
    category: "Bags",
    type: "Backpack",
    images: sampleImages("office-backpack"),
    isVisible: true,
    priceMode: "manual",
    originalPrice: 5199,
    discountPercent: 0,
    sellingPrice: 4699,
    deliveryFee: 240,
    colors: [
      { colorName: "Ash Grey", colorHex: "#6b7280", stock: 11 },
      { colorName: "Deep Black", colorHex: "#111827", stock: 17 },
    ],
  },
  {
    name: "Almarky Smart Watch FitPro",
    description:
      "Smart watch with heart rate tracking, call alerts, and IP67 water resistance.",
    category: "Electronics",
    type: "Smart Watch",
    images: sampleImages("smart-watch"),
    isVisible: true,
    priceMode: "auto",
    originalPrice: 7499,
    discountPercent: 24,
    sellingPrice: 0,
    deliveryFee: 250,
    colors: [
      { colorName: "Midnight Black", colorHex: "#0f172a", stock: 10 },
      { colorName: "Rose Gold", colorHex: "#d4a373", stock: 7 },
      { colorName: "Steel Silver", colorHex: "#cbd5e1", stock: 8 },
    ],
  },
  {
    name: "Almarky Kitchen Knife Set 6pcs",
    description:
      "Stainless steel knife set with ergonomic grip, designed for safe daily kitchen use.",
    category: "Home",
    type: "Kitchen",
    images: sampleImages("knife-set"),
    isVisible: true,
    priceMode: "manual",
    originalPrice: 3999,
    discountPercent: 0,
    sellingPrice: 3399,
    deliveryFee: 210,
    colors: [
      { colorName: "Black Handle", colorHex: "#1f2937", stock: 13 },
      { colorName: "Wood Handle", colorHex: "#92400e", stock: 9 },
    ],
  },
  {
    name: "Almarky Baby Care Combo Pack",
    description:
      "Complete baby care combo with gentle material essentials for newborn daily routine.",
    category: "Kids",
    type: "Baby Care",
    images: sampleImages("baby-care"),
    isVisible: true,
    priceMode: "auto",
    originalPrice: 4599,
    discountPercent: 20,
    sellingPrice: 0,
    deliveryFee: 200,
    colors: [
      { colorName: "Pastel Pink", colorHex: "#f9a8d4", stock: 14 },
      { colorName: "Pastel Blue", colorHex: "#93c5fd", stock: 12 },
    ],
  },
];

async function upsertExampleProducts() {
  let created = 0;
  let updated = 0;

  for (const product of products) {
    const slug = slugify(product.name);
    const sellingPrice = priceFromMode(
      product.priceMode,
      product.originalPrice,
      product.discountPercent,
      product.sellingPrice,
    );
    const colors = product.colors.map((color) => ({
      colorName: color.colorName.trim(),
      colorHex: color.colorHex.trim(),
      stock: Math.max(0, Number(color.stock) || 0),
    }));
    const totalStock = colors.reduce((sum, color) => sum + color.stock, 0);

    const payload = {
      name: product.name.trim(),
      slug,
      description: product.description.trim(),
      category: product.category.trim(),
      type: product.type.trim(),
      images: product.images,
      isVisible: product.isVisible,
      isDeleted: false,
      priceMode: product.priceMode,
      originalPrice: product.originalPrice,
      discountPercent: product.discountPercent,
      sellingPrice,
      deliveryFee: product.deliveryFee,
      colors,
      totalStock,
      createdBy: "seed-script@almarky.local",
      updatedAt: FieldValue.serverTimestamp(),
    };

    const existingBySlug = await db
      .collection("products")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (!existingBySlug.empty) {
      const docRef = existingBySlug.docs[0].ref;
      await docRef.set(payload, { merge: true });
      updated += 1;
      console.log(`updated: ${product.name}`);
      continue;
    }

    await db.collection("products").add({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    });
    created += 1;
    console.log(`created: ${product.name}`);
  }

  console.log(`\nDone. created=${created}, updated=${updated}, total=${products.length}`);
}

upsertExampleProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  });
