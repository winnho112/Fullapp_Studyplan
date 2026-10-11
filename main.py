"""
main.py — FastAPI application entry point for the StudyPlan backend.
"""

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

# ── CORS — allow the React dev server to call this API ─────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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