import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { parseLocalDate, todayInputValue } from '../lib/dates'
import { inputClass } from './Field'

const WEEKDAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatTrigger(value) {
  const date = parseLocalDate(value)
  if (!date) return ''
  return date.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMonthTitle(date) {
  const month = date.toLocaleDateString('es-PE', { month: 'long' })
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`
}

function monthCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), outside: true })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), outside: false })
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      outside: true,
    })
  }
  return cells
}

function Chevron({ dir }) {
  return (
    <svg viewBox="0 0 12 20" className="h-[18px] w-[11px]" fill="none" aria-hidden>
      <path
        d={dir === 'prev' ? 'M10.5 1.5 2 10l8.5 8.5' : 'M1.5 1.5 10 10l-8.5 8.5'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function IosDateField({ value, min, onChange, placeholder = 'Elegir fecha' }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => parseLocalDate(value) || new Date())
  const today = todayInputValue()
  const minDate = min ? startOfDay(parseLocalDate(min) || new Date()) : null

  useEffect(() => {
    if (!open) return undefined
    const current = parseLocalDate(value) || new Date()
    setView(new Date(current.getFullYear(), current.getMonth(), 1))
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, value])

  const cells = useMemo(() => monthCells(view.getFullYear(), view.getMonth()), [view])
  const label = formatTrigger(value)

  function pick(date) {
    if (minDate && startOfDay(date) < minDate) return
    onChange(toKey(date))
    setOpen(false)
  }

  function shiftMonth(delta) {
    setView((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  function goToday() {
    const now = new Date()
    setView(new Date(now.getFullYear(), now.getMonth(), 1))
    if (!minDate || startOfDay(now) >= minDate) {
      onChange(today)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`${inputClass} text-left`}
        onClick={() => setOpen(true)}
      >
        <span className={label ? '' : 'text-[var(--fnz-muted)]'}>{label || placeholder}</span>
      </button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
              onClick={() => setOpen(false)}
            >
              <div
                className="fnz-ios-sheet w-full max-w-[390px] overflow-hidden rounded-t-[14px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:rounded-[14px] sm:shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Elegir fecha"
              >
                <div className="mx-auto mt-1.5 h-[5px] w-9 rounded-full bg-black/20 sm:hidden" />
                <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
                  <button
                    type="button"
                    className="min-h-11 px-3 text-[17px] font-normal text-[var(--fnz-accent)]"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="min-h-11 px-3 text-[17px] font-semibold text-[var(--fnz-accent)]"
                    onClick={goToday}
                  >
                    Hoy
                  </button>
                </div>

                <div className="flex items-center justify-between px-5 pb-2">
                  <p className="text-[20px] font-bold tracking-tight text-[#1c1c1e]">
                    {formatMonthTitle(view)}
                  </p>
                  <div className="flex items-center gap-5 text-[var(--fnz-accent)]">
                    <button type="button" className="flex h-11 w-8 items-center justify-center" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
                      <Chevron dir="prev" />
                    </button>
                    <button type="button" className="flex h-11 w-8 items-center justify-center" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
                      <Chevron dir="next" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 px-2 pb-1">
                  {WEEKDAYS.map((day, index) => (
                    <div
                      key={`${day}-${index}`}
                      className="py-1 text-center text-[12px] font-semibold text-[#8e8e93]"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 px-2 pb-4">
                  {cells.map((cell) => {
                    const key = toKey(cell.date)
                    const selected = value === key
                    const isToday = key === today
                    const disabled = Boolean(minDate && startOfDay(cell.date) < minDate)
                    const muted = cell.outside || disabled

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        onClick={() => pick(cell.date)}
                        className="flex h-11 items-center justify-center disabled:pointer-events-none"
                      >
                        <span
                          className={[
                            'flex h-9 w-9 items-center justify-center rounded-full text-[20px] leading-none',
                            selected ? 'bg-[var(--fnz-accent)] font-medium text-white' : '',
                            !selected && isToday && !muted ? 'font-semibold text-[var(--fnz-accent)]' : '',
                            !selected && !isToday && !muted ? 'text-[#1c1c1e]' : '',
                            !selected && muted ? 'text-[#1c1c1e]/30' : '',
                          ].join(' ')}
                        >
                          {cell.date.getDate()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
