export default function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-[var(--fnz-muted)]">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-2xl border-0 bg-[var(--fnz-input)] px-3.5 py-3 text-[16px] text-[var(--fnz-text)] outline-none ring-0 placeholder:text-[var(--fnz-muted)] focus:bg-[var(--fnz-card)]'
