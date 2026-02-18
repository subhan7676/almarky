"use client";

import type { Dispatch, SetStateAction } from "react";
import { Check, RotateCcw } from "lucide-react";
import type { NotificationFormInput } from "@/types/commerce";

type AdminNotificationFormProps = {
  heading: string;
  form: NotificationFormInput;
  setForm: Dispatch<SetStateAction<NotificationFormInput>>;
  editingId: string | null;
  busy: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
};

export function AdminNotificationForm({
  heading,
  form,
  setForm,
  editingId,
  busy,
  onSave,
  onReset,
}: AdminNotificationFormProps) {
  return (
    <section className="anim-surface space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-slate-900">{heading}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {editingId ? `Editing: ${editingId}` : "Create a new broadcast message."}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, isActive: event.target.checked }))
            }
          />
          Active
        </label>
      </header>

      <div className="grid gap-4">
        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Type</span>
          <select
            value={form.kind}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                kind: event.target.value === "deal" ? "deal" : "update",
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400"
          >
            <option value="update">Update</option>
            <option value="deal">Deal / Discount</option>
          </select>
        </label>

        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Title *</span>
          <input
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            placeholder="e.g. Weekend discount is live"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Message *</span>
          <textarea
            value={form.body}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, body: event.target.value }))
            }
            className="h-36 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            placeholder="Write the notification details..."
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Link (Optional)</span>
          <input
            value={form.linkUrl ?? ""}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, linkUrl: event.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            placeholder="/product/example-slug or https://..."
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave()}
          className="anim-interactive inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="size-4" />
          {busy ? "Saving..." : editingId ? "Update" : "Publish"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onReset}
          className="anim-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="size-4" />
          Reset
        </button>
      </div>
    </section>
  );
}
