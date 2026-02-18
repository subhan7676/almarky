"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getReadableFirestoreError,
  replyToContactMessage,
  subscribeAdminContactMessages,
  updateContactMessageStatus,
} from "@/lib/firebase/firestore";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import type { ContactMessage, ContactMessageStatus } from "@/types/commerce";
import { AdminContactsList } from "./admin-contacts-list";

export function AdminContactsManager() {
  const PAGE_SIZE = 25;
  const { user } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContactMessageStatus>(
    "all",
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [busyContactId, setBusyContactId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAdminContactMessages(
      (items) => {
        setMessages(items);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setMessage(getReadableFirestoreError(error));
      },
      400,
    );

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      const text = `${item.subject} ${item.fullName} ${item.email} ${item.message}`.toLowerCase();
      return text.includes(q);
    });
  }, [messages, query, statusFilter]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const handleStatusChange = async (
    contactId: string,
    status: ContactMessageStatus,
  ) => {
    if (busyContactId) return;
    setBusyContactId(contactId);
    setMessage(null);
    try {
      await updateContactMessageStatus(contactId, status);
      setMessage(`Contact updated to ${status.replace("_", " ")}.`);
    } catch (error) {
      setMessage(getReadableFirestoreError(error));
    } finally {
      setBusyContactId(null);
    }
  };

  const handleReply = async (contact: ContactMessage, replyText: string) => {
    if (busyContactId) return;
    if (!user?.email) {
      setMessage("Admin session not found. Login again.");
      return;
    }

    setBusyContactId(contact.id);
    setMessage(null);
    try {
      await replyToContactMessage({
        contactId: contact.id,
        userEmail: contact.email,
        subject: contact.subject,
        replyText,
        adminEmail: user.email,
      });
      setMessage("Reply sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : getReadableFirestoreError(error));
    } finally {
      setBusyContactId(null);
    }
  };

  return (
    <section className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Contacts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Inbox for user complaints and support requests.
        </p>
      </div>

      <section className="anim-surface rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => {
              setVisibleCount(PAGE_SIZE);
              setQuery(event.target.value);
            }}
            placeholder="Search subject, email, name, message"
            className="anim-input rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setVisibleCount(PAGE_SIZE);
              setStatusFilter(event.target.value as "all" | ContactMessageStatus);
            }}
            className="anim-input rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="received">Received</option>
            <option value="emailed">Emailed</option>
            <option value="email_failed">Email Failed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </section>

      {loading ? <LoadingState label="Loading contact messages..." /> : null}

      {message ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </div>
      ) : null}

      <AdminContactsList
        messages={visible}
        onStatusChange={handleStatusChange}
        onReply={handleReply}
        busyContactId={busyContactId}
      />

      {filtered.length > visibleCount ? (
        <button
          type="button"
          onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          className="anim-interactive rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Load More ({filtered.length - visibleCount} left)
        </button>
      ) : null}
    </section>
  );
}
