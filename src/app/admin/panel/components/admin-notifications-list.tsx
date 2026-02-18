"use client";

import type { Notification } from "@/types/commerce";
import { toDate, cn } from "@/lib/utils";
import { Bell, Pencil, Tag, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

type AdminNotificationsListProps = {
  notifications: Notification[];
  onEdit: (note: Notification) => void;
  onToggleActive: (id: string, next: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busyId: string | null;
};

function kindBadge(kind: Notification["kind"]) {
  if (kind === "deal") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-800";
}

function kindIcon(kind: Notification["kind"]) {
  return kind === "deal" ? Tag : Bell;
}

export function AdminNotificationsList({
  notifications,
  onEdit,
  onToggleActive,
  onDelete,
  busyId,
}: AdminNotificationsListProps) {
  return (
    <section className="anim-surface rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <h2 className="text-xl font-black text-slate-900">All notifications</h2>
      <div className="anim-list-stagger mt-4 space-y-3">
        {notifications.map((note) => {
          const isBusy = busyId === note.id;
          const Icon = kindIcon(note.kind);
          return (
            <article
              key={note.id}
              className="anim-surface rounded-2xl border border-slate-200 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "inline-flex size-10 items-center justify-center rounded-2xl border",
                      note.kind === "deal"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-700",
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-900">{note.title}</p>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">
                      {note.body}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {toDate(note.createdAt)?.toLocaleString() ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      kindBadge(note.kind),
                    )}
                  >
                    {note.kind}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      note.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800",
                    )}
                  >
                    {note.isActive ? "active" : "disabled"}
                  </span>
                </div>
              </div>

              {note.linkUrl ? (
                <p className="mt-2 text-xs text-slate-500">
                  Link:{" "}
                  <span className="font-semibold text-slate-700">{note.linkUrl}</span>
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(note)}
                  disabled={isBusy}
                  className="anim-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil className="size-4" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => void onToggleActive(note.id, !note.isActive)}
                  disabled={isBusy}
                  className={cn(
                    "anim-interactive inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50",
                    note.isActive
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                  )}
                >
                  {note.isActive ? (
                    <ToggleLeft className="size-4" />
                  ) : (
                    <ToggleRight className="size-4" />
                  )}
                  {note.isActive ? "Disable" : "Enable"}
                </button>

                <button
                  type="button"
                  onClick={() => void onDelete(note.id)}
                  disabled={isBusy}
                  className="anim-interactive inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  {isBusy ? "Working..." : "Delete"}
                </button>
              </div>
            </article>
          );
        })}

        {notifications.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            No notifications yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
