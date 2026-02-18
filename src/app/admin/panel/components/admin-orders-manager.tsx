"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getReadableFirestoreError,
  deleteOrderById,
  subscribeAdminOrders,
  updateOrderStatus,
} from "@/lib/firebase/firestore";
import type { Order, OrderStatus } from "@/types/commerce";
import { LoadingState } from "@/components/ui/loading-state";
import { AdminOrdersList } from "./admin-orders-list";

export function AdminOrdersManager() {
  const PAGE_SIZE = 25;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"status" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAdminOrders(
      (items) => {
        setOrders(items);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setMessage(getReadableFirestoreError(error));
      },
      300,
    );
    return () => unsubscribe();
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      const searchable = [
        order.orderNumber,
        order.customerDetails.fullName,
        order.customerDetails.phonePk,
        order.customerDetails.city,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [orders, statusFilter, query]);

  const visibleOrders = useMemo(
    () => filteredOrders.slice(0, visibleCount),
    [filteredOrders, visibleCount],
  );

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    if (busyOrderId) return;
    setBusyOrderId(orderId);
    setBusyAction("status");
    setMessage(null);
    try {
      await updateOrderStatus(orderId, status);
      setMessage(`Order updated to ${status}.`);
    } catch (error) {
      setMessage(getReadableFirestoreError(error));
    } finally {
      setBusyOrderId(null);
      setBusyAction(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (busyOrderId) return;
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm("Delete this order permanently?")
        : false;
    if (!confirmed) return;
    setBusyOrderId(orderId);
    setBusyAction("delete");
    setMessage(null);
    try {
      await deleteOrderById(orderId);
      setMessage("Order deleted.");
    } catch (error) {
      setMessage(getReadableFirestoreError(error));
    } finally {
      setBusyOrderId(null);
      setBusyAction(null);
    }
  };

  return (
    <section className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track COD orders in realtime and update delivery status instantly.
        </p>
      </div>

      <section className="anim-surface rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={query}
            onChange={(event) => {
              setVisibleCount(PAGE_SIZE);
              setQuery(event.target.value);
            }}
            placeholder="Search order / customer / phone"
            className="anim-input rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setVisibleCount(PAGE_SIZE);
              setStatusFilter(event.target.value as "all" | OrderStatus);
            }}
            className="anim-input rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>
      </section>

      {loading ? <LoadingState label="Loading orders..." /> : null}

      {message ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </div>
      ) : null}

      <AdminOrdersList
        orders={visibleOrders}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteOrder}
        busyOrderId={busyOrderId}
        busyAction={busyAction}
      />

      {filteredOrders.length > visibleCount ? (
        <button
          type="button"
          onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          className="anim-interactive rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Load More ({filteredOrders.length - visibleCount} left)
        </button>
      ) : null}
    </section>
  );
}
