import { CUSTOMER_SUPPORT_EMAIL } from "@/lib/constants";

export default function PrivacyPolicyPage() {
  return (
    <section className="anim-page-enter mx-auto max-w-4xl space-y-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
      <header>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Effective date: {new Date().toLocaleDateString("en-PK")}
        </p>
      </header>

      <p className="text-sm leading-7 text-slate-700">
        Almarky respects your privacy. This page explains what information we
        collect, how we use it, and how we protect it while you use our
        marketplace website.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Information We Collect</h2>
        <p className="text-sm leading-7 text-slate-700">
          We collect account details (such as name, email), checkout details
          (such as phone, city, tehsil, district, house address, and optional shop
          name), order details (items, quantity, selected color, prices), and
          technical data needed to keep the website secure and functional.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">How We Use Data</h2>
        <p className="text-sm leading-7 text-slate-700">
          We use your data to process COD orders, manage inventory, provide order
          status updates, improve service quality, detect misuse, and respond to
          support requests.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Data Storage</h2>
        <p className="text-sm leading-7 text-slate-700">
          Product and operational records are managed through secured cloud
          services integrated with Almarky. Some profile preferences and cart
          details may also be stored in your current browser for faster checkout
          experience.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Data Sharing</h2>
        <p className="text-sm leading-7 text-slate-700">
          We do not sell your personal data. We only share limited information with
          technical providers used to run the platform and complete your order
          workflow.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Security</h2>
        <p className="text-sm leading-7 text-slate-700">
          We apply access controls, authentication checks, and server-side
          validation to reduce unauthorized access and keep marketplace data safe.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Contact</h2>
        <p className="text-sm leading-7 text-slate-700">
          For privacy questions, contact us at{" "}
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
