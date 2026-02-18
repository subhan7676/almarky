"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import { LoginHeroScene } from "@/components/auth/login-hero-scene";
import { AlmarkyLogo } from "@/components/branding/almarky-logo";

function normalizeNextPath(value: string | null) {
  if (!value) return "/profile";
  if (!value.startsWith("/")) return "/profile";
  if (value.startsWith("//")) return "/profile";
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    loading,
    configured,
    configError,
    authError,
    loginWithGoogle,
    clearAuthError,
  } = useAuth();

  useEffect(() => {
    if (user) {
      const nextValue = new URLSearchParams(window.location.search).get("next");
      router.replace(normalizeNextPath(nextValue));
    }
  }, [user, router]);

  if (loading) return <LoadingState label="Preparing login..." />;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AlmarkyLogo />
        <Link
          href="/"
          className="anim-interactive rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:text-sm"
        >
          Back to Store
        </Link>
      </div>

      <LoginHeroScene>
        <div className="mx-auto w-full max-w-sm rounded-3xl border border-slate-300/80 bg-white/95 p-4 text-center shadow-lg backdrop-blur-sm sm:max-w-md sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
            Welcome Back
          </p>
          <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-3xl">
            Login to Continue
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with your Google account to continue shopping.
          </p>

          {!configured ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-800">
              {configError ?? "Service configuration is missing."}
            </div>
          ) : null}

          {authError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-xs text-rose-700">
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

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => void loginWithGoogle()}
              disabled={!configured}
              className="anim-interactive anim-login-button-glow inline-flex w-full max-w-[240px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:max-w-none sm:px-5 sm:py-3.5 sm:text-base"
            >
              <LogIn className="size-4" />
              Login with Google
            </button>
          </div>
        </div>
      </LoginHeroScene>
    </section>
  );
}
