import type { LocalProfileData } from "@/types/commerce";
import type { LocalProfilePatch } from "./profile-types";
import { ProfileActions, ProfileCard, ProfileField } from "./profile-ui";

type ProfileAddressSectionProps = {
  profile: LocalProfileData;
  updateProfile: (patch: LocalProfilePatch) => void;
  resetProfile: () => void;
  saveProfile: () => void;
};

export function ProfileAddressSection({
  profile,
  updateProfile,
  resetProfile,
  saveProfile,
}: ProfileAddressSectionProps) {
  return (
    <ProfileCard title="Address Book (Local Device)">
      <div className="grid gap-3 sm:grid-cols-2">
        <ProfileField
          label="Province"
          value={profile.province}
          onChange={(value) => updateProfile({ province: value })}
        />
        <ProfileField
          label="City"
          value={profile.city}
          onChange={(value) => updateProfile({ city: value })}
        />
        <ProfileField
          label="Tehsil"
          value={profile.tehsil}
          onChange={(value) => updateProfile({ tehsil: value })}
        />
        <ProfileField
          label="District"
          value={profile.district}
          onChange={(value) => updateProfile({ district: value })}
        />
        <ProfileField
          label="Shop Name (Optional)"
          value={profile.shopName ?? ""}
          onChange={(value) => updateProfile({ shopName: value })}
        />
        <div className="sm:col-span-2">
          <ProfileField
            label="House Address"
            value={profile.houseAddress}
            onChange={(value) => updateProfile({ houseAddress: value })}
          />
        </div>
      </div>
      <ProfileActions onSave={saveProfile} onReset={resetProfile} />
    </ProfileCard>
  );
}
