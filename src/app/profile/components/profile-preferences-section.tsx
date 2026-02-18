import type { LocalProfileData } from "@/types/commerce";
import type { LocalProfilePatch } from "./profile-types";
import {
  ProfileActions,
  ProfileCard,
  ProfileToggleRow,
} from "./profile-ui";

type ProfilePreferencesSectionProps = {
  profile: LocalProfileData;
  updateProfile: (patch: LocalProfilePatch) => void;
  resetProfile: () => void;
  saveProfile: () => void;
};

export function ProfilePreferencesSection({
  profile,
  updateProfile,
  resetProfile,
  saveProfile,
}: ProfilePreferencesSectionProps) {
  const handleDeviceNotifications = async (checked: boolean) => {
    if (!checked) {
      updateProfile({ settings: { deviceNotifications: false } });
      return;
    }
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      updateProfile({ settings: { deviceNotifications: false } });
      return;
    }
    if (Notification.permission === "granted") {
      updateProfile({ settings: { deviceNotifications: true } });
      return;
    }
    const permission = await Notification.requestPermission();
    updateProfile({ settings: { deviceNotifications: permission === "granted" } });
  };

  return (
    <ProfileCard title="Preferences">
      <div className="space-y-3">
        <ProfileToggleRow
          label="App Notifications"
          description="Order and shipment updates inside app"
          checked={profile.settings.appNotifications}
          onChange={(checked) => updateProfile({ settings: { appNotifications: checked } })}
        />
        <ProfileToggleRow
          label="Device Notifications"
          description="Hot deal alerts on this device"
          checked={profile.settings.deviceNotifications}
          onChange={(checked) => void handleDeviceNotifications(checked)}
        />
        <ProfileToggleRow
          label="SMS Updates"
          description="Receive order updates on your phone"
          checked={profile.settings.smsUpdates}
          onChange={(checked) => updateProfile({ settings: { smsUpdates: checked } })}
        />
        <ProfileToggleRow
          label="Marketing Offers"
          description="Deals and promotions alerts"
          checked={profile.settings.marketingOptIn}
          onChange={(checked) => updateProfile({ settings: { marketingOptIn: checked } })}
        />
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Preferred Language</span>
          <select
            value={profile.settings.preferredLanguage}
            onChange={(event) =>
              updateProfile({
                settings: {
                  preferredLanguage: event.target.value as LocalProfileData["settings"]["preferredLanguage"],
                },
              })
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="English">English</option>
            <option value="Urdu">Urdu</option>
          </select>
        </label>
      </div>
      <ProfileActions onSave={saveProfile} onReset={resetProfile} />
    </ProfileCard>
  );
}
