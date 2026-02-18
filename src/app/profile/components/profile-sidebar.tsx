import { profileTabs, type ProfileTab } from "./profile-types";

type ProfileSidebarProps = {
  activeTab: ProfileTab;
  setActiveTab: (tab: ProfileTab) => void;
  profileCompletion: number;
};

export function ProfileSidebar({
  activeTab,
  setActiveTab,
  profileCompletion,
}: ProfileSidebarProps) {
  return (
    <aside className="space-y-4">
      <div className="anim-surface rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase text-slate-500">Profile Strength</p>
        <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
          {profileCompletion}%
        </p>
        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-emerald-500"
            style={{ width: `${profileCompletion}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Improve profile completion for faster checkout autofill.
        </p>
      </div>

      <div className="anim-surface rounded-2xl bg-white p-2 ring-1 ring-slate-200">
        {profileTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`anim-interactive mb-1 inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
