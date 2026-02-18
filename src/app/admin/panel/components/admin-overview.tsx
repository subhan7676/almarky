"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  subscribeAdminContactMessages,
  getReadableFirestoreError,
  subscribeAdminOrders,
  subscribeAdminProducts,
  subscribeAdminSettings,
  subscribeAdminUsers,
} from "@/lib/firebase/firestore";
import { formatPKR, toDate } from "@/lib/utils";
import type {
  AdminSettings,
  AdminUser,
  ContactMessage,
  Order,
  Product,
} from "@/types/commerce";
import { LoadingState } from "@/components/ui/loading-state";

const defaultSettings: AdminSettings = {
  storeName: "Almarky",
  supportEmail: "",
  supportPhone: "",
  storeNotice: "",
  maintenanceMode: false,
  updatedBy: "",
  updatedAt: null,
};

export function AdminOverview() {
  const OVERVIEW_LIMIT = 80;
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubProducts = subscribeAdminProducts(
      (items) => {
        setProducts(items);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setMessage(getReadableFirestoreError(error));
      },
      OVERVIEW_LIMIT,
    );
    const unsubOrders = subscribeAdminOrders(
      (items) => setOrders(items),
      (error) => setMessage(getReadableFirestoreError(error)),
      OVERVIEW_LIMIT,
    );
    const unsubUsers = subscribeAdminUsers(
      (items) => setUsers(items),
      (error) => setMessage(getReadableFirestoreError(error)),
      OVERVIEW_LIMIT,
    );
    const unsubContacts = subscribeAdminContactMessages(
      (items) => setContacts(items),
      (error) => setMessage(getReadableFirestoreError(error)),
      OVERVIEW_LIMIT,
    );
    const unsubSettings = subscribeAdminSettings(
      (value) => setSettings(value),
      (error) => setMessage(getReadableFirestoreError(error)),
    );
    return () => {
      unsubProducts();
      unsubOrders();
      unsubUsers();
      unsubContacts();
      unsubSettings();
    };
  }, []);

  const metrics = useMemo(() => {
    const pendingOrders = orders.filter((item) => item.status === "pending").length;
    const visibleProducts = products.filter((item) => item.isVisible).length;
    const openContacts = contacts.filter((item) => item.status !== "resolved").length;
    const totalRevenue = orders
      .filter((item) => item.status === "delivered")
      .reduce((sum, item) => sum + item.pricing.grandTotal, 0);
    return { pendingOrders, visibleProducts, openContacts, totalRevenue };
  }, [orders, products, contacts]);

  return (
    <section className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Admin Overview</h1>
        <p className="mt-1 text-sm text-slate-600">
          Central control for products, orders, users, and storefront settings.
        </p>
      </div>

      {loading ? <LoadingState label="Loading overview..." /> : null}

      {message ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </div>
      ) : null}

      <section className="anim-grid-stagger grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
        <StatCard label="Products" value={String(products.length)} helper="Total records" />
        <StatCard
          label="Visible Products"
          value={String(metrics.visibleProducts)}
          helper="Shown to customers"
        />
        <StatCard
          label="Pending Orders"
          value={String(metrics.pendingOrders)}
          helper="Need action"
        />
        <StatCard
          label="Open Contacts"
          value={String(metrics.openContacts)}
          helper="Support inbox"
        />
        <StatCard
          label="Delivered Revenue"
          value={formatPKR(metrics.totalRevenue)}
          helper="Delivered orders only"
        />
      </section>

      <section className="anim-grid-stagger grid gap-4 sm:gap-6 xl:grid-cols-2">
        <section className="anim-surface rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h2 className="text-lg font-black text-slate-900">Quick Actions</h2>
          <div className="anim-list-stagger mt-3 grid gap-2 sm:grid-cols-2">
            <QuickLink href="/admin/panel/products" label="Manage Products" />
            <QuickLink href="/admin/panel/orders" label="Manage Orders" />
            <QuickLink href="/admin/panel/contacts" label="Support Inbox" />
            <QuickLink href="/admin/panel/users" label="View Users" />
            <QuickLink href="/admin/panel/settings" label="Store Settings" />
          </div>
        </section>

        <section className="anim-surface rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h2 className="text-lg font-black text-slate-900">Store Settings</h2>
          <p className="mt-2 text-sm text-slate-600">
            Store name: <strong>{settings.storeName || "Almarky"}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Maintenance mode:{" "}
            <strong>{settings.maintenanceMode ? "Enabled" : "Disabled"}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Notice: <strong>{settings.storeNotice || "No notice set"}</strong>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Last updated: {toDate(settings.updatedAt)?.toLocaleString() ?? "-"}
          </p>
        </section>
      </section>

      <section className="anim-grid-stagger grid gap-4 sm:gap-6 xl:grid-cols-2">
        <section className="anim-surface rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h2 className="text-lg font-black text-slate-900">Recent Orders</h2>
          <div className="anim-list-stagger mt-3 space-y-2">
            {orders.slice(0, 5).map((order) => (
              <article key={order.id} className="anim-surface rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{order.orderNumber}</p>
                <p className="text-xs text-slate-500">
                  {order.customerDetails.fullName} | {order.customerDetails.phonePk}
                </p>
                <p className="text-xs text-slate-500">
                  {toDate(order.createdAt)?.toLocaleString() ?? "Timestamp pending"}
                </p>
              </article>
            ))}
            {orders.length === 0 ? (
              <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                No orders yet.
              </p>
            ) : null}
          </div>
        </section>

        <section className="anim-surface rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h2 className="text-lg font-black text-slate-900">Recent Users</h2>
          <div className="anim-list-stagger mt-3 space-y-2">
            {users.slice(0, 5).map((user) => (
              <article key={user.id} className="anim-surface rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {user.displayName || "Unnamed user"}
                </p>
                <p className="text-xs text-slate-500">{user.email || "-"}</p>
                <p className="text-xs text-slate-500">
                  Last login: {toDate(user.lastLoginAt)?.toLocaleString() ?? "-"}
                </p>
              </article>
            ))}
            {users.length === 0 ? (
              <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                No users yet.
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </section>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="anim-surface rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{value}</p>
      <p className="text-xs text-slate-500">{helper}</p>
    </article>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="anim-interactive rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
    >
      {label}
    </Link>
  );
}
