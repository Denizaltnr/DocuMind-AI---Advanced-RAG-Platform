import os
import secrets
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from typing import Optional

from services.auth_service import (
    get_user_by_email,
    create_user,
    verify_password,
    create_access_token,
    get_google_auth_url,
    exchange_google_code,
    upsert_google_user,
)
from middleware.auth import get_current_user

router = APIRouter()

FRONTEND_URL = os.environ.get("FRONTEND_URL", "")


# ── Request / Response models ────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    google_id: Optional[str]


# ── E-mail / Password ────────────────────────────────────────────────
@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalıdır.")

    existing = get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=409, detail="Bu e-posta adresi zaten kayıtlı.")

    user = create_user(email=req.email, password=req.password, full_name=req.full_name)
    token = create_access_token(str(user["id"]), user["email"])
    return AuthResponse(
        access_token=token,
        user={"id": str(user["id"]), "email": user["email"],
              "full_name": user["full_name"], "avatar_url": user["avatar_url"]}
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")

    token = create_access_token(str(user["id"]), user["email"])
    return AuthResponse(
        access_token=token,
        user={"id": str(user["id"]), "email": user["email"],
              "full_name": user["full_name"], "avatar_url": user["avatar_url"]}
    )


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["id"]),
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "avatar_url": current_user["avatar_url"],
    }


# ── Google OAuth ─────────────────────────────────────────────────────
@router.get("/google")
def google_login():
    state = secrets.token_urlsafe(16)
    url = get_google_auth_url(state)
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(code: str, state: Optional[str] = None):
    try:
        userinfo = await exchange_google_code(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google doğrulama başarısız: {str(e)}")

    google_id = userinfo.get("sub")
    email = userinfo.get("email")
    full_name = userinfo.get("name")
    avatar_url = userinfo.get("picture")

    if not email or not google_id:
        raise HTTPException(status_code=400, detail="Google hesabından e-posta alınamadı.")

    user = upsert_google_user(google_id=google_id, email=email,
                              full_name=full_name, avatar_url=avatar_url)
    token = create_access_token(str(user["id"]), user["email"])

    # Redirect to frontend with token
    frontend = FRONTEND_URL or "/"
    return RedirectResponse(f"{frontend}?token={token}")
