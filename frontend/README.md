# Rakshak AI — Web dashboard

Production-style frontend for the Rakshak AI road hazard stack (FastAPI on port **8000**). It uses **React**, **Vite**, and **Tailwind CSS v4** with glassmorphism and neon accents.

## Prerequisites

- Node.js 18+
- Backend running at `http://localhost:8000` with:
  - `GET /video_feed` — MJPEG (use in `<img>`)
  - `POST /detect/json` — `multipart/form-data` image field **`file`** → `{ "alerts": [...] }`
  - `POST /detect/image` — same field **`file`** → annotated image bytes

If your FastAPI `UploadFile` parameter uses another name (e.g. `image`), update the `FormData` key in `src/services/api.js` to match.

## CORS

Enable CORS on the FastAPI app for the Vite dev origin (default `http://localhost:5173`). Example:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Optional env

Copy `.env.example` to `.env` and set:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Production build

```bash
npm run build
npm run preview
```

## Project structure

- `src/App.jsx` — layout, state, tab switch (upload / live)
- `src/components/Navbar.jsx`
- `src/components/UploadSection.jsx`
- `src/components/LiveFeedSection.jsx`
- `src/components/DetectionPanel.jsx`
- `src/services/api.js` — `fetch` wrappers only (no mock backend)

The right-hand panel is driven by **`/detect/json`** after each upload. The live route is **video only** on this API; the UI explains that and keeps the last analysis visible during live view.
