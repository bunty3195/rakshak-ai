import { useEffect, useId, useRef, useState } from 'react'

const POTHOLE = '#FF0000'
const DOG = '#FFFF00'

/**
 * @param {object} props
 * @param {'image'|'video'|null} props.mediaType
 * @param {string | null} props.imageUrl
 * @param {string | null} props.videoUrl
 * @param {string | null} props.processedUrl
 * @param {boolean} props.loading
 * @param {string | null} props.error
 * @param {(file: File) => void} props.onSelectFile
 * @param {(imageFile: File) => void} props.onAnalyze
 * @param {(frameFile: File) => void} props.onAnalyzeFrameForAlerts
 */
export function UploadSection({
  mediaType,
  imageUrl,
  videoUrl,
  processedUrl,
  loading,
  error,
  onSelectFile,
  onAnalyze,
  onAnalyzeFrameForAlerts,
}) {
  const inputId = useId()
  const videoRef = useRef(null)
  const didAutoAnalyzeRef = useRef(false)
  const pollTimerRef = useRef(null)
  const pollInFlightRef = useRef(false)
  const [videoFrameStatus, setVideoFrameStatus] = useState(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    onSelectFile(file)

    if (file.type.startsWith('image/')) onAnalyze(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!(file.type.startsWith('image/') || file.type.startsWith('video/'))) return

    onSelectFile(file)
    if (file.type.startsWith('image/')) onAnalyze(file)
  }

  async function captureFrameAsJpegFile() {
    const video = videoRef.current
    if (!video) throw new Error('Video element not ready')
    if (video.readyState < 2) throw new Error('Video frame is not ready yet')

    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported in this browser')

    ctx.drawImage(video, 0, 0, w, h)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob) throw new Error('Could not capture video frame')

    return new File([blob], `frame-${Math.round((video.currentTime || 0) * 100) / 100}.jpg`, {
      type: 'image/jpeg',
    })
  }

  async function analyzeVideoFrame(timeSeconds, showStatus = true) {
    if (!videoUrl) return
    if (showStatus) {
      setVideoFrameStatus(`Analyzing frame at ${timeSeconds.toFixed(2)}s…`)
    }
    try {
      const frameFile = await captureFrameAsJpegFile()
      await onAnalyzeFrameForAlerts(frameFile)
      if (showStatus) setVideoFrameStatus(null)
    } catch {
      if (showStatus) setVideoFrameStatus('Video frame analysis failed. Try again.')
    }
  }

  useEffect(() => {
    // Reset auto analyze on new video selection.
    didAutoAnalyzeRef.current = false
    setVideoFrameStatus(null)
  }, [videoUrl])

  useEffect(() => {
    if (mediaType !== 'video' || !videoUrl) return
    if (!videoRef.current) return
    if (didAutoAnalyzeRef.current) return

    const video = videoRef.current
    // If metadata isn't ready yet, wait for it.
    if (video.readyState >= 2) {
      didAutoAnalyzeRef.current = true
      analyzeVideoFrame(0).catch(() => {
        setVideoFrameStatus('Could not auto-analyze video frame. Try “Analyze current frame”.')
      })
      return
    }

    function onLoadedMetadata() {
      if (didAutoAnalyzeRef.current) return
      didAutoAnalyzeRef.current = true
      analyzeVideoFrame(0).catch(() => {
        setVideoFrameStatus('Could not auto-analyze video frame. Try “Analyze current frame”.')
      })
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true })
    return () => video.removeEventListener('loadedmetadata', onLoadedMetadata)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, videoUrl, loading])

  useEffect(() => {
    if (mediaType !== 'video' || !videoUrl || !videoRef.current) return
    const video = videoRef.current

    function stopPolling() {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }

    function startPolling() {
      if (pollTimerRef.current) return
      pollTimerRef.current = setInterval(async () => {
        if (pollInFlightRef.current) return
        if (video.paused || video.ended) return
        pollInFlightRef.current = true
        try {
          await analyzeVideoFrame(video.currentTime || 0, false)
        } finally {
          pollInFlightRef.current = false
        }
      }, 3000)
    }

    video.addEventListener('play', startPolling)
    video.addEventListener('pause', stopPolling)
    video.addEventListener('ended', stopPolling)

    if (!video.paused && !video.ended) startPolling()

    return () => {
      video.removeEventListener('play', startPolling)
      video.removeEventListener('pause', stopPolling)
      video.removeEventListener('ended', stopPolling)
      stopPolling()
      pollInFlightRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, videoUrl])

  return (
    <section className="glass-panel p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Media input</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Upload an <span className="text-cyan-200/90">image</span> or <span className="text-cyan-200/90">video</span>.
            {` `}
            {mediaType === 'video'
              ? 'We analyze extracted frames by calling the image endpoints.'
              : 'We send the same file to'}{' '}
            <code className="text-cyan-200/90">/detect/image</code> and{' '}
            <code className="text-cyan-200/90">/detect/json</code> in parallel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id={inputId}
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            onChange={handleFileChange}
          />
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/20 to-violet-600/20 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(56,189,248,0.25)] transition hover:brightness-110"
          >
            Choose media
          </label>
          {loading && (
            <span className="flex items-center gap-2 text-sm text-slate-400">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400"
                aria-hidden
              />
              Processing…
            </span>
          )}
        </div>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="mb-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500 transition hover:border-cyan-400/30 hover:bg-white/[0.04]"
      >
        Drop an image/video here or use the button above
      </div>

      {error && (
        <div
          className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <figcaption className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            <span>Original</span>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: POTHOLE }} title="Pothole accent" />
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DOG }} title="Dog accent" />
          </figcaption>
          <div className="relative aspect-video bg-[#0b0f1a]">
            {mediaType === 'image' && imageUrl ? (
              <img
                src={imageUrl}
                alt="Uploaded source"
                className="h-full w-full object-contain transition-opacity duration-500"
              />
            ) : mediaType === 'video' && videoUrl ? (
              <div className="absolute inset-0 flex flex-col">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="h-full w-full object-contain"
                  preload="metadata"
                />
                {videoFrameStatus && (
                  <div className="border-t border-white/10 bg-black/40 px-3 py-2 text-[11px] text-slate-300">
                    {videoFrameStatus}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-600">
                No media yet
              </div>
            )}
          </div>
        </figure>

        <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 neon-border">
          <figcaption className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            <span>Processed</span>
            <span className="text-cyan-300/80">
              {mediaType === 'video' ? '/detect/video' : '/detect/image'}
            </span>
          </figcaption>
          <div className="relative aspect-video bg-[#0b0f1a]">
            {processedUrl ? (
              mediaType === 'video' ? (
                <video
                  src={processedUrl}
                  controls
                  className="h-full w-full object-contain transition-all duration-500 ease-out"
                />
              ) : (
                <img
                  src={processedUrl}
                  alt="Server-rendered detections"
                  className="h-full w-full object-contain transition-all duration-500 ease-out"
                />
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-sm text-slate-600">
                {loading && mediaType === 'video' ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
                    Processing video…
                  </>
                ) : (
                  <>Run analysis to see bounding boxes</>
                )}
              </div>
            )}
          </div>

          {mediaType === 'video' && videoUrl && (
            <div className="flex items-center justify-center gap-3 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                disabled={loading}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                onClick={() => analyzeVideoFrame(videoRef.current?.currentTime || 0)}
              >
                Analyze current frame
              </button>
            </div>
          )}
        </figure>
      </div>
    </section>
  )
}
