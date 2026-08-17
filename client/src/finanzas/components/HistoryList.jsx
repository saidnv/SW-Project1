import { formatDate } from '../lib/dates'

const ACTION_LABEL = {
  create: 'Alta',
  update: 'Edición',
  delete: 'Baja',
}

export default function HistoryList({ items, module }) {
  const rows = items.filter((item) => item.module === module).slice(0, 12)
  if (!rows.length) {
    return <p className="text-[15px] text-[var(--fnz-muted)]">Aún no hay historial en este módulo.</p>
  }

  return (
    <ul className="overflow-hidden rounded-[22px] bg-[var(--fnz-card)] shadow-[var(--fnz-shadow)]">
      {rows.map((item, index) => (
        <li
          key={item.id}
          className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[15px] ${
            index ? 'border-t border-[var(--fnz-line)]' : ''
          }`}
        >
          <span className="text-[var(--fnz-text)]">
            {ACTION_LABEL[item.action] ?? item.action}: {item.label}
          </span>
          <span className="text-[13px] text-[var(--fnz-muted)]">{formatDate(item.at)}</span>
        </li>
      ))}
    </ul>
  )
}
