"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Package, ReceiptText, Truck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getReadableFirestoreError,
  subscribeUserOrderById,
} from "@/lib/firebase/firestore";
import { findLocalOrderById } from "@/lib/local-storage";
import { formatPKR, optimizeImageUrl, toDate } from "@/lib/utils";
import type { Order } from "@/types/commerce";

export default function OrderConfirmationPage() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const { user, configured } = useAuth();
  const orderId = params.orderId;
  const warning = searchParams.get("warning");

  const [order, setOrder] = useState<Order | null>(null);
  const [remoteChecked, setRemoteChecked] = useState(false);
  const [message, setMessage] = useState<string | null>(warning);

  useEffect(() => {
    const localOrder = orderId ? findLocalOrderById(orderId) : null;
    queueMicrotask(() => {
      setOrder(localOrder);
      setRemoteChecked(Boolean(localOrder));
    });
  }, [orderId]);

  useEffect(() => {
    if (!configured || !user?.uid || !orderId) return;

    const unsubscribe = subscribeUserOrderById(
      user.uid,
      orderId,
      (nextOrder) => {
        if (nextOrder) {
          setOrder(nextOrder);
          setMessage(null);
        }
        setRemoteChecked(true);
      },
      (error) => {
        setMessage(getReadableFirestoreError(error));
        setRemoteChecked(true);
      },
    );

    return () => unsubscribe();
  }, [configured, user?.uid, orderId]);

  const placedAt = useMemo(() => toDate(order?.createdAt), [order?.createdAt]);
  const loading = configured && Boolean(user?.uid) && !remoteChecked && !order;

  if (loading) {
    return <LoadingState label="Loading order confirmation..." />;
  }

  return (
      <section className="space-y-6">
        <div className="anim-hero-gradient overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-cyan-700 to-slate-900 p-4 text-white sm:p-6">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-100">
            <CheckCircle2 className="size-4" />
            Congratulations
          </p>
          <h1 className="mt-2 text-2xl font-black sm:text-4xl">Order Confirmed</h1>
          <p className="mt-2 max-w-3xl text-sm text-cyan-50 sm:text-base">
            Your COD order has been placed successfully. Keep this order number for
            support and delivery tracking.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MetricCard
              icon={<ReceiptText className="size-4" />}
              label="Order Number"
              value={order?.orderNumber || orderId || "-"}
            />
            <MetricCard
              icon={<Truck className="size-4" />}
              label="Current Status"
              value={order?.status || "pending"}
            />
            <MetricCard
              icon={<Package className="size-4" />}
              label="Grand Total"
              value={order ? formatPKR(order.pricing.grandTotal) : "-"}
            />
          </div>
        </div>

        {message ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {message}
          </div>
        ) : null}

        {!order ? (
          <div className="anim-surface rounded-2xl bg-white p-4 text-slate-700 ring-1 ring-slate-200 sm:p-6">
            <p className="text-lg font-bold text-slate-900">Order details not found</p>
            <p className="mt-2 text-sm">
              This can happen if the order is very new or you opened an old link.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/profile"
                className="anim-interactive rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Open Profile Orders
              </Link>
              <Link
                href="/"
                className="anim-interactive rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1fr_350px]">
            <div className="space-y-4">
              <section className="anim-surface rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
                <h2 className="text-xl font-black text-slate-900">Ordered Items</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Place time: {placedAt ? placedAt.toLocaleString() : "Pending timestamp"}
                </p>
                <div className="anim-list-stagger mt-4 space-y-3">
                  {order.items.map((item) => (
                    <article
                      key={`${order.id}_${item.productId}_${item.color}`}
                      className="anim-surface grid gap-3 rounded-2xl border border-slate-200 p-3 sm:grid-cols-[88px_1fr_auto]"
                    >
                      <Image
                        src={
                          optimizeImageUrl(item.image || "/globe.svg", {
                            width: 260,
                            height: 200,
                          }) || "/globe.svg"
                        }
                        alt={item.name}
                        width={160}
                        height={120}
                        sizes="88px"
                        className="h-20 w-[88px] rounded-xl object-cover"
                      />
                      <div className="space-y-1">
                        <p className="line-clamp-1 text-sm font-bold text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">Color: {item.color}</p>
                        <p className="text-xs text-slate-500">
                          Qty {item.quantity} x {formatPKR(item.unitPrice)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Delivery: {formatPKR(item.deliveryFee)}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <p className="text-sm font-black text-slate-900">
                          {formatPKR(item.lineTotal)}
                        </p>
                        {item.slug ? (
                          <Link
                            href={`/product/${item.slug}`}
                            className="anim-interactive rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            View in Store
                          </Link>
                        ) : (
                          <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                            Store link unavailable
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="anim-surface h-fit space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
              <h2 className="text-lg font-black text-slate-900">Delivery Details</h2>
              <div className="space-y-1 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  {order.customerDetails.fullName}
                </p>
                <p>{order.customerDetails.phonePk}</p>
                <p>
                  {[
                    order.customerDetails.houseAddress,
                    order.customerDetails.tehsil,
                    order.customerDetails.district,
                    order.customerDetails.city,
                    order.customerDetails.province,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {order.customerDetails.shopName ? (
                  <p>Shop: {order.customerDetails.shopName}</p>
                ) : null}
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p className="flex justify-between">
                  <span>Subtotal</span>
                  <strong>{formatPKR(order.pricing.subtotal)}</strong>
                </p>
                <p className="mt-1 flex justify-between">
                  <span>Delivery</span>
                  <strong>{formatPKR(order.pricing.deliveryTotal)}</strong>
                </p>
                <p className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base text-slate-900">
                  <span className="font-semibold">Grand Total</span>
                  <strong>{formatPKR(order.pricing.grandTotal)}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Link
                  href="/profile"
                  className="anim-interactive inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  View All Orders
                </Link>
                <Link
                  href="/"
                  className="anim-interactive inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Continue Shopping
                </Link>
              </div>
            </aside>
          </div>
        )}
      </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="anim-surface rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
      <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
        {icon}
        {label}
      </p>
      <p className="mt-1 line-clamp-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
