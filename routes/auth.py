"""
routes/auth.py — Authentication endpoints + JWT dependency.

Endpoints
---------
POST /auth/signup   Register a new user
POST /auth/login    Login and receive an access token

Dependency
----------
get_current_user()  Extracts the user from the Authorization header
"""

import os
import json
import urllib.request
import urllib.error
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from models import SignUpRequest, LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

security = HTTPBearer()


# ── JWT dependency (used by protected routes) ──────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Decode the Supabase JWT and return {user_id, email}."""
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")
        return {"user_id": user_id, "email": payload.get("email")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


# ── Helpers ────────────────────────────────────────────────────

def _supabase_auth(path: str, body: dict) -> dict:
    """Call the Supabase GoTrue REST API and return the JSON response."""
    url = f"{SUPABASE_URL}{path}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode())
        raise HTTPException(
            status_code=e.code,
            detail=err.get("msg") or err.get("error_description") or str(err),
        )


# ── Endpoints ──────────────────────────────────────────────────

@router.post("/signup")
def signup(body: SignUpRequest):
    """Register a new user with email, password, and username."""
    result = _supabase_auth("/auth/v1/signup", {
        "email": body.email,
        "password": body.password,
        "data": {"username": body.username},
    })
    return {
        "message": "User registered successfully. Check your email to confirm.",
        "user": {"id": result.get("id"), "email": result.get("email")},
    }


@router.post("/login")
def login(body: LoginRequest):
    """Login with email and password; returns access + refresh tokens."""
    result = _supabase_auth("/auth/v1/token?grant_type=password", {
        "email": body.email,
        "password": body.password,
    })
    return {
        "access_token": result.get("access_token"),
        "token_type": "bearer",
        "expires_in": result.get("expires_in"),
        "refresh_token": result.get("refresh_token"),
        "user": {
            "id": result.get("user", {}).get("id"),
            "email": result.get("user", {}).get("email"),
        },
    }