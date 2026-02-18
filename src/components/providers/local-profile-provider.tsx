"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clearLocalProfile,
  defaultLocalProfile,
  readLocalProfile,
  writeLocalProfile,
} from "@/lib/local-storage";
import type { LocalProfileData } from "@/types/commerce";

type LocalProfilePatch = Omit<Partial<LocalProfileData>, "settings"> & {
  settings?: Partial<LocalProfileData["settings"]>;
};

type LocalProfileContextValue = {
  hydrated: boolean;
  profile: LocalProfileData;
  setProfile: (next: LocalProfileData) => void;
  updateProfile: (partial: LocalProfilePatch) => void;
  resetProfile: () => void;
};

const LocalProfileContext = createContext<LocalProfileContextValue | undefined>(
  undefined,
);

export function LocalProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LocalProfileData>(defaultLocalProfile);
  const [hydrated, setHydrated] = useState(false);
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const initial = readLocalProfile();
    queueMicrotask(() => {
      setProfile(initial);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      writeLocalProfile(profile);
    }, 180);
    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, [profile, hydrated]);

  const updateProfile = useCallback((partial: LocalProfilePatch) => {
    setProfile((prev) => ({
      ...prev,
      ...partial,
      settings: {
        ...prev.settings,
        ...(partial.settings ?? {}),
      },
    }));
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(defaultLocalProfile);
    clearLocalProfile();
  }, []);

  const value = useMemo<LocalProfileContextValue>(
    () => ({
      hydrated,
      profile,
      setProfile,
      updateProfile,
      resetProfile,
    }),
    [hydrated, profile, updateProfile, resetProfile],
  );

  return (
    <LocalProfileContext.Provider value={value}>
      {children}
    </LocalProfileContext.Provider>
  );
}

export function useLocalProfile() {
  const context = useContext(LocalProfileContext);
  if (!context) {
    throw new Error("useLocalProfile must be used within LocalProfileProvider.");
  }
  return context;
}
