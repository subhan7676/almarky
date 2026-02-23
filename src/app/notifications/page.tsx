"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  MessageSquare,
  ArrowUpRight,
  LogIn,
} from "lucide-react";
import {
  getReadableFirestoreError,
  subscribeActiveNotifications,
  subscribeUserInboxNotifications,
} from "@/lib/firebase/firestore";
import {
  clearLocalSentMessages,
  clearHiddenNotifications,
  readLocalSentMessages,
  readNotificationLastSeen,
  onNotificationSeenChange,
  hideNotificationForUser,
  removeLocalSentMessage,
  readHiddenNotifications,
  writeNotificationLastSeen,
} from "@/lib/local-storage";
import { toDate, cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import { AlmarkyMark } from "@/components/branding/almarky-mark";
import type { LocalSentMessage, Notification } from "@/types/commerce";

function getUserSeenKey(uid?: string | null) {
  return uid?.trim() ? uid.trim() : "guest";
}

function getNotificationIcon(kind: Notification["kind"]) {
  if (kind === "reply") return MessageSquare;
  return Bell;
}

function getNotificationTone(kind: Notification["kind"]) {
  return kind === "deal"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : kind === "reply"
      ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-slate-200 bg-slate-50 text-slate-700";
}

export default function NotificationsPage() {
  const { user, configured, configError } = useAuth();
  const seenKey = useMemo(() => getUserSeenKey(user?.uid), [user?.uid]);
  const [broadcastNotifications, setBroadcastNotifications] = useState<
    Notification[]
  >([]);
  const [inboxNotifications, setInboxNotifications] = useState<Notification[]>([]);
  const [sentMessages, setSentMessages] = useState<LocalSentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState(() =>
    readNotificationLastSeen(getUserSeenKey(null)),
  );
  const [hiddenNotifications, setHiddenNotifications] = useState<string[]>([]);

  useEffect(() => {
    setLastSeenAt(readNotificationLastSeen(seenKey));
    setHiddenNotifications(readHiddenNotifications(seenKey));
  }, [seenKey]);

  useEffect(() => {
    return onNotificationSeenChange(() => {
      setLastSeenAt(readNotificationLastSeen(seenKey));
    });
  }, [seenKey]);

  const mergedNotifications = useMemo(() => {
    const merged = [...broadcastNotifications, ...inboxNotifications];
    return merged.sort(
      (a, b) =>
        (toDate(b.createdAt ?? b.updatedAt)?.getTime() ?? 0) -
        (toDate(a.createdAt ?? a.updatedAt)?.getTime() ?? 0),
    );
  }, [broadcastNotifications, inboxNotifications]);

  const visibleNotifications = useMemo(() => {
    if (!hiddenNotifications.length) return mergedNotifications;
    const hiddenSet = new Set(hiddenNotifications);
    return mergedNotifications.filter((note) => !hiddenSet.has(note.id));
  }, [mergedNotifications, hiddenNotifications]);

  const newCount = useMemo(() => {
    if (!lastSeenAt) return visibleNotifications.length;
    return visibleNotifications.filter((item) => {
      const createdAt =
        toDate(item.createdAt ?? item.updatedAt)?.getTime() ?? 0;
      return createdAt > lastSeenAt;
    }).length;
  }, [visibleNotifications, lastSeenAt]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeActiveNotifications(
      (items) => {
        setBroadcastNotifications(items);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setError(getReadableFirestoreError(err));
      },
      200,
    );

    return () => unsubscribe();
  }, [configured]);

  useEffect(() => {
    if (!configured) return;
    const email = user?.email?.trim() || "";
    if (!email) {
      setInboxNotifications([]);
      return;
    }

    return subscribeUserInboxNotifications(
      email,
      (items: Notification[]) => setInboxNotifications(items),
      () => setInboxNotifications([]),
      120,
    );
  }, [configured, user?.email]);

  useEffect(() => {
    const email = user?.email?.trim() || "";
    setSentMessages(email ? readLocalSentMessages(email) : []);
  }, [user?.email]);

  const handleRemoveMessage = (messageId: string) => {
    const email = user?.email?.trim() || "";
    if (!email) return;
    removeLocalSentMessage(email, messageId);
    setSentMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const handleClearAll = () => {
    const email = user?.email?.trim() || "";
    if (!email) return;
    clearLocalSentMessages(email);
    setSentMessages([]);
  };

  const handleHideNotification = (notificationId: string) => {
    hideNotificationForUser(seenKey, notificationId);
    setHiddenNotifications((prev) => {
      if (prev.includes(notificationId)) return prev;
      return [notificationId, ...prev];
    });
  };

  const handleClearAllUpdates = () => {
    clearHiddenNotifications(seenKey);
    setHiddenNotifications([]);
  };

  useEffect(() => {
    if (loading) return;
    if (visibleNotifications.length === 0) return;
    const maxCreatedAt = Math.max(
      ...visibleNotifications.map(
        (item) => toDate(item.createdAt ?? item.updatedAt)?.getTime() ?? 0,
      ),
    );
    if (!maxCreatedAt) return;
    writeNotificationLastSeen(seenKey, maxCreatedAt);
    setLastSeenAt(maxCreatedAt);
  }, [loading, visibleNotifications, seenKey]);

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:p-6">
        <p className="text-lg font-bold text-amber-900">Service Setup Required</p>
        <p className="mt-2">{configError ?? "Missing required configuration."}</p>
      </div>
    );
  }

  return (
    <section className="anim-page-enter mx-auto max-w-5xl space-y-4 sm:space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Deals, updates, and your recent messages.
          </p>
        </div>
        {newCount > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            {newCount} new
          </span>
        ) : null}
      </header>

      {loading ? <LoadingState label="Loading notifications..." /> : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-sm font-black text-slate-900">
            <span className="inline-flex items-center gap-2">
              <Bell className="size-4" />
              Updates
            </span>
            {visibleNotifications.length > 0 ? (
              <button
                type="button"
                onClick={handleClearAllUpdates}
                className="anim-interactive rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 sm:text-xs"
              >
                Clear all
              </button>
            ) : null}
          </div>

          <div className="anim-list-stagger space-y-3">
            {visibleNotifications.map((note) => {
              const isDeal = note.kind === "deal";
              const Icon = getNotificationIcon(note.kind);
              const createdAt =
                toDate(note.createdAt ?? note.updatedAt)?.toLocaleString() ?? "";
              const createdMs =
                toDate(note.createdAt ?? note.updatedAt)?.getTime() ?? 0;
              const isNew = Boolean(createdMs && createdMs > lastSeenAt);
              return (
                <article
                  key={note.id}
                  className={cn(
                    "anim-surface rounded-2xl border bg-white p-3 shadow-sm sm:p-4",
                    isNew ? "border-slate-300" : "border-slate-200",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "inline-flex size-9 items-center justify-center rounded-2xl border text-sm sm:size-10",
                          getNotificationTone(note.kind),
                        )}
                        aria-hidden="true"
                      >
                        {isDeal ? (
                          <AlmarkyMark className="h-5" variant="mono-dark" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {note.title}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                          {note.body}
                        </p>
                        {isDeal ? (
                          <span className="mt-2 inline-flex rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                            Hot Deal
                          </span>
                        ) : null}
                        {createdAt ? (
                          <p className="mt-2 text-xs text-slate-500">{createdAt}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isNew ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 sm:text-[11px]">
                          NEW
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleHideNotification(note.id)}
                        className="anim-interactive rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 sm:text-xs"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {note.linkUrl ? (
                    <div className="mt-3">
                      <Link
                        href={note.linkUrl}
                        className="anim-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100"
                      >
                        View
                        <ArrowUpRight className="size-4" />
                      </Link>
                    </div>
                  ) : null}
                </article>
              );
            })}

            {visibleNotifications.length === 0 && !loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 sm:p-5">
                No updates yet.
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-sm font-black text-slate-900">
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="size-4" />
              Your messages
            </span>
            {user && sentMessages.length > 0 ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="anim-interactive rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 sm:text-xs"
              >
                Clear all
              </button>
            ) : null}
          </div>

          {!user ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 sm:p-5">
              <p>Login to see your messages.</p>
              <Link
                href="/login"
                className="anim-interactive mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
              >
                <LogIn className="size-4" />
                Login
              </Link>
            </div>
          ) : (
            <div className="anim-list-stagger space-y-3">
              {sentMessages.map((msg) => (
                <article
                  key={msg.id}
                  className="anim-surface rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-black text-slate-900">{msg.subject}</p>
                    <button
                      type="button"
                      onClick={() => handleRemoveMessage(msg.id)}
                      className="anim-interactive rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 sm:text-xs"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">
                    {msg.message}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </article>
              ))}

              {sentMessages.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 sm:p-5">
                  No messages yet.
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
