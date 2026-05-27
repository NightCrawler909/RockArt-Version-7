"""FastAPI entry point for the Rock Art Analysis platform."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from api import labeling, search, segment, train, upload

app = FastAPI(title="Rock Art Analysis API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"]
    ,
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(segment.router)
app.include_router(search.router)
app.include_router(labeling.router)
app.include_router(train.router)

if os.path.exists("data"):
    app.mount("/data", StaticFiles(directory="data"), name="data")

@app.get("/health")
async def health_check():
    """Simple readiness probe."""
    return {"status": "ok"}
