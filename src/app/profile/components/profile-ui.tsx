import type { ReactNode } from "react";
import { Save } from "lucide-react";

export function ProfileCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="anim-surface rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
      <h2 className="mb-3 text-lg font-black text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export function ProfileField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-orange-300 focus:ring focus:ring-orange-100"
      />
    </label>
  );
}

export function ProfileToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="anim-surface flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-3 py-2">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <label className="inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4"
        />
      </label>
    </div>
  );
}

export function ProfileActions({
  onSave,
  onReset,
}: {
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSave}
        className="anim-interactive inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        <Save className="size-4" />
        Save Locally
      </button>
      <button
        type="button"
        onClick={onReset}
        className="anim-interactive rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
      >
        Reset Local Data
      </button>
    </div>
  );
}
