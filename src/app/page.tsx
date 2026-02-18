"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getReadableFirestoreError,
  subscribeVisibleProducts,
} from "@/lib/firebase/firestore";
import {
  addSearchHistory,
  clearSearchHistory,
  readProductsCache,
  readSearchHistory,
  writeProductsCache,
} from "@/lib/local-storage";
import { formatPKR, optimizeImageUrl } from "@/lib/utils";
import type { Product } from "@/types/commerce";

export default function Home() {
  const PRODUCTS_PAGE_SIZE = 24;
  const { configured, configError } = useAuth();
  const [products, setProducts] = useState<Product[]>(() => readProductsCache());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PAGE_SIZE);
  const [loading, setLoading] = useState(() => readProductsCache().length === 0);
  const [message, setMessage] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() =>
    readSearchHistory(),
  );
  const [activeSearchId, setActiveSearchId] = useState<"mobile" | "desktop" | null>(
    null,
  );
  const blurTimerRef = useRef<number | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeVisibleProducts(
        (items) => {
          setProducts(items);
          writeProductsCache(items);
          setLoading(false);
        },
        (error) => {
          setMessage(getReadableFirestoreError(error));
          setLoading(false);
        },
      );
    } catch (error) {
      queueMicrotask(() => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load products.",
        );
        setLoading(false);
      });
      return;
    }

    return () => unsubscribe?.();
  }, [configured]);

  const categories = useMemo(() => {
    const values = new Set(products.map((item) => item.category).filter(Boolean));
    return ["all", ...Array.from(values)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const searchableText = `${item.name} ${item.type} ${item.description}`.toLowerCase();
      const matchesSearch =
        deferredSearch.length === 0 || searchableText.includes(deferredSearch);
      const matchesCategory = category === "all" || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, deferredSearch, category]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  );

  const filteredHistory = useMemo(() => {
    if (!searchHistory.length) return [];
    const q = search.trim().toLowerCase();
    if (!q) return searchHistory;
    return searchHistory.filter((item) => item.toLowerCase().includes(q));
  }, [searchHistory, search]);

  const commitSearch = (value: string) => {
    const term = value.trim();
    if (!term) return;
    addSearchHistory(term);
    setSearchHistory(readSearchHistory());
  };

  const handleFocus = (id: "mobile" | "desktop") => {
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setActiveSearchId(id);
  };

  const handleBlur = (value: string) => {
    if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = window.setTimeout(() => {
      commitSearch(value);
      setActiveSearchId(null);
    }, 140);
  };

  const handleSelectHistory = (term: string) => {
    setSearch(term);
    setVisibleCount(PRODUCTS_PAGE_SIZE);
    commitSearch(term);
    setActiveSearchId(null);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  if (loading) return <LoadingState label="Loading products..." />;

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:p-6">
        <p className="text-lg font-bold text-amber-900">Service Setup Required</p>
        <p className="mt-2">
          {configError ?? "Missing required public configuration."}
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="anim-surface relative z-50 rounded-2xl bg-white p-3 ring-1 ring-slate-200 sm:hidden">
        <div className="relative z-50">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setVisibleCount(PRODUCTS_PAGE_SIZE);
              setSearch(event.target.value);
            }}
            onFocus={() => handleFocus("mobile")}
            onBlur={() => handleBlur(search)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitSearch(search);
                setActiveSearchId(null);
              }
            }}
            placeholder="Search products..."
            className="anim-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-orange-200 placeholder:text-slate-500 focus:ring"
          />
          {activeSearchId === "mobile" ? (
            <div className="absolute left-0 right-0 top-full z-[60] mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-semibold text-slate-500">
                <span>Recent searches</span>
                {searchHistory.length > 0 ? (
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleClearHistory();
                    }}
                    className="anim-interactive text-[10px] font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="max-h-40 overflow-auto">
                {filteredHistory.length > 0 ? (
                  filteredHistory.slice(0, 4).map((term) => (
                    <button
                      key={term}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelectHistory(term);
                      }}
                      className="anim-interactive w-full rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {term}
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-2 text-xs text-slate-500">
                    No recent searches.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="anim-hero-gradient anim-surface relative z-20 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-700 to-cyan-600 p-5 text-white sm:overflow-visible sm:p-7 lg:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-100">
          Realtime Marketplace
        </p>
        <h1 className="mt-2 text-2xl font-black leading-tight sm:text-4xl">
          Shop Smart on Almarky
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-orange-50 sm:text-base">
          COD checkout, stock updates, and profile-based order tracking for customers
          across Pakistan.
        </p>
        <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-[1fr_auto]">
          <div className="relative z-30">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setVisibleCount(PRODUCTS_PAGE_SIZE);
                setSearch(event.target.value);
              }}
              onFocus={() => handleFocus("desktop")}
              onBlur={() => handleBlur(search)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitSearch(search);
                  setActiveSearchId(null);
                }
              }}
              placeholder="Search by name, type, or description..."
              className="anim-input w-full rounded-xl border border-white/40 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none ring-orange-300 placeholder:text-slate-500 focus:ring"
            />
            {activeSearchId === "desktop" ? (
              <div className="absolute left-0 right-0 top-full z-[60] mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-semibold text-slate-500">
                  <span>Recent searches</span>
                  {searchHistory.length > 0 ? (
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleClearHistory();
                      }}
                      className="anim-interactive text-[10px] font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <div className="max-h-52 overflow-auto">
                {filteredHistory.length > 0 ? (
                    filteredHistory.slice(0, 4).map((term) => (
                      <button
                        key={term}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleSelectHistory(term);
                        }}
                        className="anim-interactive w-full rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {term}
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-2 text-xs text-slate-500">
                      No recent searches.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <Link
            href="/cart"
            className="anim-interactive inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Go To Cart
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="anim-list-stagger flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setVisibleCount(PRODUCTS_PAGE_SIZE);
                setCategory(item);
              }}
              className={`anim-interactive rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition sm:px-4 sm:py-2 sm:text-sm ${
                category === item
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {message}
        </div>
      ) : null}

      {filteredProducts.length === 0 ? (
        <div className="anim-surface rounded-2xl bg-white p-8 text-center text-slate-600 shadow-sm ring-1 ring-slate-200">
          No products found for the selected filters.
        </div>
      ) : (
        <div className="anim-grid-stagger grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {visibleProducts.map((product) => {
            const hasDiscount = product.originalPrice > product.sellingPrice;
            const isHotDeal = Boolean(product.isHotDeal);
            const availableColors = product.colors.filter((color) => color.stock > 0).length;
            return (
              <article
                key={product.id}
                className="anim-surface group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <Link
                  href={`/product/${product.slug}`}
                  aria-label={`Open ${product.name}`}
                  className="absolute inset-0 z-10 rounded-2xl"
                />
                <div className="relative block bg-slate-50">
                  <div className="relative w-full aspect-[5/4] sm:aspect-[4/3]">
                    <Image
                      src={
                        optimizeImageUrl(product.images[0] || "/globe.svg", {
                          width: 520,
                          height: 420,
                        }) || "/globe.svg"
                      }
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                      className="object-contain p-1.5 transition duration-300 group-hover:scale-105 sm:p-2 lg:p-3"
                    />
                  </div>
                  {isHotDeal ? (
                    <span className="absolute left-2 bottom-2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      Hot Deal
                    </span>
                  ) : null}
                  {hasDiscount ? (
                    <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-1 text-xs font-bold text-white">
                      {product.discountPercent}% OFF
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-2 sm:gap-2 sm:p-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600">
                      {product.category || "General"}
                    </p>
                    <p className="line-clamp-2 text-xs font-bold text-slate-900 sm:text-sm">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500 sm:text-[11px]">
                      {availableColors} color options available
                    </p>
                  </div>

                  <div className="flex items-end gap-2">
                    <p className="text-sm font-extrabold text-slate-900 sm:text-base">
                      {formatPKR(product.sellingPrice)}
                    </p>
                    {hasDiscount ? (
                      <p className="text-[10px] text-slate-400 line-through sm:text-xs">
                        {formatPKR(product.originalPrice)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filteredProducts.length > visibleCount ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PRODUCTS_PAGE_SIZE)}
            className="anim-interactive rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Load More Products
          </button>
        </div>
      ) : null}
    </section>
  );
}
