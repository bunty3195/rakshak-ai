import { useState } from 'react'
import { getVideoFeedUrl } from '../services/api'

/**
 * @param {object} props
 * @param {boolean} props.streamActive
 * @param {(active: boolean) => void} props.onStreamStatusChange
 */
export function LiveFeedSection({ streamActive, onStreamStatusChange }) {
  const [feedUrl] = useState(() => `${getVideoFeedUrl()}?t=${Date.now()}`)

  return (
    <section className="glass-panel overflow-hidden p-0">
      <div className="flex flex-col gap-1 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Live camera</h2>
          <p className="text-sm text-slate-400">
            Stream from <code className="text-cyan-200/90">GET /video_feed</code> (MJPEG)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              streamActive
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                : 'border-white/15 bg-white/5 text-slate-400'
            }`}
          >
            <span
              className={`relative flex h-2 w-2 rounded-full ${
                streamActive ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
              aria-hidden
            >
              {streamActive && (
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
            </span>
            {streamActive ? 'Stream connected' : 'Waiting for stream'}
          </div>
        </div>
      </div>

      <div className="relative bg-black/50">
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[min(100%,280px)] flex-col gap-2 rounded-xl border border-white/10 bg-black/55 px-4 py-3 text-xs text-white backdrop-blur-md">
          <div className="flex items-center gap-2 font-semibold tracking-wide text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
            Live monitoring active
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                streamActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-500'
              }`}
            />
            <span>
              Detection HUD:{' '}
              <span className="font-medium text-white">
                {streamActive ? 'active' : 'inactive'}
              </span>
            </span>
          </div>
        </div>

        <div className="aspect-video w-full">
          <img
            src={feedUrl}
            alt="Live MJPEG road feed"
            className="h-full w-full object-contain"
            onLoad={() => onStreamStatusChange(true)}
            onError={() => onStreamStatusChange(false)}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070a12] to-transparent" />
      </div>
    </section>
  )
}
