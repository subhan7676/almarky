import { Bell, MapPin, Package, UserCircle2 } from "lucide-react";
import type { LocalProfileData } from "@/types/commerce";

export type ProfileTab = "overview" | "personal" | "address" | "preferences" | "orders";

export const profileTabs = [
  { id: "overview", label: "Overview", icon: UserCircle2 },
  { id: "personal", label: "Personal", icon: UserCircle2 },
  { id: "address", label: "Address", icon: MapPin },
  { id: "preferences", label: "Preferences", icon: Bell },
  { id: "orders", label: "Orders", icon: Package },
] as const;

export type LocalProfilePatch = Omit<Partial<LocalProfileData>, "settings"> & {
  settings?: Partial<LocalProfileData["settings"]>;
};

