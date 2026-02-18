"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";

type RequireAuthProps = {
  children: ReactNode;
  adminOnly?: boolean;
};

export function RequireAuth({ children, adminOnly = false }: RequireAuthProps) {
  const pathname = usePathname();
  const {
    loading,
    user,
    isAdmin,
    configured,
    configError,
    authError,
    clearAuthError,
  } = useAuth();

  const loginHref = pathname
    ? `/login?next=${encodeURIComponent(pathname)}`
    : "/login";

  if (loading) return <LoadingState label="Checking account..." />;

  if (!configured) {
    return (
      <div className="anim-page-enter mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:p-6">
        <h2 className="text-lg font-semibold text-amber-900 sm:text-xl">
          Service Unavailable
        </h2>
        <p>{configError ?? "This feature is currently unavailable."}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="anim-page-enter mx-auto flex max-w-xl flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
          Login required
        </h2>
        <p className="text-sm text-slate-600">
          Sign in with Google to access this page.
        </p>
        <Link
          href={loginHref}
          className="anim-interactive w-fit rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Open Login Page
        </Link>
        {authError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <p>{authError}</p>
            <button
              type="button"
              onClick={clearAuthError}
              className="anim-interactive mt-2 rounded-lg border border-rose-300 px-2 py-1 font-semibold hover:bg-rose-100"
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="anim-page-enter mx-auto max-w-xl rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
          Page not available
        </h2>
        <p className="mt-2 text-sm text-slate-600">You do not have access to this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
