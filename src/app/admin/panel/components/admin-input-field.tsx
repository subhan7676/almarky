type AdminInputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
};

export function AdminInputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: AdminInputFieldProps) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring focus:ring-orange-100"
      />
    </label>
  );
}
