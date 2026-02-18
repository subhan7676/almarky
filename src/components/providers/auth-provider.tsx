"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "firebase/auth";
import {
  type AuthError,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import {
  getClientAuth,
  getGoogleProvider,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { upsertUserProfile } from "@/lib/firebase/firestore";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  configured: boolean;
  configError: string | null;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
  clearAuthError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAuthError(error: unknown) {
  const code = (error as AuthError | undefined)?.code;
  if (code === "auth/unauthorized-domain") {
    return "Sign-in is not available on this domain.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is currently unavailable.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup was blocked. Allow popups for this site or try again.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Google popup was closed before sign-in completed.";
  }
  if (code === "auth/network-request-failed") {
    return "Network issue during sign-in. Please retry.";
  }
  if (code === "auth/invalid-api-key") {
    return "Authentication service is unavailable right now.";
  }
  return "Google login failed. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseClientConfigured);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const configError = isFirebaseClientConfigured
    ? null
    : "Service setup is incomplete.";

  const resolveAdminStatus = useCallback(async (activeUser: User | null) => {
    if (!activeUser) return false;

    try {
      const idToken = await activeUser.getIdToken();
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return false;
      }

      const result = (await response.json()) as { isAdmin?: boolean };
      return Boolean(result.isAdmin);
    } catch {
      return false;
    }
  }, []);

  const refreshAdminStatus = useCallback(async () => {
    if (!isFirebaseClientConfigured) {
      setIsAdmin(false);
      return;
    }
    const auth = getClientAuth();
    const allowed = await resolveAdminStatus(auth.currentUser);
    setIsAdmin(allowed);
  }, [resolveAdminStatus]);

  useEffect(() => {
    if (!isFirebaseClientConfigured) return;

    const auth = getClientAuth();
    void getRedirectResult(auth).catch((error) => {
      setAuthError(mapAuthError(error));
    });

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Do not block UI readiness on profile write.
      setAuthError(null);
      setLoading(false);

      void resolveAdminStatus(nextUser)
        .then((allowed) => setIsAdmin(allowed))
        .catch(() => setIsAdmin(false));

      void upsertUserProfile(nextUser).catch(() => {
        // Keep session active even if profile sync fails.
      });
    });

    return () => unsubscribe();
  }, [resolveAdminStatus]);

  const loginWithGoogle = useCallback(async () => {
    try {
      if (!isFirebaseClientConfigured) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setAuthError("No internet connection detected. Connect to internet and retry.");
        return;
      }
      if (typeof window !== "undefined") {
        const host = window.location.hostname;
        const isLocalhost =
          host === "localhost" || host === "127.0.0.1" || host === "::1";
        if (!window.isSecureContext && !isLocalhost) {
          setAuthError(
            "Google login needs HTTPS (or localhost). Open this app on localhost or deploy on HTTPS (Vercel) for mobile/network testing.",
          );
          return;
        }
      }

      const auth = getClientAuth();
      const googleProvider = getGoogleProvider();
      setAuthError(null);

      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        // Continue login flow even if browser blocks persistence.
      }

      try {
        await signInWithPopup(auth, googleProvider);
        setAuthError(null);
        return;
      } catch (popupError) {
        const popupCode = (popupError as AuthError | undefined)?.code;

        if (popupCode === "auth/network-request-failed") {
          setAuthError(mapAuthError(popupError));
          return;
        }

        if (
          popupCode === "auth/popup-closed-by-user" ||
          popupCode === "auth/cancelled-popup-request"
        ) {
          setAuthError(mapAuthError(popupError));
          return;
        }

        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          setAuthError(mapAuthError(redirectError));
        }
      }
    } catch (fatalError) {
      setAuthError(mapAuthError(fatalError));
    }
  }, []);

  const logout = useCallback(async () => {
    if (!isFirebaseClientConfigured) return;
    const auth = getClientAuth();
    await signOut(auth);
    setAuthError(null);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin,
      configured: isFirebaseClientConfigured,
      configError,
      authError,
      loginWithGoogle,
      logout,
      refreshAdminStatus,
      clearAuthError,
    }),
    [
      user,
      loading,
      isAdmin,
      configError,
      authError,
      loginWithGoogle,
      logout,
      refreshAdminStatus,
      clearAuthError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
