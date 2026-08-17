import { formatSoles, TONE_CLASSES, TONE_LABELS, amountTone } from '../lib/money'

const TONE_TEXT = {
  small: 'text-emerald-700',
  mid: 'text-amber-700',
  large: 'text-rose-700',
}

export default function AmountBadge({ amount, amounts }) {
  const tone = amountTone(amount, amounts)
  return (
    <div className="text-right">
      <p className={`text-[22px] font-bold tabular-nums leading-none ${TONE_TEXT[tone]}`}>
        {formatSoles(amount)}
      </p>
      <span className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[tone]}`}>
        {TONE_LABELS[tone]}
      </span>
    </div>
  )
}
