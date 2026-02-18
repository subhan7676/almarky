import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { useMemo, useState } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { ORDER_STATUS_STYLES } from "@/lib/constants";
import { readLocalOrderReceipts, setLocalOrderReceiptStatus } from "@/lib/local-storage";
import { formatPKR, toDate } from "@/lib/utils";
import type { LocalOrderReceiptStatus, Order } from "@/types/commerce";
import { ProfileCard } from "./profile-ui";

type ProfileOrdersSectionProps = {
  orders: Order[];
  ordersLoading: boolean;
  ordersMessage: string | null;
  receiptUserKey: string | null;
};

export function ProfileOrdersSection({
  orders,
  ordersLoading,
  ordersMessage,
  receiptUserKey,
}: ProfileOrdersSectionProps) {
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [receiptStatusMap, setReceiptStatusMap] = useState<
    Record<string, LocalOrderReceiptStatus>
  >(() => {
    if (!receiptUserKey) return {};
    return readLocalOrderReceipts(receiptUserKey);
  });

  const onLocalStatusChange = (
    orderId: string,
    status: LocalOrderReceiptStatus,
  ) => {
    if (!receiptUserKey) return;
    setLocalOrderReceiptStatus(receiptUserKey, orderId, status);
    setReceiptStatusMap((prev) => {
      if (status === "received") {
        return { ...prev, [orderId]: "received" };
      }
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  };

  const visibleOrders = useMemo(
    () => orders.slice(0, visibleCount),
    [orders, visibleCount],
  );

  return (
    <ProfileCard title="My Orders">
      {ordersLoading ? <LoadingState label="Loading orders..." /> : null}

      {ordersMessage ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
          {ordersMessage}
        </div>
      ) : null}

      {!ordersLoading && orders.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          No orders found yet.
        </p>
      ) : null}

      <div className="anim-list-stagger space-y-3">
        {visibleOrders.map((order) => {
          const createdAt = toDate(order.createdAt);
          const localReceiptStatus =
            receiptStatusMap[order.id] === "received" ? "received" : "pending";
          const localStatusIsReceived = localReceiptStatus === "received";
          const displayStatus =
            localStatusIsReceived && order.status === "pending"
              ? "received"
              : order.status;
          return (
            <article key={order.id} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{order.orderNumber}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    ORDER_STATUS_STYLES[displayStatus] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {displayStatus}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {createdAt ? createdAt.toLocaleString() : "Timestamp pending"}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Total: <strong>{formatPKR(order.pricing.grandTotal)}</strong>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                    localStatusIsReceived
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {localStatusIsReceived ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <Clock3 className="size-3.5" />
                  )}
                  {localStatusIsReceived ? "Received by You" : "Pending by You"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onLocalStatusChange(
                      order.id,
                      localStatusIsReceived ? "pending" : "received",
                    )
                  }
                  className="anim-interactive rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {localStatusIsReceived ? "Mark Pending" : "Mark Received"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {order.items
                  .filter((item) => Boolean(item.slug))
                  .slice(0, 3)
                  .map((item) => (
                    <Link
                      key={`${order.id}_${item.productId}_${item.slug}`}
                      href={`/product/${item.slug}`}
                      className="anim-interactive rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View in Store: {item.name}
                    </Link>
                  ))}
              </div>
            </article>
          );
        })}

        {orders.length > visibleCount ? (
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="anim-interactive rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Load More Orders
          </button>
        ) : null}
      </div>
    </ProfileCard>
  );
}
