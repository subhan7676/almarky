"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import ProfileDashboard from "@/app/profile/components/profile-dashboard";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileDashboard />
    </RequireAuth>
  );
}

