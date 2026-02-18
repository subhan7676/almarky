"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { subscribeActiveNotifications } from "@/lib/firebase/firestore";
import {
  readDeviceNotificationLastSeen,
  writeDeviceNotificationLastSeen,
} from "@/lib/local-storage";
import { toDate } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocalProfile } from "@/components/providers/local-profile-provider";
import type { Notification } from "@/types/commerce";

const MAX_DEAL_NOTIFICATIONS = 120;

function getUserKey(email?: string | null) {
  const normalized = String(email ?? "").trim().toLowerCase();
  return normalized || "guest";
}

export function DeviceDealNotifier() {
  const { configured } = useAuth();
  const { profile, updateProfile } = useLocalProfile();
  const [dealNotifications, setDealNotifications] = useState<Notification[]>([]);
  const seenKey = useMemo(() => getUserKey(profile.email), [profile.email]);
  const lastSeenRef = useRef(0);
  const initRef = useRef(false);

  useEffect(() => {
    lastSeenRef.current = readDeviceNotificationLastSeen(seenKey);
  }, [seenKey]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted" && !profile.settings.deviceNotifications) {
      updateProfile({ settings: { deviceNotifications: true } });
    }
  }, [profile.settings.deviceNotifications, updateProfile]);

  useEffect(() => {
    if (!configured) return;
    const unsubscribe = subscribeActiveNotifications(
      (items) => {
        setDealNotifications(items.filter((item) => item.kind === "deal"));
      },
      () => {
        setDealNotifications([]);
      },
      MAX_DEAL_NOTIFICATIONS,
    );
    return () => unsubscribe();
  }, [configured]);

  useEffect(() => {
    if (!profile.settings.deviceNotifications) return;
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const lastSeen = lastSeenRef.current || 0;
    const upcoming = dealNotifications
      .map((note) => ({
        note,
        createdAt: toDate(note.createdAt)?.getTime() ?? 0,
      }))
      .filter((entry) => entry.createdAt > lastSeen)
      .sort((a, b) => a.createdAt - b.createdAt);

    if (upcoming.length === 0) return;
    if (!lastSeen) {
      const latestSeen = upcoming[upcoming.length - 1]?.createdAt ?? 0;
      if (latestSeen) {
        lastSeenRef.current = latestSeen;
        writeDeviceNotificationLastSeen(seenKey, latestSeen);
      }
      return;
    }
    const latest = upcoming[upcoming.length - 1];
    const target = latest.note;
    try {
      const notification = new Notification(target.title || "Hot Deal", {
        body: target.body,
        icon: "/icon",
        badge: "/icon",
        tag: `almarky-deal-${target.id}`,
        data: { linkUrl: target.linkUrl || "/notifications" },
      });
      notification.onclick = () => {
        const link =
          (notification as Notification & { data?: { linkUrl?: string } }).data
            ?.linkUrl || target.linkUrl || "/notifications";
        window.open(link, "_self");
      };
    } catch {
      // Ignore notification display failures.
    }
    lastSeenRef.current = latest.createdAt;
    writeDeviceNotificationLastSeen(seenKey, latest.createdAt);
  }, [dealNotifications, profile.settings.deviceNotifications, seenKey]);

  return null;
}
