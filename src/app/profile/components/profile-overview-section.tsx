import type { LocalProfileData } from "@/types/commerce";
import { ProfileCard } from "./profile-ui";

type ProfileOverviewSectionProps = {
  profile: LocalProfileData;
  userEmail: string | null;
  ordersCount: number;
};

export function ProfileOverviewSection({
  profile,
  userEmail,
  ordersCount,
}: ProfileOverviewSectionProps) {
  return (
    <section className="anim-grid-stagger grid gap-4 md:grid-cols-2">
      <ProfileCard title="Account">
        <p className="text-sm text-slate-600">Display Name</p>
        <p className="text-base font-semibold text-slate-900">
          {profile.displayName || "Not set"}
        </p>
        <p className="mt-2 text-sm text-slate-600">Email</p>
        <p className="text-base font-semibold text-slate-900">
          {profile.email || userEmail || "Not linked"}
        </p>
      </ProfileCard>

      <ProfileCard title="Default Delivery Address">
        <p className="text-sm text-slate-700">
          {profile.houseAddress
            ? [
                profile.houseAddress,
                profile.tehsil,
                profile.district,
                profile.city,
                profile.province,
              ]
                .filter(Boolean)
                .join(", ")
            : "No default address saved yet."}
        </p>
      </ProfileCard>

      <ProfileCard title="Notifications">
        <ul className="space-y-1 text-sm text-slate-700">
          <li>App Notifications: {profile.settings.appNotifications ? "On" : "Off"}</li>
          <li>
            Device Notifications:{" "}
            {profile.settings.deviceNotifications ? "On" : "Off"}
          </li>
          <li>SMS Updates: {profile.settings.smsUpdates ? "On" : "Off"}</li>
          <li>Marketing: {profile.settings.marketingOptIn ? "On" : "Off"}</li>
        </ul>
      </ProfileCard>

      <ProfileCard title="Order Snapshot">
        <p className="text-sm text-slate-600">Total Orders</p>
        <p className="text-xl font-black text-slate-900 sm:text-2xl">
          {ordersCount}
        </p>
      </ProfileCard>
    </section>
  );
}
