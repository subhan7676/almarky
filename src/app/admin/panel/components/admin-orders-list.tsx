"use client";

import { formatPKR, toDate } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/commerce";

type AdminOrdersListProps = {
  orders: Order[];
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onDelete: (orderId: string) => Promise<void>;
  busyOrderId: string | null;
  busyAction: "status" | "delete" | null;
};

export function AdminOrdersList({
  orders,
  onStatusChange,
  onDelete,
  busyOrderId,
  busyAction,
}: AdminOrdersListProps) {
  return (
    <section className="anim-surface rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <h2 className="text-xl font-black text-slate-900">Orders</h2>
      <div className="anim-list-stagger mt-4 space-y-3">
        {orders.map((order) => {
          const isBusy = busyOrderId === order.id;
          const isDeleting = isBusy && busyAction === "delete";
          return (
            <article key={order.id} className="anim-surface rounded-2xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">{order.orderNumber}</p>
              <p className="text-xs text-slate-500">
                {toDate(order.createdAt)?.toLocaleString() ?? "Timestamp pending"}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Total: <strong>{formatPKR(order.pricing.grandTotal)}</strong>
              </p>
              <p className="text-xs text-slate-500">
                {order.customerDetails.fullName} | {order.customerDetails.phonePk}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onStatusChange(order.id, "pending")}
                  disabled={isBusy}
                  className="anim-interactive rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => void onStatusChange(order.id, "delivered")}
                  disabled={isBusy}
                  className="anim-interactive rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delivered
                </button>
                <button
                  type="button"
                  onClick={() => void onStatusChange(order.id, "cancelled")}
                  disabled={isBusy}
                  className="anim-interactive rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? "Updating..." : "Cancelled"}
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(order.id)}
                  disabled={isBusy}
                  className="anim-interactive rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          );
        })}
        {orders.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            No orders yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
