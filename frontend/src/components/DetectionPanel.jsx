import { useEffect, useMemo, useRef, useState } from 'react'
import { getApiBase } from '../services/api'

const POTHOLE = '#FF0000'
const DOG = '#FFFF00'

function labelForType(type) {
  const t = String(type || '').toLowerCase()
  if (t.includes('dog') || t.includes('stray')) return 'Dog'
  if (t.includes('pothole')) return 'Pothole'
  return type ? String(type) : 'Unknown'
}

function accentForType(type) {
  const t = String(type || '').toLowerCase()
  if (t.includes('dog') || t.includes('stray'))
    return { border: `1px solid ${DOG}`, glow: '0 0 20px rgba(255,255,0,0.35)', label: DOG }
  return { border: `1px solid ${POTHOLE}`, glow: '0 0 20px rgba(255,0,0,0.35)', label: POTHOLE }
}

function formatConfidence(c) {
  const n = Number(c)
  if (!Number.isFinite(n)) return '—'
  const pct = n <= 1 ? n * 100 : n
  return `${pct.toFixed(1)}%`
}

function normalizeConfidence01(c) {
  const n = Number(c)
  if (!Number.isFinite(n)) return 0
  return n <= 1 ? n : n / 100
}

function bboxAreaProxy(bbox) {
  if (!Array.isArray(bbox) || bbox.length < 4) return 0
  const x1 = Number(bbox[0])
  const y1 = Number(bbox[1])
  const x2 = Number(bbox[2])
  const y2 = Number(bbox[3])
  if (![x1, y1, x2, y2].every((v) => Number.isFinite(v))) return 0
  const w = Math.max(0, x2 - x1)
  const h = Math.max(0, y2 - y1)
  return w * h
}

function classifyType(type) {
  const t = String(type || '').toLowerCase()
  if (t.includes('dog') || t.includes('stray')) return 'dog'
  if (t.includes('pothole')) return 'pothole'
  return 'unknown'
}

function computeSeverity(alerts) {
  const items = Array.isArray(alerts) ? alerts : []
  const potholes = []
  const dogs = []

  for (const a of items) {
    const cls = classifyType(a?.type)
    if (cls === 'pothole') potholes.push(a)
    if (cls === 'dog') dogs.push(a)
  }

  const potholeCount = potholes.length
  const dogCount = dogs.length

  const potholeConf = potholes.length
    ? potholes.reduce((sum, a) => sum + normalizeConfidence01(a?.confidence), 0) / potholes.length
    : 0
  const dogConf = dogs.length
    ? dogs.reduce((sum, a) => sum + normalizeConfidence01(a?.confidence), 0) / dogs.length
    : 0

  const potholeAreas = potholes.map((a) => bboxAreaProxy(a?.bbox)).filter((v) => Number.isFinite(v))
  const dogAreas = dogs.map((a) => bboxAreaProxy(a?.bbox)).filter((v) => Number.isFinite(v))

  const potholeMaxArea = potholeAreas.length ? Math.max(...potholeAreas) : 0
  const dogMaxArea = dogAreas.length ? Math.max(...dogAreas) : 0

  const potholeAreaNorm =
    potholeMaxArea > 0
      ? potholeAreas.reduce((s, v) => s + v, 0) / potholeAreas.length / potholeMaxArea
      : 0
  const dogAreaNorm =
    dogMaxArea > 0 ? dogAreas.reduce((s, v) => s + v, 0) / dogAreas.length / dogMaxArea : 0

  const potholeCountNorm = Math.min(potholeCount, 5) / 5
  const dogCountNorm = Math.min(dogCount, 5) / 5

  // 0..1 score, prioritizes potholes.
  const potholeScore01 = 0.55 * potholeCountNorm + 0.25 * potholeConf + 0.20 * potholeAreaNorm
  const dogScore01 = 0.50 * dogCountNorm + 0.25 * dogConf + 0.25 * dogAreaNorm
  const severity = Math.max(0, Math.min(100, (potholeScore01 * 0.75 + dogScore01 * 0.25) * 100))

  const level = severity < 34 ? 'Low' : severity < 67 ? 'Medium' : 'High'

  return {
    potholeCount,
    dogCount,
    totalObjects: potholeCount + dogCount,
    potholeConfAvg: potholeConf,
    dogConfAvg: dogConf,
    severity: Number(severity.toFixed(0)),
    severityLevel: level,
  }
}

function severityFromCounts(potholeCount, dogCount) {
  const p = Math.max(0, Number(potholeCount) || 0)
  const d = Math.max(0, Number(dogCount) || 0)
  const score = Math.min(100, p * 18 + d * 12)
  const level = score < 34 ? 'Low' : score < 67 ? 'Medium' : 'High'
  return { score, level }
}

/**
 * @param {object} props
 * @param {Array<Record<string, unknown>>} props.alerts
 * @param {{potholes?: number, dogs?: number} | null} [props.backendSummary]
 * @param {boolean} props.loading
 * @param {Date | null} props.updatedAt
 * @param {string} [props.hint]
 */
export function DetectionPanel({ alerts, backendSummary, loading, updatedAt, hint }) {
  const list = useMemo(() => (Array.isArray(alerts) ? alerts : []), [alerts])
  const summary = useMemo(() => computeSeverity(list), [list])
  const backendPotholes = Number(backendSummary?.potholes)
  const backendDogs = Number(backendSummary?.dogs)
  const resolvedPotholes = Number.isFinite(backendPotholes) ? backendPotholes : summary.potholeCount
  const resolvedDogs = Number.isFinite(backendDogs) ? backendDogs : summary.dogCount
  const resolvedTotal = resolvedPotholes + resolvedDogs
  const fallbackSeverity = severityFromCounts(resolvedPotholes, resolvedDogs)
  const resolvedSeverity = summary.totalObjects > 0 ? summary.severity : fallbackSeverity.score
  const resolvedSeverityLevel = summary.totalObjects > 0 ? summary.severityLevel : fallbackSeverity.level

  // Real-time voice alerts (front-end only).
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [cooldownSec, setCooldownSec] = useState(8)
  const lastSpokenAtRef = useRef(0)
  const lastSpokenSignatureRef = useRef('')

  // CSMC alert + location.
  const [locationState, setLocationState] = useState('idle')
  const [coords, setCoords] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [sendSuccess, setSendSuccess] = useState(null)

  const csmcSendUrl =
    import.meta.env.VITE_ALERTS_SEND_URL?.replace(/\/$/, '') || `${getApiBase()}/alerts/send`
  const csmcAddress = import.meta.env.VITE_CSMC_ADDRESS || ''

  useEffect(() => {
    if (!voiceEnabled) return
    if (!updatedAt) return
    if (loading) return

    if (resolvedPotholes + resolvedDogs <= 0) return

    const speechParts = []
    if (resolvedPotholes > 0) {
      speechParts.push(`${resolvedPotholes} pothole${resolvedPotholes > 1 ? 's' : ''}`)
    }
    if (resolvedDogs > 0) {
      speechParts.push(`${resolvedDogs} dog${resolvedDogs > 1 ? 's' : ''}`)
    }
    if (speechParts.length === 0) return

    const message = `${speechParts.join(' and ')} detected.`
    const signature = `${resolvedPotholes}-${resolvedDogs}`
    const now = Date.now()
    const since = now - lastSpokenAtRef.current
    const canSpeak = since >= cooldownSec * 1000 && signature !== lastSpokenSignatureRef.current
    if (!canSpeak) return

    if (!('speechSynthesis' in window)) return
    if (typeof window.SpeechSynthesisUtterance !== 'function') return

    try {
      window.speechSynthesis.cancel()
      const utter = new window.SpeechSynthesisUtterance(message)
      utter.rate = 1.05
      utter.pitch = 1
      utter.volume = 1
      lastSpokenAtRef.current = now
      lastSpokenSignatureRef.current = signature
      window.speechSynthesis.speak(utter)
    } catch {
      // Ignore speech failures (UI still works).
    }
  }, [voiceEnabled, cooldownSec, summary, backendSummary, resolvedPotholes, resolvedDogs, updatedAt, loading])

  async function requestLocation() {
    setSendError(null)
    setSendSuccess(null)

    if (!navigator.geolocation) {
      setLocationState('unsupported')
      return
    }

    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationState('ready')
      },
      (err) => {
        if (err?.code === 1) setLocationState('denied')
        else setLocationState('idle')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15_000 },
    )
  }

  async function sendToCsmc() {
    if (!coords) return
    setSendError(null)
    setSendSuccess(null)
    setSending(true)

    try {
      const payload = {
        detectedAt: updatedAt ? updatedAt.toISOString() : new Date().toISOString(),
        counts: {
          potholes: resolvedPotholes,
          dogs: resolvedDogs,
          total: resolvedTotal,
        },
        severity: {
          score: resolvedSeverity,
          level: resolvedSeverityLevel,
        },
        location: coords,
      }

      const res = await fetch(csmcSendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `CSMC send failed (${res.status})`)
      }

      setSendSuccess('Alert sent to CSMC.')
    } catch (e) {
      setSendError(
        e instanceof Error ? e.message : 'Could not send alert. Backend endpoint may be missing.',
      )
    } finally {
      setSending(false)
    }
  }

  const severityColor =
    resolvedSeverityLevel === 'High' ? '#FF0000' : resolvedSeverityLevel === 'Medium' ? '#FFFF00' : '#38bdf8'

  const mapSrc = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed` : ''
  const routeUrl =
    coords && csmcAddress
      ? `https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${encodeURIComponent(
          csmcAddress,
        )}`
      : ''

  return (
    <aside className="glass-panel flex h-full min-h-[420px] flex-col p-5 lg:min-h-0">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Detection panel</h2>
          <p className="mt-1 text-xs text-slate-400">
            Types, confidence, and model from{' '}
            <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-cyan-200">
              /detect/json
            </code>
          </p>
        </div>
        {loading && (
          <div
            className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400"
            role="status"
            aria-label="Loading"
          />
        )}
      </div>

      {/* Live-feed first drawer: location + map + CSMC send */}
      <div className="mb-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.06] p-4 shadow-[0_0_28px_rgba(56,189,248,0.12)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
              Live Alert Drawer
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Use this during live monitoring. MJPEG alone has no JSON stream, so alert counts update
              whenever detection JSON is refreshed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => (coords ? setShowMap(true) : requestLocation())}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
          >
            {coords ? 'View map' : 'Enable location'}
          </button>
        </div>

        <div className="mt-3 text-xs text-slate-300">
          <span className="text-slate-400">Objects:</span> {resolvedTotal} ·{' '}
          <span className="text-slate-400">Potholes:</span> {resolvedPotholes} ·{' '}
          <span className="text-slate-400">Dogs:</span> {resolvedDogs} ·{' '}
          <span className="text-slate-400">Severity:</span> {resolvedSeverity} ({resolvedSeverityLevel})
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!coords || sending}
            onClick={sendToCsmc}
            className="rounded-xl bg-gradient-to-r from-cyan-500/30 to-violet-600/30 px-4 py-2 text-[11px] font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.25)] transition hover:brightness-110 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send Alert to CSMC'}
          </button>
          {locationState === 'requesting' && (
            <span className="text-[11px] text-slate-300">Requesting location…</span>
          )}
          {locationState === 'denied' && (
            <span className="text-[11px] text-red-200">Location permission denied.</span>
          )}
          {locationState === 'unsupported' && (
            <span className="text-[11px] text-red-200">Geolocation is not supported in this browser.</span>
          )}
        </div>
      </div>

      {/* Severity + voice + CSMC actions */}
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Latest severity
            </p>
            <p className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-display font-bold" style={{ color: severityColor }}>
                {resolvedSeverity}
              </span>
              <span
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-slate-200"
                style={{
                  boxShadow:
                    resolvedSeverityLevel === 'High'
                      ? '0 0 22px rgba(255,0,0,0.22)'
                      : resolvedSeverityLevel === 'Medium'
                        ? '0 0 22px rgba(255,255,0,0.18)'
                        : '0 0 22px rgba(56,189,248,0.18)',
                  color: severityColor,
                }}
              >
                {resolvedSeverityLevel}
              </span>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Potholes: <span className="text-slate-200">{resolvedPotholes}</span> · Dogs:{' '}
              <span className="text-slate-200">{resolvedDogs}</span> · Total:{' '}
              <span className="text-slate-200">{resolvedTotal}</span>
            </p>
          </div>
          {updatedAt && <span className="tabular-nums text-[11px] text-slate-500">{updatedAt.toLocaleTimeString()}</span>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs">
            <span className="text-slate-200">Voice alerts</span>
            <button
              type="button"
              onClick={() => setVoiceEnabled((v) => !v)}
              className={`relative h-7 w-12 rounded-full border transition ${
                voiceEnabled ? 'border-cyan-300/40 bg-cyan-400/15' : 'border-white/10 bg-white/5'
              }`}
              aria-pressed={voiceEnabled}
            >
              <span
                className="absolute top-1 left-1 h-5 w-5 rounded-full bg-cyan-200/90 transition"
                style={{ transform: voiceEnabled ? 'translateX(20px)' : 'translateX(0px)' }}
              />
            </button>
          </label>

          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-[11px] text-slate-300">Cooldown</p>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min={3}
                max={15}
                step={1}
                value={cooldownSec}
                onChange={(e) => setCooldownSec(Number(e.target.value))}
                className="w-full accent-cyan-400"
                aria-label="Voice cooldown seconds"
              />
              <span className="w-10 text-right font-mono text-[11px] text-cyan-200/90">
                {cooldownSec}s
              </span>
            </div>
          </div>
        </div>

        {resolvedTotal > 0 && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">CSMC Alert</p>
                <p className="mt-1 text-xs text-slate-300">
                  {resolvedTotal} objects · {resolvedPotholes} potholes · {resolvedDogs} dogs · severity{' '}
                  {resolvedSeverity} ({resolvedSeverityLevel})
                </p>
              </div>
              <button
                type="button"
                onClick={() => (coords ? setShowMap(true) : requestLocation())}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
              >
                {coords ? 'View map' : 'Enable location'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!coords || sending}
                onClick={sendToCsmc}
                className="rounded-xl bg-gradient-to-r from-cyan-500/30 to-violet-600/30 px-4 py-2 text-[11px] font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.25)] transition hover:brightness-110 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send Alert to CSMC'}
              </button>
              {locationState === 'requesting' && (
                <span className="text-[11px] text-slate-400">Requesting location…</span>
              )}
              {locationState === 'denied' && (
                <span className="text-[11px] text-red-200">Location permission denied.</span>
              )}
            </div>
            {sendError && <p className="mt-2 text-[11px] text-red-200">{sendError}</p>}
            {sendSuccess && <p className="mt-2 text-[11px] text-emerald-200">{sendSuccess}</p>}
          </div>
        )}
      </div>

      {hint && (
        <p className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
          {hint}
        </p>
      )}

      <div className="mb-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          {resolvedTotal} object{resolvedTotal === 1 ? '' : 's'} detected
        </span>
        {updatedAt && (
          <span className="tabular-nums">Updated {updatedAt.toLocaleTimeString()}</span>
        )}
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {list.length === 0 && !loading && (
          <li className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-500">
            Run image analysis to populate hazard cards. Live MJPEG does not expose JSON on this
            API—upload keeps results here for your demo.
          </li>
        )}

        {list.map((alert, i) => {
          const accent = accentForType(alert.type)
          const title = labelForType(alert.type)
          const model = alert.model != null ? String(alert.model) : '—'

          return (
            <li
              key={`${i}-${title}-${model}`}
              className="group animate-fade-up relative overflow-hidden rounded-xl bg-white/[0.04] p-4 transition-transform duration-300 hover:-translate-y-0.5"
              style={{
                animationDelay: `${i * 60}ms`,
                border: accent.border,
                boxShadow: accent.glow,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `linear-gradient(135deg, ${accent.label}12, transparent 50%)`,
                }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <span
                  className="font-display text-sm font-semibold tracking-wide"
                  style={{ color: accent.label }}
                >
                  {title}
                </span>
                <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono text-xs text-cyan-200/90">
                  {formatConfidence(alert.confidence)}
                </span>
              </div>
              <p className="relative mt-2 truncate text-xs text-slate-400" title={model}>
                Model: <span className="text-slate-300">{model}</span>
              </p>
              {Array.isArray(alert.bbox) && alert.bbox.length >= 4 && (
                <p className="relative mt-1 font-mono text-[10px] text-slate-500">
                  bbox [{alert.bbox.slice(0, 4).map((v) => Number(v).toFixed(0)).join(', ')}]
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {showMap && coords && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Map overlay"
        >
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#070a12]/90 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">Location & route overlay</p>
                <p className="text-xs text-slate-400">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="p-5">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <iframe
                  title="Google Map preview"
                  src={mapSrc}
                  className="h-64 w-full"
                  loading="lazy"
                />
              </div>

              {routeUrl && (
                <a
                  href={routeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Open route in Google Maps
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
