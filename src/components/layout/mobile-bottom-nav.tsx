"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { House, ShoppingCart, UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocalCart } from "@/components/providers/local-cart-provider";
import { cn } from "@/lib/utils";

type MobileNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isCenter?: boolean;
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { cartCount, hydrated } = useLocalCart();

  if (pathname.startsWith("/product/")) {
    return null;
  }

  const accountHref = user ? "/profile" : "/login";

  const items: MobileNavItem[] = [
    { href: "/cart", label: "Cart", icon: ShoppingCart },
    { href: "/", label: "Home", icon: House, isCenter: true },
    { href: accountHref, label: "Account", icon: UserRound },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 px-3 md:hidden">
      <nav className="anim-mobile-nav-enter pointer-events-auto mx-auto grid w-full max-w-sm grid-cols-3 items-end rounded-3xl border border-slate-300/70 bg-white/95 px-1.5 pb-2 pt-2 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.55)] backdrop-blur-lg">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;

          if (item.label === "Account" && user?.photoURL) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                "anim-interactive relative inline-flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-semibold",
                active ? "text-slate-950" : "text-slate-600",
              )}
            >
              <Image
                src={user.photoURL}
                alt={user.displayName || user.email || "Account"}
                width={22}
                height={22}
                sizes="22px"
                className="size-5 rounded-full object-cover ring-1 ring-slate-300"
              />
              <span>{item.label}</span>
            </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "anim-interactive relative inline-flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-semibold",
                active ? "text-slate-950" : "text-slate-600",
                item.label === "Cart" ? "w-10 justify-center px-0" : "",
                item.isCenter
                  ? "anim-mobile-home-bob -mt-6 rounded-2xl border border-slate-900/10 bg-slate-900 px-2.5 py-2.5 text-slate-50 shadow-lg"
                  : "",
              )}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className={cn("size-4", item.isCenter ? "size-[18px]" : "")} />
              {item.label === "Cart" ? null : <span>{item.label}</span>}

              {item.label === "Cart" && hydrated && cartCount > 0 ? (
                <span className="anim-cart-badge-pulse absolute right-1.5 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
