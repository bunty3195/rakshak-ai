import { useCallback, useEffect, useState } from 'react'
import { Navbar } from './components/Navbar'
import { UploadSection } from './components/UploadSection'
import { LiveFeedSection } from './components/LiveFeedSection'
import { DetectionPanel } from './components/DetectionPanel'
import { detectImage, detectJson, detectVideo } from './services/api'

export default function App() {
  const [mainTab, setMainTab] = useState(/** @type {'upload' | 'live'} */ ('upload'))
  const [alerts, setAlerts] = useState(/** @type {Array<Record<string, unknown>>} */ ([]))
  const [backendSummary, setBackendSummary] = useState(/** @type {{potholes?: number, dogs?: number} | null} */ (null))
  const [panelUpdated, setPanelUpdated] = useState(/** @type {Date | null} */ (null))
  const [mediaType, setMediaType] = useState(/** @type {'image'|'video'|null} */ (null))
  const [imageUrl, setImageUrl] = useState(/** @type {string | null} */ (null))
  const [videoUrl, setVideoUrl] = useState(/** @type {string | null} */ (null))
  const [processedUrl, setProcessedUrl] = useState(/** @type {string | null} */ (null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [streamActive, setStreamActive] = useState(false)

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl)
    }
  }, [processedUrl])

  const analyzeVideo = useCallback(async (videoFile) => {
    setError(null)
    setLoading(true)
    setProcessedUrl(null)
    setPanelUpdated(null)

    try {
      const blob = await detectVideo(videoFile)
      const nextProcessed = URL.createObjectURL(blob)
      setProcessedUrl(nextProcessed)
      setPanelUpdated(new Date())
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Request failed'
      const isLikelyCorsNetwork =
        (e instanceof TypeError && /fetch/i.test(message)) || message === 'Failed to fetch'

      setError(
        isLikelyCorsNetwork
          ? 'Failed to fetch video. Check FastAPI is running on http://localhost:8000 and CORS allows http://localhost:5173.'
          : message,
      )
      setProcessedUrl(null)
      setPanelUpdated(null)
      setAlerts([])
      setBackendSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const analyzeFrameForAlerts = useCallback(async (imageFile) => {
    try {
      const json = await detectJson(imageFile)
      const nextAlerts = Array.isArray(json?.alerts) ? json.alerts : []
      setAlerts(nextAlerts)
      setBackendSummary(json?.summary && typeof json.summary === 'object' ? json.summary : null)
      setPanelUpdated(new Date())
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Request failed'
      setError(message)
      setAlerts([])
      setBackendSummary(null)
    }
  }, [])

  const handleSelectFile = useCallback((file) => {
    setError(null)
    setAlerts([])
    setBackendSummary(null)
    setPanelUpdated(null)
    setProcessedUrl(null)

    if (file.type.startsWith('image/')) {
      setMediaType('image')
      setVideoUrl(null)
      setImageUrl(URL.createObjectURL(file))
      return
    }

    if (file.type.startsWith('video/')) {
      setMediaType('video')
      setImageUrl(null)
      setVideoUrl(URL.createObjectURL(file))
      void analyzeVideo(file)
      return
    }

    setError('Unsupported file type. Please upload an image or video.')
  }, [analyzeVideo])

  const handleAnalyze = useCallback(async (imageFile) => {
    setError(null)
    setLoading(true)
    setProcessedUrl(null)

    try {
      const [json, imageBlob] = await Promise.all([detectJson(imageFile), detectImage(imageFile)])

      const nextAlerts = Array.isArray(json?.alerts) ? json.alerts : []
      setAlerts(nextAlerts)
      setBackendSummary(json?.summary && typeof json.summary === 'object' ? json.summary : null)
      setPanelUpdated(new Date())

      const nextProcessed = URL.createObjectURL(imageBlob)
      setProcessedUrl(nextProcessed)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Request failed'
      const isLikelyCorsNetwork =
        (e instanceof TypeError && /fetch/i.test(message)) || message === 'Failed to fetch'

      setError(
        isLikelyCorsNetwork
          ? 'Failed to fetch. Check FastAPI is running on http://localhost:8000 and CORS allows http://localhost:5173.'
          : message,
      )
      setAlerts([])
      setBackendSummary(null)
      setPanelUpdated(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const panelHint =
    mainTab === 'live'
      ? 'Sidebar shows the latest upload analysis. The live route streams video only—no JSON events on this API.'
      : undefined

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10 lg:px-10 lg:py-10">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-[#0c1222] to-slate-950/90 p-8 shadow-[0_0_60px_-15px_rgba(99,102,241,0.45)] lg:p-10">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl"
              aria-hidden
            />
            <h1 className="relative font-display text-3xl font-bold tracking-tight text-white text-glow sm:text-4xl lg:text-5xl">
              Rakshak AI 🚧
            </h1>
            <p className="relative mt-3 text-lg font-medium text-cyan-200/90 sm:text-xl">
              AI-powered road hazard detection system
            </p>
            <p className="relative mt-4 max-w-2xl text-base text-slate-400 lg:text-lg">
              Dual-model vision for potholes and stray-dog cues—upload frames for structured
              alerts, or watch the live MJPEG feed while the panel tracks your last analysis run.
            </p>
            <div className="relative mt-8 flex flex-wrap gap-2">
              {[
                { k: 'Potholes', c: '#FF0000' },
                { k: 'Dogs', c: '#FFFF00' },
                { k: 'Neural fusion', c: '#38bdf8' },
              ].map((chip) => (
                <span
                  key={chip.k}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: chip.c, boxShadow: `0 0 10px ${chip.c}` }}
                  />
                  {chip.k}
                </span>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMainTab('upload')}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                mainTab === 'upload'
                  ? 'bg-gradient-to-r from-cyan-500/30 to-violet-600/30 text-white shadow-[0_0_24px_rgba(99,102,241,0.35)]'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              Upload analysis
            </button>
            <button
              type="button"
              onClick={() => setMainTab('live')}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                mainTab === 'live'
                  ? 'bg-gradient-to-r from-cyan-500/30 to-violet-600/30 text-white shadow-[0_0_24px_rgba(99,102,241,0.35)]'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              Live feed
            </button>
          </div>

          <div className="transition-all duration-500 ease-out">
            {mainTab === 'upload' ? (
              <UploadSection
                mediaType={mediaType}
                imageUrl={imageUrl}
                videoUrl={videoUrl}
                processedUrl={processedUrl}
                loading={loading}
                error={error}
                onSelectFile={handleSelectFile}
                onAnalyze={handleAnalyze}
                onAnalyzeFrameForAlerts={analyzeFrameForAlerts}
              />
            ) : (
              <LiveFeedSection
                streamActive={streamActive}
                onStreamStatusChange={setStreamActive}
              />
            )}
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-[380px] xl:w-[400px]">
          <DetectionPanel
            alerts={alerts}
            backendSummary={backendSummary}
            loading={loading && mainTab === 'upload'}
            updatedAt={panelUpdated}
            hint={panelHint}
          />
        </div>
      </main>
    </div>
  )
}
