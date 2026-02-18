"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getReadableFirestoreError,
  saveAdminSettings,
  subscribeAdminSettings,
} from "@/lib/firebase/firestore";
import { toDate } from "@/lib/utils";
import type { AdminSettingsInput } from "@/types/commerce";

const defaultSettings: AdminSettingsInput = {
  storeName: "Almarky",
  supportEmail: "",
  supportPhone: "",
  storeNotice: "",
  maintenanceMode: false,
};

export function AdminSettingsManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [form, setForm] = useState<AdminSettingsInput>(defaultSettings);

  useEffect(() => {
    const unsubscribe = subscribeAdminSettings(
      (settings) => {
        setForm({
          storeName: settings.storeName,
          supportEmail: settings.supportEmail,
          supportPhone: settings.supportPhone,
          storeNotice: settings.storeNotice,
          maintenanceMode: settings.maintenanceMode,
        });
        setUpdatedBy(settings.updatedBy || "");
        setUpdatedAt(toDate(settings.updatedAt) ?? null);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setMessage(getReadableFirestoreError(error));
      },
    );
    return () => unsubscribe();
  }, []);

  const save = async () => {
    if (!user?.email) {
      setMessage("Admin session missing. Login again.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveAdminSettings(form, user.email);
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Storefront controls for brand name, notices, and maintenance mode.
        </p>
      </div>

      {loading ? <LoadingState label="Loading settings..." /> : null}

      <section className="anim-surface rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Store Name</span>
            <input
              value={form.storeName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, storeName: event.target.value }))
              }
              className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Support Email</span>
            <input
              value={form.supportEmail}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, supportEmail: event.target.value }))
              }
              className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Support Phone</span>
            <input
              value={form.supportPhone}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, supportPhone: event.target.value }))
              }
              className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Maintenance Mode</span>
            <select
              value={form.maintenanceMode ? "on" : "off"}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  maintenanceMode: event.target.value === "on",
                }))
              }
              className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
            <span>Store Notice (shows in website header)</span>
            <textarea
              value={form.storeNotice}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, storeNotice: event.target.value }))
              }
              className="anim-input h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>Last updated by: {updatedBy || "-"}</span>
          <span>Last updated at: {updatedAt?.toLocaleString() ?? "-"}</span>
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="anim-interactive mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>

        {message ? (
          <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {message}
          </p>
        ) : null}
      </section>
    </section>
  );
}
