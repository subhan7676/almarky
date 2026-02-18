"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteNotification,
  getReadableFirestoreError,
  saveNotification,
  subscribeAdminNotifications,
  toggleNotificationActive,
} from "@/lib/firebase/firestore";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import type { Notification, NotificationFormInput } from "@/types/commerce";
import { AdminNotificationForm } from "./admin-notification-form";
import { AdminNotificationsList } from "./admin-notifications-list";

const defaultNotification: NotificationFormInput = {
  title: "",
  body: "",
  kind: "update",
  isActive: true,
  linkUrl: "",
};

export function AdminNotificationsManager() {
  const { user, configured } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [form, setForm] = useState<NotificationFormInput>(defaultNotification);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;

    const unsubscribe = subscribeAdminNotifications(
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setMessage(getReadableFirestoreError(error));
      },
      500,
    );

    return () => unsubscribe();
  }, [configured]);

  const heading = useMemo(() => {
    return editingId ? "Edit notification" : "Create notification";
  }, [editingId]);

  const resetForm = () => {
    setForm(defaultNotification);
    setEditingId(null);
  };

  const startEdit = (note: Notification) => {
    setEditingId(note.id);
    setForm({
      title: note.title ?? "",
      body: note.body ?? "",
      kind: note.kind ?? "update",
      isActive: Boolean(note.isActive),
      linkUrl: note.linkUrl ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!configured) {
      setMessage("Service setup is required.");
      return;
    }
    if (!user?.email) {
      setMessage("Admin session not found. Login again.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await saveNotification(form, user.email, editingId ?? undefined);
      setMessage(editingId ? "Notification updated." : "Notification created.");
      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save notification.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (id: string, next: boolean) => {
    if (busyId) return;
    setBusyId(id);
    setMessage(null);
    try {
      await toggleNotificationActive(id, next);
      setMessage(next ? "Notification enabled." : "Notification disabled.");
    } catch (error) {
      setMessage(getReadableFirestoreError(error));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    setMessage(null);
    try {
      await deleteNotification(id);
      setMessage("Notification deleted.");
    } catch (error) {
      setMessage(getReadableFirestoreError(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">
          Publish deals, discounts, and updates to all shoppers instantly.
        </p>
      </div>

      {loading ? <LoadingState label="Loading notifications..." /> : null}

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          {message}
        </div>
      ) : null}

      <div className="anim-grid-stagger grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminNotificationForm
          heading={heading}
          form={form}
          setForm={setForm}
          editingId={editingId}
          busy={busy}
          onSave={save}
          onReset={resetForm}
        />

        <AdminNotificationsList
          notifications={notifications}
          onEdit={startEdit}
          onToggleActive={toggleActive}
          onDelete={remove}
          busyId={busyId}
        />
      </div>
    </section>
  );
}
