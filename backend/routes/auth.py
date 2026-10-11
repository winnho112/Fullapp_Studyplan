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
import base64
import urllib.request
import urllib.error
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models import SignUpRequest, LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Validate required env vars at import time so the error is obvious
if not SUPABASE_URL:
    print("⚠  WARNING: SUPABASE_URL is not set. Auth endpoints will fail.")
if not SUPABASE_ANON_KEY:
    print("⚠  WARNING: SUPABASE_ANON_KEY is not set. Auth endpoints will fail.")

security = HTTPBearer()


# ── JWT dependency (used by protected routes) ──────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Extract user info from the Supabase JWT.

    ⚠ LEARNING MODE — In production, tokens should be verified
    properly using the JWT secret or JWKS endpoint.  Here we only
    base64-decode the payload to extract `sub` and `email`.
    """
    token = credentials.credentials
    try:
        # JWT = header.payload.signature — we only need the payload
        parts = token.split(".")
        if len(parts) < 2:
            raise ValueError("Malformed JWT")
        payload_b64 = parts[1] + "=="  # pad for base64
        payload_json = base64.urlsafe_b64decode(payload_b64)
        payload = json.loads(payload_json)

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")
        return {"user_id": user_id, "email": payload.get("email")}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


# ── Helpers ────────────────────────────────────────────────────

def _supabase_auth(path: str, body: dict) -> dict:
    """Call the Supabase GoTrue REST API and return the JSON response."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: SUPABASE_URL or SUPABASE_ANON_KEY is missing.",
        )
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
        err_body = e.read().decode()
        try:
            err = json.loads(err_body)
        except json.JSONDecodeError:
            err = {"msg": err_body}
        raise HTTPException(
            status_code=e.code,
            detail=err.get("msg") or err.get("error_description") or str(err),
        )
    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not connect to Supabase auth service: {e.reason}",
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