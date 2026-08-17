import { useTheme } from '../context/ThemeContext'

export default function ThemeTransition() {
  const { transitionTo } = useTheme()
  if (!transitionTo) return null

  const kitty = transitionTo === 'kitty'

  return (
    <div className="fnz-wash pointer-events-none fixed inset-0 z-[80] flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{
          background: kitty
            ? 'radial-gradient(circle at center, #ffd6e7 0%, #ee1d6d 55%, #ff8ab5 100%)'
            : 'radial-gradient(circle at center, #ffffff 0%, #f2f2f7 60%, #dbe4f0 100%)',
        }}
      />
      {kitty ? (
        <div className="relative z-10 flex flex-col items-center">
          <img src="/finanzas/bow.png" alt="" className="fnz-pop h-28 w-28 object-contain drop-shadow-xl" />
          <p className="fnz-pop mt-3 text-lg font-semibold text-white drop-shadow">My Melody</p>
        </div>
      ) : (
        <div className="relative z-10 rounded-full bg-white/90 px-6 py-3 text-[17px] font-semibold text-zinc-800 shadow-lg">
          Claro iOS
        </div>
      )}
      {kitty &&
        [0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-full bg-yellow-300"
            style={{
              top: `${20 + i * 14}%`,
              left: `${18 + (i % 2) * 58}%`,
              animation: `fnz-sparkle 0.9s ease ${i * 80}ms infinite`,
            }}
          />
        ))}
    </div>
  )
}
