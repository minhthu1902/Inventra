export const inputClass = "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 group-data-[invalid=true]:border-danger group-data-[invalid=true]:focus:ring-danger/20";

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label data-invalid={error ? "true" : undefined} className="group flex min-w-0 flex-col gap-1.5 text-xs font-medium text-text-secondary">
      {label}
      {children}
      {error && <span className="text-[11px] font-normal text-danger" role="alert">{error}</span>}
    </label>
  );
}
