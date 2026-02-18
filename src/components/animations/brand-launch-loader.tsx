"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { subscribeVisibleProducts } from "@/lib/firebase/firestore";
import { readProductsCache, writeProductsCache } from "@/lib/local-storage";
import { optimizeImageUrl } from "@/lib/utils";
import type { Product } from "@/types/commerce";

const MIN_VISIBLE_MS = 1200;
const FORCE_CLOSE_MS = 3200;
const REVISIT_MIN_VISIBLE_MS = 280;
const REVISIT_FORCE_CLOSE_MS = 900;
const LAUNCH_SEEN_SESSION_KEY = "almarky_brand_launch_seen_v1";

function isFirstLaunchInSession() {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(LAUNCH_SEEN_SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

function markLaunchSeenInSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LAUNCH_SEEN_SESSION_KEY, "1");
  } catch {
    // Ignore storage write issues and continue UI flow.
  }
}

function preloadProductImages(products: Product[], limitCount = 16) {
  const targets = products.slice(0, limitCount);
  for (const product of targets) {
    const imageUrl = product.images?.[0];
    if (!imageUrl) continue;
    const img = new Image();
    img.loading = "eager";
    img.decoding = "async";
    img.src = optimizeImageUrl(imageUrl, { width: 960, height: 720 });
  }
}

export function BrandLaunchLoader() {
  const pathname = usePathname();
  const router = useRouter();
  const shouldShow = pathname === "/";
  const [visible, setVisible] = useState(() => shouldShow && isFirstLaunchInSession());
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(12);
  const [statusText, setStatusText] = useState("Preparing premium experience");
  const closedRef = useRef(false);

  useEffect(() => {
    if (!shouldShow || !visible) return;

    let minComplete = false;
    let dataReady = false;
    let unsubscribe: (() => void) | undefined;
    const isFirstLaunch = isFirstLaunchInSession();
    markLaunchSeenInSession();
    const minVisibleMs = isFirstLaunch ? MIN_VISIBLE_MS : REVISIT_MIN_VISIBLE_MS;
    const forceCloseMs = isFirstLaunch ? FORCE_CLOSE_MS : REVISIT_FORCE_CLOSE_MS;

    const closeLoader = () => {
      if (closedRef.current) return;
      if (!minComplete || !dataReady) return;
      closedRef.current = true;
      markLaunchSeenInSession();
      setProgress(100);
      setStatusText("Ready");
      setIsClosing(true);
      window.setTimeout(() => setVisible(false), 280);
    };

    const forceClose = () => {
      if (closedRef.current) return;
      closedRef.current = true;
      markLaunchSeenInSession();
      setProgress(100);
      setStatusText("Opening storefront");
      setIsClosing(true);
      window.setTimeout(() => setVisible(false), 280);
    };

    const progressTicker = window.setInterval(() => {
      setProgress((prev) => {
        const maxWhileLoading = dataReady ? 97 : 86;
        if (prev >= maxWhileLoading) return prev;
        return prev + 2;
      });
    }, 120);

    const minTimer = window.setTimeout(() => {
      minComplete = true;
      closeLoader();
    }, minVisibleMs);

    const forceTimer = window.setTimeout(forceClose, forceCloseMs);

    router.prefetch("/");
    router.prefetch("/cart");
    router.prefetch("/profile");
    router.prefetch("/login");

    const cachedProducts = readProductsCache();
    if (cachedProducts.length > 0) {
      queueMicrotask(() => {
        setStatusText(
          isFirstLaunch ? "Optimizing product feed" : "Restoring storefront",
        );
        setProgress((prev) => Math.max(prev, 40));
      });
      preloadProductImages(cachedProducts, 14);
      window.setTimeout(() => {
        dataReady = true;
        setProgress((prev) => Math.max(prev, 74));
        closeLoader();
      }, isFirstLaunch ? 280 : 120);
    } else {
      queueMicrotask(() => {
        setStatusText("Loading products");
      });
    }

    if (!isFirebaseClientConfigured) {
      window.setTimeout(() => {
        dataReady = true;
        setProgress((prev) => Math.max(prev, 76));
        closeLoader();
      }, 180);
    } else {
      try {
        unsubscribe = subscribeVisibleProducts(
          (items) => {
            writeProductsCache(items);
            preloadProductImages(items, 18);
            dataReady = true;
            setStatusText(isFirstLaunch ? "Catalog ready" : "Ready");
            setProgress((prev) => Math.max(prev, 90));
            closeLoader();
            unsubscribe?.();
          },
          () => {
            dataReady = true;
            setStatusText(
              cachedProducts.length > 0 ? "Using optimized cache" : "Starting",
            );
            setProgress((prev) => Math.max(prev, 82));
            closeLoader();
          },
          80,
        );
      } catch {
        window.setTimeout(() => {
          dataReady = true;
          setStatusText(
            cachedProducts.length > 0 ? "Using optimized cache" : "Starting",
          );
          setProgress((prev) => Math.max(prev, 82));
          closeLoader();
        }, 220);
      }
    }

    return () => {
      unsubscribe?.();
      window.clearInterval(progressTicker);
      window.clearTimeout(minTimer);
      window.clearTimeout(forceTimer);
    };
  }, [shouldShow, visible, router]);

  if (!shouldShow || !visible) return null;

  const progressLabel = `${Math.round(progress)}%`;

  return (
    <div
      className={`fixed inset-0 z-[120] overflow-hidden bg-[#070d18] transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[12%] size-48 rounded-full bg-cyan-400/25 blur-3xl anim-launch-aurora" />
        <div className="absolute right-[10%] top-[20%] size-56 rounded-full bg-blue-500/25 blur-3xl anim-launch-aurora [animation-delay:700ms]" />
        <div className="absolute bottom-[16%] left-1/2 size-64 -translate-x-1/2 rounded-full bg-slate-500/25 blur-3xl anim-launch-aurora [animation-delay:1300ms]" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="relative">
          <svg
            viewBox="0 0 360 260"
            className="h-28 w-auto drop-shadow-[0_0_26px_rgba(45,212,191,0.35)] sm:h-36"
            fill="none"
            aria-hidden="true"
          >
            <path
              className="anim-launch-stroke-a"
              d="M24 226L172 56"
              stroke="url(#launch-stroke-a)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              className="anim-launch-stroke-b"
              d="M172 56L336 226H120L220 112"
              stroke="url(#launch-stroke-b)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="launch-stroke-a" x1="24" y1="226" x2="220" y2="80">
                <stop offset="0%" stopColor="#a5f3fc" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <linearGradient id="launch-stroke-b" x1="120" y1="230" x2="336" y2="60">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#dbeafe" />
              </linearGradient>
            </defs>
          </svg>
          <div className="pointer-events-none absolute inset-0 rounded-full anim-launch-pulse-ring" />
        </div>

        <div>
          <p className="anim-launch-wordmark text-3xl font-black tracking-[0.34em] text-slate-50 sm:text-4xl">
            ALMARKY
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300 sm:text-sm">
            {statusText}
          </p>
        </div>

        <div className="w-full max-w-xs rounded-full border border-slate-500/40 bg-slate-900/70 p-1">
          <div className="h-1.5 rounded-full bg-slate-700">
            <div
              className="h-1.5 rounded-full bg-[linear-gradient(90deg,#67e8f9,#e0f2fe)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-[10px] font-semibold text-slate-300">
            {progressLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
