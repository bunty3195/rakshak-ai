export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070a12]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-violet-600/20 shadow-[0_0_24px_rgba(56,189,248,0.35)]"
            aria-hidden
          >
            <span className="text-lg font-bold text-cyan-300">R</span>
          </div>
          <div className="text-left">
            <p className="font-display text-base font-semibold tracking-tight text-white">
              Rakshak AI
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Hazard intelligence
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Dual-model CV
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
            FastAPI @ :8000
          </span>
        </div>
      </div>
    </header>
  )
}
