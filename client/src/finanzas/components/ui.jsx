export const card =
  'rounded-[22px] bg-[var(--fnz-card)] p-5 shadow-[var(--fnz-shadow)] transition-colors duration-500'
export const btnPrimary =
  'inline-flex items-center justify-center rounded-full bg-[var(--fnz-accent)] px-5 py-2.5 text-[15px] font-semibold text-white shadow-[var(--fnz-btn-shadow)] transition hover:opacity-90 active:scale-[0.98]'
export const btnSecondary =
  'inline-flex items-center justify-center rounded-full bg-[var(--fnz-card)] px-5 py-2.5 text-[15px] font-semibold text-[var(--fnz-accent)] shadow-[var(--fnz-shadow)] ring-1 ring-[var(--fnz-line)] transition hover:bg-[var(--fnz-accent-soft)] active:scale-[0.98]'
export const btnText = 'text-[15px] font-medium text-[var(--fnz-accent)] hover:opacity-80'
export const btnDanger = 'text-[15px] font-medium text-[var(--fnz-danger)] hover:opacity-80'
export const muted = 'text-[15px] leading-relaxed text-[var(--fnz-muted)]'
export const title = 'text-[26px] font-bold tracking-tight text-[var(--fnz-text)] lg:text-[32px]'
export const empty = 'px-1 py-6 text-center text-[15px] text-[var(--fnz-muted)]'
export const itemTitle = 'text-[17px] font-semibold text-[var(--fnz-text)]'
export const itemMeta = 'mt-1 text-[13px] text-[var(--fnz-muted)]'
export const sectionLabel = 'mb-3 px-1 text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]'

export function PageHeader({ title: heading, subtitle }) {
  return (
    <header className="mb-1">
      <h2 className={title}>{heading}</h2>
      {subtitle ? <p className={`mt-1 ${muted}`}>{subtitle}</p> : null}
    </header>
  )
}
