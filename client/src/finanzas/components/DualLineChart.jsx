import { useEffect, useMemo, useState } from 'react'
import { formatMonthKey, formatMonthShort } from '../lib/dates'
import { formatSoles } from '../lib/money'
import { card } from './ui'

function niceMax(value) {
  if (value <= 0) return 100
  const padded = value * 1.15
  const magnitude = 10 ** Math.floor(Math.log10(padded))
  const normalized = padded / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

function formatAxis(value) {
  if (value >= 1000) {
    const thousands = value / 1000
    const shown = thousands >= 10 ? thousands.toFixed(0) : thousands.toFixed(1).replace('.', ',')
    return `S/ ${shown} mil`
  }
  return `S/ ${Math.round(value)}`
}

function linePath(points, xFor, yFor, key) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point[key])}`)
    .join(' ')
}

function areaPath(points, xFor, yFor, key, baseline) {
  if (!points.length) return ''
  const top = linePath(points, xFor, yFor, key)
  const last = points.length - 1
  return `${top} L ${xFor(last)} ${baseline} L ${xFor(0)} ${baseline} Z`
}

export default function DualLineChart({
  eyebrow,
  title,
  footer,
  empty,
  points,
  hasData,
  series,
  extra,
}) {
  const [active, setActive] = useState(Math.max(points.length - 1, 0))

  useEffect(() => {
    setActive(Math.max(points.length - 1, 0))
  }, [points, title])

  const selected = points[active] ?? points.at(-1)

  const { width, height, padL, padR, padT, padB, maxY, ticks } = useMemo(() => {
    const width = 640
    const height = 240
    const padL = 58
    const padR = 16
    const padT = 16
    const padB = 32
    const rawMax = Math.max(
      ...points.flatMap((point) => series.map((item) => Number(point[item.key]) || 0)),
      0,
    )
    const maxY = niceMax(rawMax)
    const ticks = [0, 0.5, 1].map((ratio) => maxY * ratio)
    return { width, height, padL, padR, padT, padB, maxY, ticks }
  }, [points, series])

  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const lastIndex = Math.max(points.length - 1, 1)
  const xFor = (index) => padL + (points.length === 1 ? innerW / 2 : (index / lastIndex) * innerW)
  const yFor = (value) => padT + innerH - (value / maxY) * innerH
  const baseline = padT + innerH

  if (!hasData) {
    return (
      <div className={card}>
        {extra}
        <p className="text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">{eyebrow}</p>
        <h3 className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--fnz-text)]">{title}</h3>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--fnz-muted)]">{empty}</p>
      </div>
    )
  }

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {extra}
          <p className="text-[13px] font-medium uppercase tracking-wide text-[var(--fnz-muted)]">{eyebrow}</p>
          <h3 className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--fnz-text)]">{title}</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-[13px] font-medium">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5" style={{ color: item.color }}>
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {selected && (
        <div className="mt-3 rounded-2xl bg-[var(--fnz-input)] px-3 py-3">
          <p className="text-[12px] text-[var(--fnz-muted)]">{formatMonthKey(selected.key)}</p>
          <div className={`mt-2 grid gap-2 ${series.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {series.map((item) => (
              <div key={item.key}>
                <p className="text-[12px] text-[var(--fnz-muted)]">{item.label}</p>
                <p className="mt-0.5 text-[15px] font-semibold tabular-nums" style={{ color: item.color }}>
                  {formatSoles(selected[item.key])}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 -mx-1 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[220px] w-full min-w-[280px]"
          role="img"
          aria-label={title}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={padL}
                x2={width - padR}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="var(--fnz-line)"
                strokeWidth="1"
              />
              <text x={padL - 8} y={yFor(tick) + 4} textAnchor="end" fill="var(--fnz-muted)" fontSize="11">
                {formatAxis(tick)}
              </text>
            </g>
          ))}

          {series.map((item) => (
            <g key={item.key}>
              <path d={areaPath(points, xFor, yFor, item.key, baseline)} fill={item.color} opacity="0.08" />
              <path
                d={linePath(points, xFor, yFor, item.key)}
                fill="none"
                stroke={item.color}
                strokeWidth="2.5"
                strokeDasharray={item.dashed ? '6 6' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ))}

          {points.map((point, index) => (
            <g key={point.key}>
              {series.map((item) => (
                <circle
                  key={item.key}
                  cx={xFor(index)}
                  cy={yFor(point[item.key])}
                  r={active === index ? 5 : 3.5}
                  fill="var(--fnz-card)"
                  stroke={item.color}
                  strokeWidth="2"
                />
              ))}
              <text
                x={xFor(index)}
                y={height - 8}
                textAnchor="middle"
                fill={active === index ? 'var(--fnz-text)' : 'var(--fnz-muted)'}
                fontSize="11"
                fontWeight={active === index ? 600 : 400}
              >
                {formatMonthShort(point.key)}
              </text>
              <rect
                x={xFor(index) - innerW / points.length / 2}
                y={padT}
                width={Math.max(innerW / points.length, 24)}
                height={innerH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
              />
            </g>
          ))}
        </svg>
      </div>

      {footer ? <p className="mt-1 text-[13px] leading-relaxed text-[var(--fnz-muted)]">{footer}</p> : null}
    </div>
  )
}
