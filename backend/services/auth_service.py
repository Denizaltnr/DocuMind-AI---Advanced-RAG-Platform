import os
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from authlib.integrations.httpx_client import AsyncOAuth2Client

DATABASE_URL = os.environ.get("DATABASE_URL", "")
SECRET_KEY = os.environ.get("SESSION_SECRET", "change-me-in-production-32chars!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── DB helper ────────────────────────────────────────────────────────
def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


# ── Password helpers ──────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT helpers ───────────────────────────────────────────────────────
def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ── User CRUD ─────────────────────────────────────────────────────────
def get_user_by_email(email: str) -> Optional[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE email = %s AND is_active = TRUE", (email,))
            row = cur.fetchone()
            return dict(row) if row else None


def get_user_by_id(user_id: str) -> Optional[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s AND is_active = TRUE", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None


def get_user_by_google_id(google_id: str) -> Optional[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE google_id = %s AND is_active = TRUE", (google_id,))
            row = cur.fetchone()
            return dict(row) if row else None


def create_user(email: str, password: Optional[str] = None,
                full_name: Optional[str] = None, google_id: Optional[str] = None,
                avatar_url: Optional[str] = None) -> dict:
    password_hash = hash_password(password) if password else None
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, password_hash, full_name, google_id, avatar_url)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (email, password_hash, full_name, google_id, avatar_url)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)


def upsert_google_user(google_id: str, email: str,
                       full_name: Optional[str], avatar_url: Optional[str]) -> dict:
    """Create or update a user from Google OAuth info."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, google_id, full_name, avatar_url)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (email) DO UPDATE
                  SET google_id   = EXCLUDED.google_id,
                      full_name   = COALESCE(users.full_name, EXCLUDED.full_name),
                      avatar_url  = COALESCE(users.avatar_url, EXCLUDED.avatar_url),
                      updated_at  = NOW()
                RETURNING *
                """,
                (email, google_id, full_name, avatar_url)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)


# ── Google OAuth helpers ──────────────────────────────────────────────
def get_google_auth_url(state: str) -> str:
    client = AsyncOAuth2Client(
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        redirect_uri=GOOGLE_REDIRECT_URI,
        scope="openid email profile",
    )
    # Build the authorization URL manually (sync-friendly)
    params = {
        "response_type": "code",
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    import urllib.parse
    base = "https://accounts.google.com/o/oauth2/v2/auth"
    return base + "?" + urllib.parse.urlencode(params)


async def exchange_google_code(code: str) -> dict:
    """Exchange auth code for user info via Google token endpoint."""
    import httpx
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
        )
        token_resp.raise_for_status()
        tokens = token_resp.json()

        # Fetch user info
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        userinfo_resp.raise_for_status()
        return userinfo_resp.json()
