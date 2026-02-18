"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  ShoppingBag,
  LayoutGrid,
  Package,
  Users,
  MessageSquare,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlmarkyLogo } from "@/components/branding/almarky-logo";

const navItems = [
  { href: "/admin/panel", label: "Overview", icon: LayoutGrid },
  { href: "/admin/panel/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/panel/orders", label: "Orders", icon: Package },
  { href: "/admin/panel/contacts", label: "Contacts", icon: MessageSquare },
  { href: "/admin/panel/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/panel/users", label: "Users", icon: Users },
  { href: "/admin/panel/settings", label: "Settings", icon: Settings },
];

export function AdminPanelNav() {
  const pathname = usePathname();

  return (
    <nav className="anim-surface flex flex-row gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:flex-col lg:gap-2">
      <Link
        href="/"
        className="anim-interactive hidden items-center rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50 lg:inline-flex"
      >
        <AlmarkyLogo variant="mono-dark" />
      </Link>

      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/admin/panel" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "anim-interactive inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap sm:px-3 sm:py-2 sm:text-sm",
              active
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
