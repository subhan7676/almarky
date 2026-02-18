import { BRAND_NAME, CUSTOMER_SUPPORT_EMAIL } from "@/lib/constants";

export default function AboutUsPage() {
  return (
    <section className="anim-page-enter mx-auto max-w-4xl space-y-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
      <header>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
          About Us
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {BRAND_NAME} is a Pakistan-focused mobile-first marketplace.
        </p>
      </header>

      <p className="text-sm leading-7 text-slate-700">
        We built {BRAND_NAME} to make online shopping simple, fast, and reliable
        for customers and sellers. Our platform focuses on clear product details,
        realtime stock visibility, and smooth Cash on Delivery checkout experience.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Our Mission</h2>
        <p className="text-sm leading-7 text-slate-700">
          Deliver a trustworthy ecommerce experience where users can discover
          quality products, place orders confidently, and track order status
          clearly.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">What Makes Us Different</h2>
        <p className="text-sm leading-7 text-slate-700">
          {BRAND_NAME} is powered by a realtime product system. When a product is
          added, updated, hidden, or stock changes, storefront users can see those
          updates quickly across devices.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Customer Support</h2>
        <p className="text-sm leading-7 text-slate-700">
          We take complaints and support requests seriously. Reach us at{" "}
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
