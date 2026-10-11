"""
main.py — FastAPI application entry point for the StudyPlan backend.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_database
from routes import auth, plans, sessions


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run database initialisation on startup."""
    init_database()
    yield


app = FastAPI(
    title="StudyPlan API",
    description="Backend API for the StudyPlan university study-planning app.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS — allow the frontend to call this API ─────────────────
# FRONTEND_URL can be set via environment variable for production.
# Falls back to localhost for local development.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ───────────────────────────────────────────

app.include_router(auth.router)
app.include_router(plans.router)
app.include_router(sessions.router)


# ── Root routes ────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "StudyPlan API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}