"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, ShoppingCart, Store, UserRound } from "lucide-react";
import { BRAND_NAME } from "@/lib/constants";
import {
  subscribeActiveNotifications,
  subscribeStoreSettings,
  subscribeUserInboxNotifications,
} from "@/lib/firebase/firestore";
import {
  onNotificationSeenChange,
  readNotificationLastSeen,
  readStoreSettingsCache,
  writeStoreSettingsCache,
} from "@/lib/local-storage";
import { cn, toDate } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocalCart } from "@/components/providers/local-cart-provider";
import { AlmarkyLogo } from "@/components/branding/almarky-logo";
import type { Notification } from "@/types/commerce";

const navLinks = [
  { href: "/", label: "Store", icon: Store },
  { href: "/cart", label: "Cart", icon: ShoppingCart, iconOnly: true },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, authError, clearAuthError } = useAuth();
  const { cartCount, hydrated } = useLocalCart();
  const seenKey = useMemo(
    () => (user?.uid?.trim() ? user.uid.trim() : "guest"),
    [user?.uid],
  );
  const [broadcastNotifications, setBroadcastNotifications] = useState<
    Notification[]
  >([]);
  const [inboxNotifications, setInboxNotifications] = useState<Notification[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState(() => readNotificationLastSeen("guest"));
  const [storeNotice, setStoreNotice] = useState(
    () => readStoreSettingsCache()?.storeNotice?.trim() || "",
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    () => Boolean(readStoreSettingsCache()?.maintenanceMode),
  );

  useEffect(() => {
    setLastSeenAt(readNotificationLastSeen(seenKey));
  }, [seenKey]);

  useEffect(() => {
    return onNotificationSeenChange(() => {
      setLastSeenAt(readNotificationLastSeen(seenKey));
    });
  }, [seenKey]);

  const initials = useMemo(() => {
    const source = user?.displayName || user?.email || "";
    return source.slice(0, 2).toUpperCase();
  }, [user?.displayName, user?.email]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeStoreSettings(
        (settings) => {
          setStoreNotice(settings.storeNotice?.trim() || "");
          setMaintenanceMode(settings.maintenanceMode);
          writeStoreSettingsCache({
            storeName: settings.storeName?.trim() || BRAND_NAME,
            storeNotice: settings.storeNotice?.trim() || "",
            maintenanceMode: settings.maintenanceMode,
          });
        },
        () => {
          setStoreNotice("");
          setMaintenanceMode(false);
        },
      );
    } catch {}
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeActiveNotifications(
        (items) => setBroadcastNotifications(items),
        () => {
          setBroadcastNotifications([]);
        },
        120,
      );
    } catch {}
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    const email = user?.email?.trim() || "";
    if (!email) {
      setInboxNotifications([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeUserInboxNotifications(
        email,
        (items) => setInboxNotifications(items),
        () => setInboxNotifications([]),
        120,
      );
    } catch {}
    return () => unsubscribe?.();
  }, [user?.email]);

  const unseenNotifications = useMemo(() => {
    const all = [...broadcastNotifications, ...inboxNotifications];
    if (!all.length) return 0;
    if (!lastSeenAt) return all.length;
    return all.filter((note) => {
      const createdMs = toDate(note.createdAt)?.getTime() ?? 0;
      return createdMs > lastSeenAt;
    }).length;
  }, [broadcastNotifications, inboxNotifications, lastSeenAt]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,247,251,0.92))] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
        <Link
          href="/"
          className="anim-interactive anim-brand-breathe inline-flex items-center rounded-2xl border border-slate-300/85 bg-[linear-gradient(140deg,#ffffff,#f1f5f9)] px-2 py-1.5 shadow-sm transition hover:border-slate-400 hover:shadow-md sm:px-3 sm:py-2"
        >
          <AlmarkyLogo
            markClassName="h-7 sm:h-11"
            wordmarkClassName="text-xs tracking-[0.26em] sm:text-lg"
          />
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                aria-label={link.label}
                className={cn(
                  "anim-interactive relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold sm:text-sm",
                  link.iconOnly ? "w-10 justify-center px-0" : "",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
                )}
              >
                <Icon className="size-4" />
                {link.iconOnly ? null : link.label}
                {link.href === "/cart" && hydrated && cartCount > 0 ? (
                  <span className="anim-cart-badge-pulse absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/notifications"
          title="Notifications"
          aria-label="Notifications"
          className="anim-interactive relative inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-1.5 shadow-sm hover:border-slate-400 hover:bg-slate-50 sm:p-2"
        >
          <Bell className="size-3.5 text-slate-700 sm:size-4" />
          {unseenNotifications > 0 ? (
            <span className="anim-cart-badge-pulse absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[9px] font-bold text-white sm:min-w-5 sm:text-[10px]">
              {unseenNotifications}
            </span>
          ) : null}
        </Link>

        {user ? (
          <Link
            href="/profile"
            title={user.email ?? "Open profile"}
            aria-label="Open profile"
            className="anim-interactive hidden items-center justify-center rounded-full border border-slate-300 bg-white p-0.5 shadow-sm hover:border-slate-400 hover:bg-slate-50 md:inline-flex"
          >
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || user.email || "User profile"}
                width={34}
                height={34}
                sizes="34px"
                className="size-[34px] rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex size-[34px] items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {initials || <UserRound className="size-4" />}
              </span>
            )}
          </Link>
        ) : (
          <Link
            href="/login"
            title="Open login page"
            className="anim-interactive hidden rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 sm:text-sm md:inline-flex"
          >
            Login
          </Link>
        )}
      </div>

      {storeNotice ? (
        <div
          className={`mx-auto mb-1 w-full max-w-7xl rounded-xl px-3 py-1.5 text-[11px] sm:mb-2 sm:px-6 sm:py-2 sm:text-xs lg:px-8 ${
            maintenanceMode
              ? "border border-amber-300 bg-amber-50 text-amber-900"
              : "border border-slate-300 bg-slate-100 text-slate-700"
          }`}
        >
          {maintenanceMode ? "Maintenance: " : "Notice: "}
          {storeNotice}
        </div>
      ) : null}

      {authError ? (
        <div className="mx-auto mb-2 flex w-full max-w-7xl items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 sm:mb-3 sm:px-6 sm:text-xs lg:px-8">
          <p className="line-clamp-2">{authError}</p>
          <button
            type="button"
            onClick={clearAuthError}
            className="anim-interactive shrink-0 rounded-lg border border-rose-300 px-2 py-1 font-semibold hover:bg-rose-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </header>
  );
}
