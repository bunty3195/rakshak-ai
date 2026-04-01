/**
 * Rakshak AI — FastAPI client (no mock data).
 * Set VITE_API_BASE_URL in .env to override default.
 */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000'

/** @returns {string} */
export function getApiBase() {
  return API_BASE
}

/** MJPEG stream URL for <img src="..." /> */
export function getVideoFeedUrl() {
  return `${API_BASE}/video_feed`
}

/**
 * POST /detect/json — multipart image → { alerts: [...] }
 * @param {File} file
 * @returns {Promise<{ alerts?: Array<Record<string, unknown>> }>}
 */
export async function detectJson(file) {
  const body = new FormData()
  // FastAPI expects this field name to match the UploadFile param (commonly "file")
  body.append('file', file, file?.name || 'upload.jpg')

  const res = await fetch(`${API_BASE}/detect/json`, {
    method: 'POST',
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Detection failed (${res.status})`)
  }

  return res.json()
}

/**
 * POST /detect/image — multipart image → image bytes with boxes drawn
 * @param {File} file
 * @returns {Promise<Blob>}
 */
export async function detectImage(file) {
  const body = new FormData()
  // FastAPI expects this field name to match the UploadFile param (commonly "file")
  body.append('file', file, file?.name || 'upload.jpg')

  const res = await fetch(`${API_BASE}/detect/image`, {
    method: 'POST',
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Image processing failed (${res.status})`)
  }

  return res.blob()
}

/**
 * POST /detect/video — multipart video → processed mp4 bytes
 * @param {File} file
 * @returns {Promise<Blob>}
 */
export async function detectVideo(file) {
  const body = new FormData()
  body.append('file', file, file?.name || 'upload.mp4')

  const res = await fetch(`${API_BASE}/detect/video`, {
    method: 'POST',
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Video processing failed (${res.status})`)
  }

  return res.blob()
}
