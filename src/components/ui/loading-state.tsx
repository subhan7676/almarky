export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[28vh] w-full items-center justify-center sm:min-h-[40vh]">
      <div className="anim-modal inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
        <span className="size-2 animate-pulse rounded-full bg-orange-500" />
        {label}
      </div>
    </div>
  );
}
