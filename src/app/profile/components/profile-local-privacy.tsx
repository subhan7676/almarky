import { Shield } from "lucide-react";

export function ProfileLocalPrivacyNotice() {
  return (
    <div className="anim-surface rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Shield className="size-4" />
        Local Privacy Notice
      </p>
      <p className="mt-1 text-xs text-slate-600">
        This profile dashboard stores editable data only in your current device
        browser storage.
      </p>
    </div>
  );
}
