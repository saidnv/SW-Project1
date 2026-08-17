const SEEN_KEY = 'kabin-melody-seen'

function emptySeen() {
  return { intro: false, advice: {}, guides: {} }
}

export function loadMelodySeen() {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return emptySeen()
    const parsed = JSON.parse(raw)
    return {
      intro: Boolean(parsed.intro),
      advice: parsed.advice && typeof parsed.advice === 'object' ? parsed.advice : {},
      guides: parsed.guides && typeof parsed.guides === 'object' ? parsed.guides : {},
    }
  } catch {
    return emptySeen()
  }
}

export function saveMelodySeen(seen) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
}
