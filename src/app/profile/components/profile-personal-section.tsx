import type { LocalProfileData } from "@/types/commerce";
import type { LocalProfilePatch } from "./profile-types";
import { ProfileActions, ProfileCard, ProfileField } from "./profile-ui";

type ProfilePersonalSectionProps = {
  profile: LocalProfileData;
  updateProfile: (patch: LocalProfilePatch) => void;
  resetProfile: () => void;
  saveProfile: () => void;
};

export function ProfilePersonalSection({
  profile,
  updateProfile,
  resetProfile,
  saveProfile,
}: ProfilePersonalSectionProps) {
  return (
    <ProfileCard title="Personal Information">
      <div className="grid gap-3 sm:grid-cols-2">
        <ProfileField
          label="Display Name"
          value={profile.displayName}
          onChange={(value) => updateProfile({ displayName: value })}
        />
        <ProfileField
          label="Email"
          value={profile.email}
          onChange={(value) => updateProfile({ email: value })}
        />
        <ProfileField
          label="Full Name"
          value={profile.fullName}
          onChange={(value) => updateProfile({ fullName: value })}
        />
        <ProfileField
          label="Pakistani Phone"
          value={profile.phonePk}
          onChange={(value) => updateProfile({ phonePk: value })}
          placeholder="+923001234567"
        />
      </div>
      <ProfileActions onSave={saveProfile} onReset={resetProfile} />
    </ProfileCard>
  );
}

