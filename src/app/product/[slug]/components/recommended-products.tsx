"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { formatPKR, optimizeImageUrl } from "@/lib/utils";
import type { Product } from "@/types/commerce";

type RecommendedProductsProps = {
  products: Product[];
  onQuickAdd: (product: Product) => void;
};

export function RecommendedProducts({
  products,
  onQuickAdd,
}: RecommendedProductsProps) {
  if (!products.length) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
          Recommended Products
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Similar items picked for you from available inventory.
        </p>
      </div>

      <div className="anim-grid-stagger grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {products.map((item) => {
          const hasDiscount = item.originalPrice > item.sellingPrice;
          const isHotDeal = Boolean(item.isHotDeal);

          return (
            <article
              key={item.id}
              className="anim-surface relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              <Link
                href={`/product/${item.slug}`}
                aria-label={`Open ${item.name}`}
                className="absolute inset-0 z-10 rounded-2xl"
              />
              <div className="group block bg-slate-50">
                <div className="relative w-full aspect-[5/4] sm:aspect-[4/3]">
                  <Image
                    src={
                      optimizeImageUrl(item.images[0] || "/globe.svg", {
                        width: 520,
                        height: 380,
                      }) || "/globe.svg"
                    }
                    alt={item.name}
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                    className="object-contain p-1.5 transition duration-300 group-hover:scale-105 sm:p-2 lg:p-3"
                  />
                </div>
              </div>
              {isHotDeal ? (
                <span className="absolute left-2 top-2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  Hot Deal
                </span>
              ) : null}

              <div className="space-y-1.5 p-2 sm:space-y-2 sm:p-3">
                <p className="line-clamp-2 text-xs font-bold text-slate-900 sm:text-sm">
                  {item.name}
                </p>
                <p className="text-[10px] text-slate-500 sm:text-[11px]">
                  {item.category} / {item.type}
                </p>

                <div className="flex items-end gap-2">
                  <p className="text-xs font-black text-slate-900 sm:text-base">
                    {formatPKR(item.sellingPrice)}
                  </p>
                  {hasDiscount ? (
                    <p className="text-[10px] text-slate-400 line-through sm:text-[11px]">
                      {formatPKR(item.originalPrice)}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onQuickAdd(item);
                  }}
                  disabled={item.totalStock <= 0}
                  className="anim-interactive relative z-20 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <ShoppingCart className="size-4" />
                  {item.totalStock > 0 ? "Quick Add" : "Out of Stock"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
