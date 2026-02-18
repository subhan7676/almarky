"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  getReadableFirestoreError,
  sendInboxNotificationToAllUsers,
  sendInboxNotificationToUser,
  subscribeAdminOrders,
  subscribeAdminUsers,
} from "@/lib/firebase/firestore";
import { cn, optimizeImageUrl, toDate } from "@/lib/utils";
import type { AdminUser, NotificationFormInput, Order } from "@/types/commerce";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/components/providers/auth-provider";
import { MessageCircle, Send, Users, X } from "lucide-react";

const defaultMessageForm: NotificationFormInput = {
  title: "",
  body: "",
  kind: "update",
  isActive: true,
  linkUrl: "",
};

export function AdminUsersManager() {
  const PAGE_SIZE = 25;
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [message, setMessage] = useState<string | null>(null);
  const [sendAllForm, setSendAllForm] =
    useState<NotificationFormInput>(defaultMessageForm);
  const [sendingAll, setSendingAll] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState<AdminUser | null>(null);
  const [modalForm, setModalForm] =
    useState<NotificationFormInput>(defaultMessageForm);
  const [sendingUserEmail, setSendingUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubUsers = subscribeAdminUsers(
      (items) => {
        setUsers(items);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setMessage(getReadableFirestoreError(error));
      },
      300,
    );
    const unsubOrders = subscribeAdminOrders(
      (items) => setOrders(items),
      (error) => setMessage(getReadableFirestoreError(error)),
      300,
    );
    return () => {
      unsubUsers();
      unsubOrders();
    };
  }, []);

  const orderCountByUser = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.uid] = (acc[order.uid] ?? 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      `${user.displayName} ${user.email}`.toLowerCase().includes(q),
    );
  }, [users, query]);

  const visibleUsers = useMemo(
    () => filteredUsers.slice(0, visibleCount),
    [filteredUsers, visibleCount],
  );

  const openModal = (target: AdminUser) => {
    setModalUser(target);
    setModalForm(defaultMessageForm);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalUser(null);
    setModalForm(defaultMessageForm);
  };

  const sendToAll = async () => {
    if (sendingAll) return;
    if (!user?.email) {
      setMessage("Admin session not found. Login again.");
      return;
    }

    setMessage(null);
    setSendingAll(true);
    try {
      const emails = users.map((u) => u.email).filter(Boolean);
      const count = await sendInboxNotificationToAllUsers(
        emails,
        sendAllForm,
        user.email,
      );
      setMessage(`Message sent to ${count} users.`);
      setSendAllForm(defaultMessageForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setSendingAll(false);
    }
  };

  const sendToUser = async () => {
    if (!modalUser?.email) {
      setMessage("User email not available.");
      return;
    }
    if (!user?.email) {
      setMessage("Admin session not found. Login again.");
      return;
    }

    const targetEmail = modalUser.email;
    if (sendingUserEmail) return;

    setMessage(null);
    setSendingUserEmail(targetEmail);
    try {
      await sendInboxNotificationToUser(targetEmail, modalForm, user.email);
      setMessage("Message sent.");
      closeModal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setSendingUserEmail(null);
    }
  };

  return (
    <section className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-600">
          User directory with login activity and order volume.
        </p>
      </div>

      <section className="anim-surface rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 sm:text-lg">
              Send message
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Send a message to everyone or to a specific user.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            <Users className="size-4" />
            {users.length} users
          </span>
        </div>

        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Type</span>
              <select
                value={sendAllForm.kind}
                onChange={(event) =>
                  setSendAllForm((prev) => ({
                    ...prev,
                    kind: event.target.value === "deal" ? "deal" : "update",
                  }))
                }
                className="anim-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400"
              >
                <option value="update">Update</option>
                <option value="deal">Deal / Discount</option>
              </select>
            </label>

            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Link (Optional)</span>
              <input
                value={sendAllForm.linkUrl ?? ""}
                onChange={(event) =>
                  setSendAllForm((prev) => ({ ...prev, linkUrl: event.target.value }))
                }
                className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
                placeholder="/product/example-slug"
              />
            </label>
          </div>

          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Title *</span>
            <input
              value={sendAllForm.title}
              onChange={(event) =>
                setSendAllForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              placeholder="Title"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Message *</span>
            <textarea
              value={sendAllForm.body}
              onChange={(event) =>
                setSendAllForm((prev) => ({ ...prev, body: event.target.value }))
              }
              className="anim-input h-28 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              placeholder="Write your message..."
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void sendToAll()}
              disabled={sendingAll || users.length === 0}
              className="anim-interactive inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="size-4" />
              {sendingAll ? "Sending..." : "Send to all"}
            </button>
            <button
              type="button"
              onClick={() => setSendAllForm(defaultMessageForm)}
              disabled={sendingAll}
              className="anim-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="anim-surface rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
        <input
          value={query}
          onChange={(event) => {
            setVisibleCount(PAGE_SIZE);
            setQuery(event.target.value);
          }}
          placeholder="Search by name or email"
          className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </section>

      {loading ? <LoadingState label="Loading users..." /> : null}

      {message ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </div>
      ) : null}

      <section className="anim-list-stagger space-y-3">
        {visibleUsers.map((user) => (
          <article
            key={user.id}
            className="anim-surface rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Image
                src={
                  optimizeImageUrl(user.photoURL || "/globe.svg", {
                    width: 96,
                    height: 96,
                  }) || "/globe.svg"
                }
                alt={user.displayName || user.email || "User"}
                width={80}
                height={80}
                sizes="48px"
                className="size-12 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900">
                  {user.displayName || "Unnamed user"}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email || "-"}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">Orders</p>
                <p className="text-base font-black text-slate-900 sm:text-lg">
                  {orderCountByUser[user.id] ?? 0}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openModal(user)}
                className="anim-interactive inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:w-auto"
                title="Send message"
              >
                <MessageCircle className="size-4" />
                Message
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Last login:{" "}
              {toDate(user.lastLoginAt)?.toLocaleString() ?? "Not available yet"}
            </p>
          </article>
        ))}

        {filteredUsers.length > visibleCount ? (
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="anim-interactive rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Load More ({filteredUsers.length - visibleCount} left)
          </button>
        ) : null}

        {!loading && filteredUsers.length === 0 ? (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
            No users found.
          </p>
        ) : null}
      </section>

      {modalOpen && modalUser ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Send message"
          onClick={closeModal}
        >
          <div
            className="anim-modal w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Send message</p>
                <p className="mt-1 text-xs text-slate-500">
                  {modalUser.displayName || "User"} | {modalUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="anim-interactive rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  <span>Type</span>
                  <select
                    value={modalForm.kind}
                    onChange={(event) =>
                      setModalForm((prev) => ({
                        ...prev,
                        kind: event.target.value === "deal" ? "deal" : "update",
                      }))
                    }
                    className="anim-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400"
                  >
                    <option value="update">Update</option>
                    <option value="deal">Deal / Discount</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  <span>Link (Optional)</span>
                  <input
                    value={modalForm.linkUrl ?? ""}
                    onChange={(event) =>
                      setModalForm((prev) => ({ ...prev, linkUrl: event.target.value }))
                    }
                    className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
                    placeholder="/product/example-slug"
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm font-semibold text-slate-700">
                <span>Title *</span>
                <input
                  value={modalForm.title}
                  onChange={(event) =>
                    setModalForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
                  placeholder="Title"
                />
              </label>

              <label className="space-y-1 text-sm font-semibold text-slate-700">
                <span>Message *</span>
                <textarea
                  value={modalForm.body}
                  onChange={(event) =>
                    setModalForm((prev) => ({ ...prev, body: event.target.value }))
                  }
                  className="anim-input h-32 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
                  placeholder="Write your message..."
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void sendToUser()}
                disabled={sendingUserEmail === modalUser.email}
                className={cn(
                  "anim-interactive inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Send className="size-4" />
                {sendingUserEmail === modalUser.email ? "Sending..." : "Send"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="anim-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
