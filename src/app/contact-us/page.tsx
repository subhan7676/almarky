"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { CUSTOMER_SUPPORT_EMAIL } from "@/lib/constants";
import { prependLocalSentMessage } from "@/lib/local-storage";

type ContactFormState = {
  fullName: string;
  email: string;
  phonePk: string;
  subject: string;
  message: string;
};

const initialForm: ContactFormState = {
  fullName: "",
  email: "",
  phonePk: "",
  subject: "",
  message: "",
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ContactUsPage() {
  const [form, setForm] = useState<ContactFormState>(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentOpen, setSentOpen] = useState(false);

  const messageCount = useMemo(() => form.message.trim().length, [form.message]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSentOpen(false);

    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!isEmail(form.email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!form.subject.trim()) {
      setError("Please enter a subject.");
      return;
    }
    if (form.message.trim().length < 10) {
      setError("Message should be at least 10 characters.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        contactId?: string;
      };
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "Failed to send your message.");
      }

      prependLocalSentMessage({
        id: result.contactId,
        email: form.email,
        subject: form.subject,
        message: form.message,
        createdAt: Date.now(),
      });
      setSentOpen(true);
      setForm(initialForm);
      window.setTimeout(() => setSentOpen(false), 1600);
    } catch (submitError) {
      void submitError;
      setError("Could not send your message right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="anim-page-enter mx-auto max-w-4xl space-y-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:space-y-6 sm:p-7">
      <header>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
          Contact Us
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Send your complaints, support questions, or order issues. Your message is
          delivered to our support mailbox.
        </p>
      </header>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
        Direct support email:{" "}
        <a
          href={`mailto:${CUSTOMER_SUPPORT_EMAIL}`}
          className="font-semibold text-slate-900 underline"
        >
          {CUSTOMER_SUPPORT_EMAIL}
        </a>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="anim-grid-stagger grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Full Name *</span>
            <input
              value={form.fullName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, fullName: event.target.value }))
              }
              className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              placeholder="Enter your full name"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Email *</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              placeholder="you@example.com"
            />
          </label>
        </div>

        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Phone Number (Optional)</span>
          <input
            value={form.phonePk}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, phonePk: event.target.value }))
            }
            className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            placeholder="+923001234567"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Subject *</span>
          <input
            value={form.subject}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, subject: event.target.value }))
            }
            className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            placeholder="How can we help?"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Message *</span>
          <textarea
            value={form.message}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, message: event.target.value }))
            }
            className="anim-input h-36 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            placeholder="Write your issue in detail..."
          />
          <span className="text-xs text-slate-500">{messageCount}/4000</span>
        </label>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="anim-interactive inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send Message"}
        </button>
      </form>

      <SentModal open={sentOpen} onClose={() => setSentOpen(false)} />
    </section>
  );
}

function SentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Message sent"
    >
      <div
        className="anim-modal w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <p className="text-base font-black text-slate-900">Sent</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="anim-interactive rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Your message has been sent successfully.
        </p>
      </div>
    </div>
  );
}
