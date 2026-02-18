import { BRAND_NAME, CUSTOMER_SUPPORT_EMAIL } from "@/lib/constants";

export default function TermsOfServicePage() {
  return (
    <section className="anim-page-enter mx-auto max-w-4xl space-y-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
      <header>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Effective date: {new Date().toLocaleDateString("en-PK")}
        </p>
      </header>

      <p className="text-sm leading-7 text-slate-700">
        These terms govern your access to and use of {BRAND_NAME}. By using this
        website, you agree to these terms.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Use of Platform</h2>
        <p className="text-sm leading-7 text-slate-700">
          You agree to use the platform lawfully, provide accurate information,
          protect your account, and avoid any misuse, fraud, abuse, or technical
          disruption.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Products and Pricing</h2>
        <p className="text-sm leading-7 text-slate-700">
          Product availability, stock, and prices can change without prior notice.
          We aim to keep listings accurate, but occasional errors may occur and can
          be corrected.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Orders and COD</h2>
        <p className="text-sm leading-7 text-slate-700">
          Orders are placed as Cash on Delivery unless explicitly stated otherwise.
          You are responsible for providing valid contact and delivery details at
          checkout.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Intellectual Property</h2>
        <p className="text-sm leading-7 text-slate-700">
          All website content, branding, layout, and software elements are owned by
          {BRAND_NAME} or its licensors and may not be reused without permission.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Service Availability</h2>
        <p className="text-sm leading-7 text-slate-700">
          We may update, maintain, or improve platform features at any time.
          Temporary service interruptions can occur due to maintenance or external
          provider issues.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Limitation of Liability</h2>
        <p className="text-sm leading-7 text-slate-700">
          To the extent permitted by law, {BRAND_NAME} is not liable for indirect or
          consequential losses arising from use of the platform.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Contact</h2>
        <p className="text-sm leading-7 text-slate-700">
          For terms-related questions, contact{" "}
          <a
            href={`mailto:${CUSTOMER_SUPPORT_EMAIL}`}
            className="font-semibold text-slate-900 underline"
          >
            {CUSTOMER_SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </section>
  );
}
