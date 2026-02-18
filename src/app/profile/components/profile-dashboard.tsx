"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocalProfile } from "@/components/providers/local-profile-provider";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getReadableFirestoreError,
  subscribeUserOrders,
} from "@/lib/firebase/firestore";
import { readLocalOrders } from "@/lib/local-storage";
import { isValidPakistaniPhone, toDate } from "@/lib/utils";
import type { Order } from "@/types/commerce";
import { ProfileAddressSection } from "./profile-address-section";
import { ProfileLocalPrivacyNotice } from "./profile-local-privacy";
import { ProfileOrdersSection } from "./profile-orders-section";
import { ProfileOverviewSection } from "./profile-overview-section";
import { ProfilePersonalSection } from "./profile-personal-section";
import { ProfilePreferencesSection } from "./profile-preferences-section";
import { ProfileSidebar } from "./profile-sidebar";
import { profileTabs, type ProfileTab } from "./profile-types";

function orderCreatedAtMs(order: Order) {
  const date = toDate(order.createdAt);
  return date ? date.getTime() : 0;
}

export default function ProfileDashboard() {
  const { user, configured, configError, logout } = useAuth();
  const { hydrated, profile, updateProfile, resetProfile } = useLocalProfile();

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [orders, setOrders] = useState<Order[]>(() => readLocalOrders());
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersMessage, setOrdersMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const nextDisplayName = user.displayName ?? "";
    const nextEmail = user.email ?? "";
    if (
      (nextDisplayName && nextDisplayName !== profile.displayName) ||
      (nextEmail && nextEmail !== profile.email)
    ) {
      updateProfile({
        displayName: nextDisplayName || profile.displayName,
        email: nextEmail || profile.email,
      });
    }
  }, [user, profile.displayName, profile.email, updateProfile]);

  useEffect(() => {
    if (!configured || !user) return;

    queueMicrotask(() => {
      setOrdersLoading(true);
    });
    const unsubscribe = subscribeUserOrders(
      user.uid,
      (data) => {
        const localOrders = readLocalOrders();
        const mergedMap = new Map<string, Order>();
        for (const item of localOrders) {
          mergedMap.set(item.id, item);
        }
        for (const item of data) {
          mergedMap.set(item.id, item);
        }
        setOrders(
          Array.from(mergedMap.values()).sort(
            (a, b) => orderCreatedAtMs(b) - orderCreatedAtMs(a),
          ),
        );
        setOrdersLoading(false);
      },
      (error) => {
        setOrdersLoading(false);
        setOrdersMessage(
          `${getReadableFirestoreError(
            error,
          )} Showing device order history only.`,
        );
      },
    );

    return () => unsubscribe();
  }, [configured, user]);

  const profileCompletion = useMemo(() => {
    const checks = [
      profile.displayName.trim(),
      profile.fullName.trim(),
      profile.phonePk.trim(),
      profile.province.trim(),
      profile.city.trim(),
      profile.district.trim(),
      profile.houseAddress.trim(),
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [profile]);

  const userInitials = useMemo(() => {
    const source = user?.displayName || user?.email || "U";
    return source.slice(0, 2).toUpperCase();
  }, [user?.displayName, user?.email]);

  const saveProfile = () => {
    if (profile.phonePk && !isValidPakistaniPhone(profile.phonePk)) {
      setSaveMessage("Profile phone number is not a valid Pakistani mobile format.");
      return;
    }
    setSaveMessage("Profile saved on this device.");
  };

  if (!hydrated) return <LoadingState label="Loading local profile..." />;

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

  return (
    <section className="space-y-6">
      <div className="anim-hero-gradient rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-300">
              Account Center
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">My Profile</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-200">
              Personal data and preferences are saved on this device. Orders appear
              here after you place them.
            </p>
          </div>

          <div className="anim-surface flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || user.email || "Profile image"}
                width={40}
                height={40}
                sizes="40px"
                className="size-10 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/20 text-sm font-black text-white">
                {userInitials}
              </span>
            )}
            <div className="min-w-0">
              <p className="line-clamp-1 text-xs text-slate-200">
                {user?.email || profile.email || "Signed in user"}
              </p>
              <button
                type="button"
                onClick={() => void logout()}
                className="anim-interactive mt-1 rounded-lg border border-white/30 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/15"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4 lg:space-y-0">
          <div className="anim-surface rounded-2xl bg-white p-3 ring-1 ring-slate-200 lg:hidden">
            <label className="text-xs font-semibold uppercase text-slate-500">
              Profile Menu
            </label>
            <select
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value as ProfileTab)}
              className="anim-input mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring"
            >
              {profileTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden lg:block">
            <ProfileSidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              profileCompletion={profileCompletion}
            />
          </div>
        </div>

        <div className="anim-list-stagger space-y-4">
          {activeTab === "overview" ? (
            <ProfileOverviewSection
              profile={profile}
              userEmail={user?.email ?? null}
              ordersCount={orders.length}
            />
          ) : null}

          {activeTab === "personal" ? (
            <ProfilePersonalSection
              profile={profile}
              updateProfile={updateProfile}
              resetProfile={resetProfile}
              saveProfile={saveProfile}
            />
          ) : null}

          {activeTab === "address" ? (
            <ProfileAddressSection
              profile={profile}
              updateProfile={updateProfile}
              resetProfile={resetProfile}
              saveProfile={saveProfile}
            />
          ) : null}

          {activeTab === "preferences" ? (
            <ProfilePreferencesSection
              profile={profile}
              updateProfile={updateProfile}
              resetProfile={resetProfile}
              saveProfile={saveProfile}
            />
          ) : null}

          {activeTab === "orders" ? (
            <ProfileOrdersSection
              key={user?.uid ?? "guest-orders"}
              orders={orders}
              ordersLoading={ordersLoading}
              ordersMessage={ordersMessage}
              receiptUserKey={user?.uid ?? null}
            />
          ) : null}

          {saveMessage ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {saveMessage}
            </div>
          ) : null}

          <ProfileLocalPrivacyNotice />
        </div>
      </div>
    </section>
  );
}
