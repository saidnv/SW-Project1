import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="min-h-svh bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-5 py-12">
        <header className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-indigo-400">Inicio</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            ¿Qué quieres hacer?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-400">
            Elige una opción. Puedes volver aquí cuando quieras.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/compartir"
            className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl transition hover:border-indigo-400/50 hover:bg-slate-900"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-xl text-indigo-300">
              ▣
            </span>
            <h2 className="mt-5 text-xl font-semibold text-white">Compartir pantalla</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
              Transmite una ventana o tu pantalla y envía un enlace para verla al instante.
            </p>
            <p className="mt-5 text-[14px] font-medium text-indigo-300 group-hover:text-indigo-200">
              Entrar →
            </p>
          </Link>

          <Link
            to="/finanzas"
            className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl transition hover:border-teal-400/50 hover:bg-slate-900"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/15 text-xl text-teal-300">
              S/
            </span>
            <h2 className="mt-5 text-xl font-semibold text-white">Ver mis finanzas</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
              Deudas, pagos, ingresos y ahorros en soles, con Kabin como guía.
            </p>
            <p className="mt-5 text-[14px] font-medium text-teal-300 group-hover:text-teal-200">
              Entrar →
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
