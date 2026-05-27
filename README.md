# Rock Art Analysis Platform

A two-tier replacement for the original Streamlit prototype. The FastAPI backend exposes ingestion, labeling, similarity search, and training endpoints while the React (Vite) frontend provides a modern dashboard experience.

## Project layout

```
rock-art-analysis/
├── backend/
│   └── app/
│       ├── api/          # FastAPI routers
│       ├── core/         # Legacy domain modules (copied as-is)
│       ├── services/     # Thin orchestration layer used by the routers
│       ├── config.py     # Shim that re-exports app.core.config
│       ├── main.py       # FastAPI entry point
│       └── requirements.txt
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/          # Browser-side API client
        ├── components/   # UI widgets
        ├── pages/        # App & Home views
        └── main.jsx
```

## Backend quick start

```powershell
cd backend\app
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API now provides:

- `POST /upload/image` — ingest imagery and run preprocessing.
- `POST /segment/reprocess` — re-run segmentation on an existing file.
- `GET /search/{shape_id}` — FAISS-based similarity lookup.
- `POST /labels/update` | `/labels/batch` — labeling workflows.
- `POST /train/classifier` — kick off classifier training.
- `GET /health` — readiness probe.

All routes rely on the copied legacy modules under `app/core` so the data model and ML behavior remain unchanged.

## Frontend quick start

```powershell
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8000`, so start the backend first. Update `VITE_API_BASE` in a `.env` file if you deploy the API elsewhere.

## Migration checklist

- Remove the deprecated `app_streamlit.py` UI from deployment scripts.
- Keep `rock_art_analysis.db` and the `data/`, `logs/`, `models/`, and `exports/` folders accessible to the backend container or VM.
- When training a new model, the metadata is persisted via `DatabaseManager.save_model_metadata` and the label map is rewritten to `models/label_to_idx.json` for the predictor pipeline.

## Testing ideas

- Add pytest suites that exercise each router via `TestClient`.
- For the frontend, consider adding Cypress component tests for the upload and batch label flows.
