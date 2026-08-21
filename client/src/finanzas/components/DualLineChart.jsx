import { useEffect, useMemo, useState } from 'react'
import { formatMonthShort } from '../lib/dates'
import { formatSoles } from '../lib/money'
import { card } from './ui'

function useNarrow(breakpoint = 640) {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : true,
  )
  useEffect(() => {
    function onResize() {
      setNarrow(window.innerWidth < breakpoint)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return narrow
}

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

function coordsFor(points, xFor, yFor, key) {
  return points.map((point, index) => ({ x: xFor(index), y: yFor(point[key]) }))
}

function straightPath(coords) {
  return coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function steppedPath(coords) {
  return coords
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`
      return `L ${point.x} ${coords[index - 1].y} L ${point.x} ${point.y}`
    })
    .join(' ')
}

function smoothPath(coords) {
  if (coords.length < 2) return straightPath(coords)
  if (coords.length === 2) {
    const [start, end] = coords
    const dx = (end.x - start.x) / 2
    return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`
  }

  let path = `M ${coords[0].x} ${coords[0].y}`
  for (let index = 0; index < coords.length - 1; index += 1) {
    const previous = coords[index - 1] || coords[index]
    const current = coords[index]
    const next = coords[index + 1]
    const after = coords[index + 2] || next
    const cp1x = current.x + (next.x - previous.x) / 6
    const cp1y = current.y + (next.y - previous.y) / 6
    const cp2x = next.x - (after.x - current.x) / 6
    const cp2y = next.y - (after.y - current.y) / 6
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
  }
  return path
}

function linePath(points, xFor, yFor, key, style = 'straight') {
  if (!points.length) return ''
  const coords = coordsFor(points, xFor, yFor, key)
  if (style === 'stepped') return steppedPath(coords)
  if (style === 'smooth') return smoothPath(coords)
  return straightPath(coords)
}

function areaPath(points, xFor, yFor, key, baseline, style = 'straight') {
  if (!points.length) return ''
  const top = linePath(points, xFor, yFor, key, style)
  const last = points.length - 1
  return `${top} L ${xFor(last)} ${baseline} L ${xFor(0)} ${baseline} Z`
}

export default function DualLineChart({
  eyebrow,
  title,
  footer,
  empty,
  points: rawPoints,
  hasData,
  series,
  extra,
  formatKey,
  stepped = false,
  smooth = false,
  target = 0,
}) {
  const points = Array.isArray(rawPoints) ? rawPoints : []
  const [active, setActive] = useState(Math.max(points.length - 1, 0))
  const narrow = useNarrow()

  useEffect(() => {
    setActive(Math.max(points.length - 1, 0))
  }, [points, title])

  const selected = points[active] ?? points.at(-1)

  const labelFormatter = formatKey || formatMonthShort

  const { width, height, padL, padR, padT, padB, maxY, ticks, fontSize } = useMemo(() => {
    const width = narrow ? 360 : 640
    const height = narrow ? 230 : 240
    const padL = narrow ? 46 : 58
    const padR = narrow ? 12 : 16
    const padT = 16
    const padB = narrow ? 36 : 32
    const fontSize = narrow ? 13 : 11
    const rawMax = Math.max(
      ...points.flatMap((point) => series.map((item) => Number(point[item.key]) || 0)),
      0,
    )
    const ceiling = Number(target) || 0
    let maxY
    let ticks
    if (ceiling > 0) {
      maxY = Math.max(ceiling, rawMax)
      if (rawMax > ceiling) maxY = rawMax * 1.08
      ticks = rawMax > ceiling ? [0, ceiling, maxY] : [0, ceiling / 2, ceiling]
    } else {
      maxY = niceMax(rawMax)
      ticks = [0, maxY / 2, maxY]
    }
    if (!maxY || !Number.isFinite(maxY)) maxY = 100
    return { width, height, padL, padR, padT, padB, maxY, ticks, fontSize }
  }, [narrow, points, series, target])

  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const lastIndex = Math.max(points.length - 1, 1)
  const xFor = (index) => padL + (points.length === 1 ? innerW / 2 : (index / lastIndex) * innerW)
  const yFor = (value) => padT + innerH - ((Number(value) || 0) / maxY) * innerH
  const baseline = padT + innerH
  const pathStyle = smooth ? 'smooth' : stepped ? 'stepped' : 'straight'
  const markerR = (index, jumped) => {
    if (active === index) return narrow ? 7 : 5.5
    if (jumped) return narrow ? 6 : 4.5
    return narrow ? 5 : 3.5
  }

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
          <h3 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--fnz-text)] sm:text-[20px]">{title}</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-[14px] font-medium sm:text-[13px]">
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
          <p className="text-[13px] text-[var(--fnz-muted)] sm:text-[12px]">
            {selected.label || labelFormatter(selected.key)}
          </p>
          <div className={`mt-2 grid gap-2 ${series.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {series.map((item) => (
              <div key={item.key}>
                <p className="text-[13px] text-[var(--fnz-muted)] sm:text-[12px]">{item.label}</p>
                <p className="mt-0.5 text-[18px] font-semibold tabular-nums sm:text-[15px]" style={{ color: item.color }}>
                  {formatSoles(selected[item.key])}
                </p>
              </div>
            ))}
          </div>
          {(Number(selected.increment) || 0) !== 0 && (
            <p className="mt-2 text-[14px] leading-snug sm:text-[13px]">
              <span className={selected.increment > 0 ? 'text-[var(--fnz-success)]' : 'text-[var(--fnz-danger)]'}>
                {selected.increment > 0 ? '+' : ''}
                {formatSoles(selected.increment)}
              </span>
              {selected.source ? (
                <span className="text-[var(--fnz-muted)]"> · {selected.source}</span>
              ) : (
                <span className="text-[var(--fnz-muted)]"> · aporte</span>
              )}
            </p>
          )}
          {selected.reached ? (
            <p className="mt-2 text-[14px] font-medium text-[var(--fnz-success)] sm:text-[13px]">Meta alcanzada</p>
          ) : selected.remaining != null ? (
            <p className="mt-2 text-[14px] text-[var(--fnz-muted)] sm:text-[13px]">Faltan {formatSoles(selected.remaining)}</p>
          ) : null}
        </div>
      )}

      <div className="mt-2 w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[210px] w-full max-w-full sm:h-[220px]"
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
              <text x={padL - 8} y={yFor(tick) + 4} textAnchor="end" fill="var(--fnz-muted)" fontSize={fontSize}>
                {formatAxis(tick)}
              </text>
            </g>
          ))}

          {series.map((item) => {
            const showFill = item.fill ?? !item.dashed
            return (
              <g key={item.key}>
                {showFill ? (
                  <path d={areaPath(points, xFor, yFor, item.key, baseline, pathStyle)} fill={item.color} opacity="0.12" />
                ) : null}
                <path
                  d={linePath(points, xFor, yFor, item.key, pathStyle)}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={item.dashed ? (narrow ? 2.4 : 2) : narrow ? 3.4 : 2.75}
                  strokeDasharray={item.dashed ? '6 6' : undefined}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            )
          })}

          {points.map((point, index) => (
            <g key={point.id || `${point.key}-${index}`}>
              {series.map((item) => {
                const showMarkers = item.markers ?? !item.dashed
                if (!showMarkers) return null
                const jumped = (Number(point.increment) || 0) !== 0
                const y = yFor(point[item.key])
                if (!Number.isFinite(y)) return null
                return (
                  <circle
                    key={item.key}
                    cx={xFor(index)}
                    cy={y}
                    r={markerR(index, jumped)}
                    fill={point.reached && item.key === 'actual' ? item.color : 'var(--fnz-card)'}
                    stroke={item.color}
                    strokeWidth="2"
                  />
                )
              })}
              <text
                x={xFor(index)}
                y={height - 8}
                textAnchor="middle"
                fill={active === index ? 'var(--fnz-text)' : 'var(--fnz-muted)'}
                fontSize={fontSize}
                fontWeight={active === index ? 600 : 400}
              >
                {active === index || point.key !== points[index - 1]?.key
                  ? (points.length <= (narrow ? 5 : 8) || index === 0 || index === points.length - 1 || active === index
                    ? labelFormatter(point.key)
                    : '')
                  : ''}
              </text>
              <rect
                x={xFor(index) - innerW / Math.max(points.length, 1) / 2}
                y={padT}
                width={Math.max(innerW / Math.max(points.length, 1), narrow ? 36 : 24)}
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
