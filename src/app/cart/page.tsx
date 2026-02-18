"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useLocalCart } from "@/components/providers/local-cart-provider";
import { LoadingState } from "@/components/ui/loading-state";
import { formatPKR, optimizeImageUrl } from "@/lib/utils";

export default function CartPage() {
  const {
    hydrated,
    items,
    selectedItems,
    subtotal,
    deliveryTotal,
    grandTotal,
    toggleItemSelection,
    setAllSelection,
    updateItemQuantity,
    removeItem,
    clearCart,
  } = useLocalCart();

  if (!hydrated) return <LoadingState label="Loading your device cart..." />;

  const allSelected = items.length > 0 && selectedItems.length === items.length;

  return (
    <section className="space-y-6">
      <div className="anim-hero-gradient rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-4 text-white sm:p-6">
        <h1 className="text-2xl font-black sm:text-3xl">Your Cart</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Cart data is saved on your current device only and is not uploaded until you
          place an order.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="anim-surface rounded-3xl bg-white p-5 text-center ring-1 ring-slate-200 sm:p-10">
          <p className="text-xl font-bold text-slate-900">Your cart is empty</p>
          <p className="mt-2 text-sm text-slate-600">
            Add products from storefront to start your order.
          </p>
          <Link
            href="/"
            className="anim-interactive mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-5 grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start">
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 sm:pr-2">
            <div className="anim-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => setAllSelection(event.target.checked)}
                />
                Select all items
              </label>
              <button
                type="button"
                onClick={clearCart}
                className="anim-interactive rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Clear Cart
              </button>
            </div>

            <div className="anim-list-stagger space-y-4">
              {items.map((item) => (
              <article
                key={item.id}
                className="anim-surface grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200 sm:grid-cols-[auto_1fr_auto] sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.selectedForCheckout}
                    onChange={(event) =>
                      toggleItemSelection(item.id, event.target.checked)
                    }
                    className="mt-2"
                  />
                  <Image
                    src={
                      optimizeImageUrl(item.productSnapshot.image || "/globe.svg", {
                        width: 280,
                        height: 210,
                      }) || "/globe.svg"
                    }
                    alt={item.productSnapshot.name}
                    width={180}
                    height={130}
                    sizes="112px"
                    className="h-20 w-24 rounded-xl object-cover sm:h-24 sm:w-28"
                  />
                </div>

                <div className="space-y-1.5">
                  <Link
                    href={`/product/${item.productSnapshot.slug}`}
                    className="anim-interactive line-clamp-1 text-sm font-bold text-slate-900 hover:text-orange-600 sm:text-base"
                  >
                    {item.productSnapshot.name}
                  </Link>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 sm:text-sm">
                    <span>Type: {item.productSnapshot.type}</span>
                    <span>Color: {item.colorName}</span>
                    <span>Delivery: {formatPKR(item.deliveryFee)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="font-semibold text-slate-900">
                      {formatPKR(item.unitPrice)}
                    </span>
                    <span className="text-slate-400 line-through">
                      {formatPKR(item.productSnapshot.originalPrice)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                      className="anim-interactive rounded-lg bg-white p-1 text-slate-700 hover:bg-slate-200"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-8 text-center text-xs font-semibold text-slate-900 sm:text-sm">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      className="anim-interactive rounded-lg bg-white p-1 text-slate-700 hover:bg-slate-200"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="anim-interactive inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </button>
                </div>
              </article>
              ))}
            </div>
          </div>

          <aside className="anim-surface h-fit rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5 sticky top-20 sm:top-24">
            <h2 className="text-lg font-black text-slate-900 sm:text-xl">
              Order Summary
            </h2>
            <div className="mt-3 space-y-2 text-xs text-slate-600 sm:mt-4 sm:text-sm">
              <div className="flex items-center justify-between">
                <span>Selected items</span>
                <strong>{selectedItems.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <strong>{formatPKR(subtotal)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery</span>
                <strong>{formatPKR(deliveryTotal)}</strong>
              </div>
              <div className="my-2 h-px bg-slate-200" />
              <div className="flex items-center justify-between text-sm text-slate-900 sm:text-base">
                <span className="font-semibold">Grand total</span>
                <strong>{formatPKR(grandTotal)}</strong>
              </div>
            </div>

            {selectedItems.length > 0 ? (
              <Link
                href="/checkout"
                className="anim-interactive mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-700 sm:mt-5 sm:px-4 sm:py-3"
              >
                Proceed to Checkout
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-3 py-2.5 text-sm font-bold text-slate-500 sm:mt-5 sm:px-4 sm:py-3"
              >
                Select items to Checkout
              </button>
            )}

            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
              <p className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                <ShieldCheck className="size-4" />
                Privacy mode enabled
              </p>
              <p className="mt-1">
                Cart is stored only in this browser/device local storage.
              </p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
