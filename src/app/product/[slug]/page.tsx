"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, House, ShoppingBag } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocalCart } from "@/components/providers/local-cart-provider";
import { RectToast } from "@/components/ui/rect-toast";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getReadableFirestoreError,
  subscribeVisibleProducts,
  subscribeProductBySlug,
} from "@/lib/firebase/firestore";
import { formatPKR, optimizeImageUrl } from "@/lib/utils";
import type { ProductColor, Product } from "@/types/commerce";
import { RecommendedProducts } from "./components/recommended-products";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { configured, configError, user } = useAuth();
  const { addProductToCart, setAllSelection } = useLocalCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColorName, setSelectedColorName] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef<number | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (text: string) => {
    setToastMessage(text);
    setToastOpen(true);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastOpen(false);
    }, 1600);
  };

  useEffect(() => {
    if (!slug) return;
    if (!configured) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeProductBySlug(
        slug,
        (item) => {
          setProduct(item);
          setLoading(false);
        },
        (error) => {
          setNotice(getReadableFirestoreError(error));
          setLoading(false);
        },
      );
    } catch (error) {
      queueMicrotask(() => {
        setNotice(error instanceof Error ? error.message : "Unable to load product.");
        setLoading(false);
      });
      return;
    }

    return () => unsubscribe?.();
  }, [slug, configured]);

  useEffect(() => {
    if (!configured) return;

    const unsubscribe = subscribeVisibleProducts(
      (items) => setRelatedProducts(items),
      () => undefined,
      100,
    );

    return () => unsubscribe();
  }, [configured]);

  const selectedColor = useMemo<ProductColor | null>(() => {
    if (!product) return null;
    if (selectedColorName) {
      return (
        product.colors.find((color) => color.colorName === selectedColorName) ?? null
      );
    }
    return product.colors.find((color) => color.stock > 0) ?? null;
  }, [product, selectedColorName]);

  const onAddToCart = (requireLogin = false) => {
    if (!configured) {
      setNotice(configError ?? "Service setup is required.");
      return;
    }
    if (requireLogin && !user) {
      showToast("Login required to add to cart.");
      router.push(`/login?return=/product/${slug}`);
      return;
    }
    if (!product || !selectedColor) return;
    try {
      addProductToCart(product, selectedColor.colorName, quantity);
      setNotice(null);
      showToast("Order successfully added to cart.");
    } catch {
      setNotice("Could not add this item to cart.");
    }
  };

  const onOrderNow = () => {
    if (!configured) {
      setNotice(configError ?? "Service setup is required.");
      return;
    }
    if (!product || !selectedColor || maxAvailable <= 0) return;

    try {
      setAllSelection(false);
      addProductToCart(product, selectedColor.colorName, quantity);
      setNotice(null);
      showToast("Order successfully added to cart.");
      window.setTimeout(() => {
        router.push("/checkout");
      }, 180);
    } catch {
      setNotice("Could not start direct order for this product.");
    }
  };

  const onQuickAddRecommended = (recommendedProduct: Product) => {
    const availableColor = recommendedProduct.colors.find((color) => color.stock > 0);
    if (!availableColor) {
      setNotice("This recommended product is currently out of stock.");
      return;
    }
    try {
      addProductToCart(recommendedProduct, availableColor.colorName, 1);
      setNotice(null);
      showToast("Order successfully added to cart.");
    } catch {
      setNotice("Could not add recommended product to cart.");
    }
  };

  const maxAvailable = useMemo(() => selectedColor?.stock ?? 0, [selectedColor]);

  const recommendedProducts = useMemo(() => {
    if (!product) return [];

    const normalizedCategory = product.category.trim().toLowerCase();
    const normalizedType = product.type.trim().toLowerCase();
    const candidates = relatedProducts.filter(
      (item) =>
        item.id !== product.id &&
        item.isVisible &&
        !item.isDeleted &&
        item.totalStock > 0,
    );

    const primaryMatches = candidates.filter((item) => {
      const itemCategory = item.category.trim().toLowerCase();
      const itemType = item.type.trim().toLowerCase();
      return (
        (normalizedCategory && itemCategory === normalizedCategory) ||
        (normalizedType && itemType === normalizedType)
      );
    });

    const fallback = candidates.filter(
      (item) => !primaryMatches.some((match) => match.id === item.id),
    );

    return [...primaryMatches, ...fallback].slice(0, 8);
  }, [relatedProducts, product]);

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

  if (loading) return <LoadingState label="Loading product..." />;

  if (!product) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-white p-8 text-center text-slate-600 ring-1 ring-slate-200">
          Product not found or currently hidden.
        </div>
        {notice ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            {notice}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="space-y-6 pb-16 md:pb-0">
      <RectToast open={toastOpen} message={toastMessage} tone="success" />
      <Link
        href="/"
        className="anim-interactive inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <ArrowLeft className="size-4" />
        Back to Store
      </Link>

      <div className="anim-surface rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <div className="grid gap-2 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] sm:gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-6">
          <div className="anim-list-stagger space-y-3">
            <div className="overflow-hidden rounded-2xl bg-slate-100">
              <Image
                src={
                  optimizeImageUrl(product.images[selectedImage] || "/globe.svg", {
                    width: 1200,
                    height: 900,
                  }) || "/globe.svg"
                }
                alt={product.name}
                width={900}
                height={700}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="max-h-[52vh] w-full object-contain sm:max-h-[520px]"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`anim-interactive overflow-hidden rounded-xl ring-2 ${
                    selectedImage === index ? "ring-orange-500" : "ring-transparent"
                  }`}
                >
                  <Image
                    src={
                      optimizeImageUrl(image, {
                        width: 220,
                        height: 180,
                      }) || "/globe.svg"
                    }
                    alt={`${product.name} ${index + 1}`}
                    width={240}
                    height={180}
                    sizes="96px"
                    className="h-14 w-full object-cover sm:h-20"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="anim-list-stagger space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600 sm:text-xs">
                {product.category} / {product.type}
              </p>
              {product.isHotDeal ? (
                <span className="mt-1 inline-flex rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  Hot Deal
                </span>
              ) : null}
              <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-3xl">
                {product.name}
              </h1>
            </div>

            <div className="rounded-2xl bg-orange-50 p-3 ring-1 ring-orange-100 sm:p-4">
              <div className="flex items-end gap-2">
                <p className="text-xl font-black text-slate-900 sm:text-2xl">
                  {formatPKR(product.sellingPrice)}
                </p>
                {product.originalPrice > product.sellingPrice ? (
                  <p className="text-xs text-slate-500 line-through sm:text-sm">
                    {formatPKR(product.originalPrice)}
                  </p>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                Delivery fee: <strong>{formatPKR(product.deliveryFee)}</strong>
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">Choose Color</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => {
                  const isActive = selectedColor?.colorName === color.colorName;
                  const unavailable = color.stock <= 0;
                  return (
                    <button
                      key={color.colorName}
                      type="button"
                      onClick={() => setSelectedColorName(color.colorName)}
                      disabled={unavailable}
                      className={`anim-interactive inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 sm:text-sm ${
                        isActive
                          ? "bg-slate-900 text-white ring-slate-900"
                          : "bg-white text-slate-700 ring-slate-200"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <span
                        className="size-3 rounded-full border border-white/40"
                        style={{ backgroundColor: color.colorHex }}
                      />
                      {color.colorName} ({color.stock})
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">Quantity</p>
              <input
                type="number"
                min={1}
                max={Math.max(1, maxAvailable)}
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    Math.max(1, Math.min(Number(event.target.value) || 1, maxAvailable || 1)),
                  )
                }
                className="anim-input w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring focus:ring-orange-200 sm:w-28"
              />
              {selectedColor ? (
                <p className="mt-1 text-xs text-slate-500">
                  {selectedColor.stock} units available for {selectedColor.colorName}
                </p>
              ) : null}
            </div>

            <div className="hidden gap-3 md:grid md:grid-cols-2">
              <button
                type="button"
                onClick={() => onAddToCart(false)}
                disabled={!selectedColor || maxAvailable <= 0}
                className="anim-interactive inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <ShoppingBag className="size-4" />
                Add To Cart
              </button>
              <button
                type="button"
                onClick={onOrderNow}
                disabled={!selectedColor || maxAvailable <= 0}
                className="anim-interactive inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Order Now
              </button>
            </div>

            {notice ? (
              <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                {notice}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <h2 className="text-sm font-bold text-slate-900">Description</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
            {product.description}
          </p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.4)] backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2">
          <button
            type="button"
            onClick={() => onAddToCart(true)}
            disabled={!selectedColor || maxAvailable <= 0}
            className="anim-interactive flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Add To Cart
          </button>
          <button
            type="button"
            onClick={onOrderNow}
            disabled={!selectedColor || maxAvailable <= 0}
            className="anim-interactive flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Order Now
          </button>
          <Link
            href="/"
            aria-label="Home"
            className="anim-interactive inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          >
            <House className="size-5" />
          </Link>
        </div>
      </div>

      <RecommendedProducts
        products={recommendedProducts}
        onQuickAdd={onQuickAddRecommended}
      />
    </section>
  );
}
