# Almarky

Almarky is a mobile-first, realtime COD marketplace built with Next.js, Firebase, and Cloudinary.

## Stack
- Next.js 16 + TypeScript + Tailwind CSS
- Firebase Auth (Google login)
- Firestore (products/admin data)
- Google Sheets + Google Drive (per-order spreadsheet file)
- Firebase Admin SDK API route for secure checkout auth token verification
- Cloudinary unsigned upload preset for product images
- Local device storage (browser localStorage) for cart + profile data

## Features
- Marketplace storefront with search and category filters
- Product detail page with multi-image gallery and per-color stock
- User cart with multi-item selection and partial checkout support (device local storage)
- COD checkout with Pakistani address fields and double confirmation modal
- Profile dashboard with local personal/address/preferences data
- Hidden footer admin entry (5 taps/clicks) -> `/admin/login`
- Legal pages:
  - `/about-us`
  - `/privacy-policy`
  - `/terms-of-service`
  - `/contact-us`
- Multi-page admin panel (`/admin/panel`) with:
  - Overview
  - Products
  - Orders
  - Users
  - Settings
- Admin controls for:
  - Add/update products
  - Direct device-to-Cloudinary background uploads with auto URL linking
  - Price mode (`auto` or `manual`)
  - Delivery fee per product
  - Per-color stock control
  - Visibility toggle and soft delete
  - Order status updates (`pending`, `delivered`, `cancelled`)
  - Live store settings (store name, notice, maintenance mode)
- Secure server route `/api/orders/place` for:
  - Firebase ID token verification
  - Google Sheets per-order file creation
  - Optional summary append in master sheet
- Secure server route `/api/contact` for:
  - Contact message validation
  - Contact message backup in Firestore (`contactMessages`)
  - Google Apps Script email dispatch to customer support mailbox

## Local Setup
1. Install dependencies:
   - `npm install`
2. Create env file:
   - copy `.env.example` to `.env.local`
3. Fill `.env.local` values.
4. Run development server:
   - `npm run dev`
5. Pre-deploy env check:
   - `npm run check:deploy`

## Required Environment Variables
### Public (client)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_DATABASE_ID` (optional, set when project uses non-standard DB id like `default`)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

### Private (server API route)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_DATABASE_ID` (optional, must match `NEXT_PUBLIC_FIREBASE_DATABASE_ID` when set)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_DRIVE_ORDERS_FOLDER_ID` (optional but recommended)
- `GOOGLE_ORDERS_MASTER_SPREADSHEET_ID` (optional)
- `GOOGLE_ORDERS_SHEET_TAB` (optional, default `Orders`)
- `GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT` (optional alternative to service account mode)
- `GOOGLE_APPS_SCRIPT_SHARED_SECRET` (optional, for endpoint protection)
- `GOOGLE_APPS_SCRIPT_TIMEOUT_MS` (optional, default `60000`)
- `GOOGLE_APPS_SCRIPT_MAX_RETRIES` (optional, default `3`)
- `GOOGLE_APPS_SCRIPT_CONTACT_ENDPOINT` (optional; if not set, falls back to `GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT`)
- `GOOGLE_APPS_SCRIPT_CONTACT_SECRET` (optional)
- `CONTACT_RECEIVER_EMAIL` (optional, default `almarkycustomerservice@gmail.com`)

Note for `FIREBASE_PRIVATE_KEY`: include newline escapes (`\n`) in env.
Note for `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: include newline escapes (`\n`) in env.

## Firebase Setup
1. Create Firebase project.
2. Enable Authentication -> Google provider.
3. Create Firestore database (for products/admin panel).
4. Deploy rules/indexes from this repo:
   - `firebase deploy --only firestore:rules,firestore:indexes,storage`

Files used:
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`

## Admin Bootstrap
1. Create Firestore document:
   - `adminConfig/global`
2. Add field:
   - `adminEmails` (array of authorized Google emails)
3. Optional fallback:
   - set `ALMARKY_ADMIN_EMAIL` in server env.

## Cloudinary Setup
1. Create unsigned upload preset.
2. Restrict preset for security:
   - folder: `almarky/products`
   - allowed image formats only
   - max file size
3. Set:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

## Google Sheets Order Setup
You can use **either** service-account mode or Apps Script mode.

### Option A: Service Account Mode
1. Open Google Cloud Console for your project and enable:
   - Google Sheets API
   - Google Drive API
2. Create a Service Account and generate JSON key.
3. Put service account values in `.env.local`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
4. Create a Google Drive folder for orders and share it with service account email as `Editor`.
5. Set `GOOGLE_DRIVE_ORDERS_FOLDER_ID` from that folder URL.
6. (Optional) Create one master spreadsheet for order index and set:
   - `GOOGLE_ORDERS_MASTER_SPREADSHEET_ID`
   - `GOOGLE_ORDERS_SHEET_TAB`

### Option B: Google Apps Script Webhook Mode
1. Deploy your Apps Script as Web App.
2. Put deployment URL in `.env.local`:
   - `GOOGLE_APPS_SCRIPT_ORDER_ENDPOINT=https://script.google.com/macros/s/.../exec`
3. (Optional) set shared secret and validate it inside Apps Script:
   - `GOOGLE_APPS_SCRIPT_SHARED_SECRET=...`
   - App sends it as query param `?secret=...` to your Apps Script URL.
4. If this endpoint variable is present, app uses Apps Script mode for order write.

## Contact Form Email Setup
1. Use the Apps Script template:
   - `scripts/google-apps-script-orders.gs`
2. This script now supports both:
   - order creation payloads
   - contact payloads (`type: "contact"`)
3. Re-deploy the script as a new Web App version after updating code.
4. Set env vars:
   - `GOOGLE_APPS_SCRIPT_CONTACT_ENDPOINT` (or rely on order endpoint fallback)
   - `GOOGLE_APPS_SCRIPT_CONTACT_SECRET` (optional)
   - `CONTACT_RECEIVER_EMAIL=almarkycustomerservice@gmail.com`
5. Verify:
   - `npm run check:contact`

## Production Deploy (Vercel)
1. Push this repo to GitHub.
2. Import project in Vercel.
3. Add all env vars in Vercel Project Settings:
   - Production + Preview both.
4. In Firebase Console -> Authentication -> Settings -> Authorized domains:
   - Add your Vercel production domain.
   - Add your Vercel preview domain pattern if needed.
5. Re-deploy.
6. Run smoke test on production:
   - Google login
   - Product listing load
   - Cart add/remove
   - COD checkout
   - Admin login + product create/update

## Scripts
- `npm run dev` - start dev server
- `npm run lint` - lint check
- `npm run build` - production build
- `npm run start` - run production server
- `npm run seed:products` - upload/update 10 example products in Firestore
- `npm run check:deploy` - validate env variables before GitHub/Vercel deploy
- `npm run check:live` - verify Firestore + Apps Script live connectivity
- `npm run check:contact` - verify contact-email Apps Script endpoint behavior
- `npm run smoke:order` - end-to-end checkout API smoke test (creates + auto-cleans a test order)
- `npm run smoke:admin` - admin product API smoke test (create + soft-delete verification)

## Security Model
- Firestore rules allow:
  - Public read only for visible + non-deleted products
  - Admin-only product management
  - User/admin order read; direct client order writes denied
- Checkout order creation/stock update is done via server API route with Firebase Admin SDK.
- Order sheets are created server-side using service account credentials.

## Notes
- Content updates are realtime via Firestore snapshots (no redeploy needed for product data changes).
- Payment mode is COD only.
- For global live product sync across all users/devices, Firestore database must be reachable with correct database id.
- If `check:live` shows Firestore database-id mismatch, set both:
  - `FIREBASE_DATABASE_ID`
  - `NEXT_PUBLIC_FIREBASE_DATABASE_ID`
  to the reported value (common value: `default`).
