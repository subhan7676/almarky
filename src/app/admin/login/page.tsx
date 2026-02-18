"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import { ADMIN_ENTRY_SESSION_KEY } from "@/lib/constants";
import { AlmarkyLogo } from "@/components/branding/almarky-logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [entryAllowed, setEntryAllowed] = useState<boolean | null>(null);
  const {
    loading,
    user,
    isAdmin,
    configured,
    configError,
    authError,
    loginWithGoogle,
    logout,
    refreshAdminStatus,
    clearAuthError,
  } = useAuth();

  useEffect(() => {
    queueMicrotask(() => {
      let allowed = false;
      if (typeof window !== "undefined") {
        try {
          allowed = window.sessionStorage.getItem(ADMIN_ENTRY_SESSION_KEY) === "1";
        } catch {
          allowed = false;
        }
      }

      setEntryAllowed(allowed);
      if (!allowed) {
        router.replace("/");
      }
    });
  }, [router]);

  useEffect(() => {
    if (user && isAdmin) {
      router.replace("/admin/panel");
    }
  }, [user, isAdmin, router]);

  if (entryAllowed === null) return <LoadingState label="Loading..." />;
  if (!entryAllowed) return null;

  if (loading) return <LoadingState label="Checking admin access..." />;

  return (
    <section className="anim-page-enter mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
      <div className="flex items-center justify-between gap-2">
        <AlmarkyLogo variant="mono-dark" />
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-50">
          <ShieldCheck className="size-4" />
          Secure Access
        </div>
      </div>

      <h1 className="mt-4 text-xl font-black text-slate-900 sm:text-2xl">
        Restricted Sign-In
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Authorized account required to continue.
      </p>

      {!configured ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {configError}
        </div>
      ) : null}

      {authError ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <p>{authError}</p>
          <button
            type="button"
            onClick={clearAuthError}
            className="mt-2 rounded-lg border border-rose-300 px-2 py-1 font-semibold hover:bg-rose-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {!user ? (
        <button
          type="button"
          onClick={() => void loginWithGoogle()}
          disabled={!configured}
          className="anim-interactive mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Login with Google
        </button>
      ) : null}

      {user && !isAdmin ? (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Access denied for this account.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refreshAdminStatus()}
              className="anim-interactive rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100"
            >
              Re-check access
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="anim-interactive rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Sign out and switch account
            </button>
          </div>
        </div>
      ) : null}

      {user && isAdmin ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <p className="font-semibold">Access verified.</p>
          <Link
            href="/admin/panel"
            className="anim-interactive mt-3 inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            Continue
          </Link>
        </div>
      ) : null}
    </section>
  );
}
