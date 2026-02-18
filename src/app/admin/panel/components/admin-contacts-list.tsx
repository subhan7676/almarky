"use client";

import { useMemo, useState } from "react";
import { MailCheck, MessageCircleReply, MessageSquareWarning, Send, X } from "lucide-react";
import { toDate } from "@/lib/utils";
import type { ContactMessage, ContactMessageStatus } from "@/types/commerce";
import { cn } from "@/lib/utils";

type AdminContactsListProps = {
  messages: ContactMessage[];
  onStatusChange: (contactId: string, status: ContactMessageStatus) => Promise<void>;
  onReply: (message: ContactMessage, replyText: string) => Promise<void>;
  busyContactId: string | null;
};

const statusStyles: Record<ContactMessageStatus, string> = {
  received: "bg-amber-100 text-amber-800",
  emailed: "bg-emerald-100 text-emerald-800",
  email_failed: "bg-rose-100 text-rose-800",
  resolved: "bg-slate-200 text-slate-800",
};

export function AdminContactsList({
  messages,
  onStatusChange,
  onReply,
  busyContactId,
}: AdminContactsListProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  const replyTarget = useMemo(() => {
    if (!replyTargetId) return null;
    return messages.find((item) => item.id === replyTargetId) ?? null;
  }, [messages, replyTargetId]);

  const openReply = (message: ContactMessage) => {
    setReplyTargetId(message.id);
    setReplyText(message.replyText ?? "");
    setReplyError(null);
    setReplyOpen(true);
  };

  const closeReply = () => {
    setReplyOpen(false);
    setReplyTargetId(null);
    setReplyText("");
    setReplyError(null);
  };

  const sendReply = async () => {
    if (!replyTarget) return;
    const text = replyText.trim();
    if (!text) {
      setReplyError("Reply message is required.");
      return;
    }
    setReplyError(null);
    await onReply(replyTarget, text);
    closeReply();
  };

  return (
    <section className="anim-surface rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <h2 className="text-xl font-black text-slate-900">Contact Messages</h2>
      <div className="anim-list-stagger mt-4 space-y-3">
        {messages.map((message) => {
          const isBusy = busyContactId === message.id;
          return (
            <article
              key={message.id}
              className="anim-surface rounded-2xl border border-slate-200 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{message.subject}</p>
                  <p className="text-xs text-slate-500">
                    {message.fullName} | {message.email}
                  </p>
                  {message.phonePk ? (
                    <p className="text-xs text-slate-500">{message.phonePk}</p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    statusStyles[message.status]
                  }`}
                >
                  {message.status.replace("_", " ")}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                {message.message}
              </p>

              {message.failureReason ? (
                <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                  <MessageSquareWarning className="mr-1 inline size-3.5" />
                  Delivery delayed.
                </p>
              ) : null}

              {message.replyText ? (
                <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  <p className="font-bold">Reply</p>
                  <p className="mt-1 whitespace-pre-wrap">{message.replyText}</p>
                  {message.repliedAt ? (
                    <p className="mt-2 text-[11px] text-blue-700/80">
                      {toDate(message.repliedAt)?.toLocaleString() ?? ""}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  {toDate(message.createdAt)?.toLocaleString() ?? "-"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openReply(message)}
                    disabled={isBusy}
                    className="anim-interactive rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MessageCircleReply className="mr-1 inline size-3.5" />
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => void onStatusChange(message.id, "received")}
                    disabled={isBusy}
                    className="anim-interactive rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark Received
                  </button>
                  <button
                    type="button"
                    onClick={() => void onStatusChange(message.id, "emailed")}
                    disabled={isBusy}
                    className="anim-interactive rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MailCheck className="mr-1 inline size-3.5" />
                    Mark Emailed
                  </button>
                  <button
                    type="button"
                    onClick={() => void onStatusChange(message.id, "resolved")}
                    disabled={isBusy}
                    className="anim-interactive rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBusy ? "Updating..." : "Resolve"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {messages.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            No contact messages yet.
          </p>
        ) : null}
      </div>

      {replyOpen && replyTarget ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reply to message"
          onClick={closeReply}
        >
          <div
            className="anim-modal w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Send reply</p>
                <p className="mt-1 text-xs text-slate-500">
                  {replyTarget.fullName} | {replyTarget.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReply}
                className="anim-interactive rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Customer message
              </p>
              <div className="max-h-28 overflow-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {replyTarget.message}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Your reply
              </p>
              <textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                className="h-32 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Write your reply..."
              />
              {replyError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {replyError}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void sendReply()}
                disabled={busyContactId === replyTarget.id}
                className={cn(
                  "anim-interactive inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Send className="size-4" />
                {busyContactId === replyTarget.id ? "Sending..." : "Send Reply"}
              </button>
              <button
                type="button"
                onClick={closeReply}
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
