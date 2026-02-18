"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { formatPKR, optimizeImageUrl } from "@/lib/utils";
import type { Product } from "@/types/commerce";

type AdminProductsListProps = {
  products: Product[];
  onEdit: (product: Product) => void;
  onToggleVisibility: (productId: string, nextVisible: boolean) => Promise<void>;
  onDelete: (productId: string) => Promise<void>;
  busyProductId: string | null;
};

export function AdminProductsList({
  products,
  onEdit,
  onToggleVisibility,
  onDelete,
  busyProductId,
}: AdminProductsListProps) {
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleProducts = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount],
  );

  return (
    <section className="anim-surface rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <h2 className="text-xl font-black text-slate-900">Products</h2>
      <div className="anim-list-stagger mt-4 space-y-3">
        {visibleProducts.map((product) => {
          const isBusy = busyProductId === product.id;
          return (
            <article key={product.id} className="anim-surface rounded-2xl border border-slate-200 p-3">
              <div className="flex gap-3">
                <Image
                  src={
                    optimizeImageUrl(product.images[0] || "/globe.svg", {
                      width: 220,
                      height: 160,
                    }) || "/globe.svg"
                  }
                  alt={product.name}
                  width={200}
                  height={150}
                  sizes="80px"
                  className="h-20 w-20 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-bold text-slate-900">{product.name}</p>
                  {product.isHotDeal ? (
                    <span className="mt-1 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                      Hot Deal
                    </span>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    {product.category} / {product.type}
                  </p>
                  <p className="text-xs text-slate-500">
                    Stock: {product.totalStock} | Delivery: {formatPKR(product.deliveryFee)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(product)}
                  disabled={isBusy}
                  className="anim-interactive inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void onToggleVisibility(product.id, !product.isVisible)}
                  disabled={isBusy}
                  className="anim-interactive inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {product.isVisible ? (
                    <>
                      <EyeOff className="size-3.5" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5" />
                      Show
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(product.id)}
                  disabled={isBusy}
                  className="anim-interactive inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  {isBusy ? "Working..." : "Delete"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {products.length > visibleCount ? (
        <button
          type="button"
          onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          className="anim-interactive mt-4 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Load More ({products.length - visibleCount} left)
        </button>
      ) : null}
    </section>
  );
}
