import { Router } from "express";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

const GOOGLE_CLIENT_ID = process.env["GOOGLE_CLIENT_ID"] ?? "";

const _rawSecret = process.env["SESSION_SECRET"];
if (!_rawSecret) {
  throw new Error("SESSION_SECRET environment variable is required but not set.");
}
const SESSION_SECRET = _rawSecret;
const JWT_EXPIRE_SECONDS = 60 * 60 * 24 * 7;

const jwtSecret = new TextEncoder().encode(SESSION_SECRET);

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  google_id: string | null;
  is_active: boolean;
  created_at: string;
  password_hash?: string | null;
};

function userOut(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
    is_active: u.is_active,
    created_at: u.created_at,
  };
}

async function createAccessToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${JWT_EXPIRE_SECONDS}s`)
    .setIssuedAt()
    .sign(jwtSecret);
}

async function getUserFromToken(authHeader?: string): Promise<UserRow | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    const userId = payload.sub as string;
    const result = await pool.query<UserRow>(
      "SELECT id, email, full_name, avatar_url, google_id, is_active, created_at FROM users WHERE id = $1 AND is_active = TRUE",
      [userId],
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── Google ID Token ────────────────────────────────────────────────────
router.post("/google/token", async (req, res) => {
  const { credential } = req.body as { credential?: string };
  if (!credential) {
    res.status(400).json({ detail: "credential alanı gerekli." });
    return;
  }

  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const googleRes = await fetch(url);
    if (!googleRes.ok) {
      res.status(401).json({ detail: "Geçersiz Google token." });
      return;
    }
    const info = await googleRes.json() as Record<string, unknown>;

    if (info["aud"] !== GOOGLE_CLIENT_ID) {
      logger.warn({ aud: info["aud"], expected: GOOGLE_CLIENT_ID }, "Google token aud mismatch");
      res.status(401).json({ detail: "Token bu uygulama için geçerli değil." });
      return;
    }
    if (info["email_verified"] !== "true" && info["email_verified"] !== true) {
      res.status(401).json({ detail: "Google e-postası doğrulanmamış." });
      return;
    }

    const googleId = String(info["sub"] ?? "");
    const email = String(info["email"] ?? "");
    const fullName = info["name"] ? String(info["name"]) : null;
    const picture = info["picture"] ? String(info["picture"]) : null;

    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, google_id, full_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET google_id  = EXCLUDED.google_id,
             full_name  = COALESCE(users.full_name, EXCLUDED.full_name),
             avatar_url = COALESCE(users.avatar_url, EXCLUDED.avatar_url),
             updated_at = NOW()
       RETURNING id, email, full_name, avatar_url, google_id, is_active, created_at`,
      [email, googleId, fullName, picture],
    );
    const user = result.rows[0];
    const token = await createAccessToken(user.id, user.email);
    res.json({ access_token: token, token_type: "bearer", user: userOut(user) });
  } catch (err) {
    logger.error({ err }, "Google token verification failed");
    res.status(401).json({ detail: "Google girişi başarısız." });
  }
});

// ── Get Current User ───────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    res.status(401).json({ detail: "Geçersiz veya süresi dolmuş token." });
    return;
  }
  res.json(userOut(user));
});

// ── Login ──────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ detail: "E-posta ve şifre gerekli." });
    return;
  }

  try {
    const result = await pool.query<UserRow>(
      "SELECT id, email, full_name, avatar_url, google_id, is_active, created_at, password_hash FROM users WHERE email = $1 AND is_active = TRUE",
      [email.toLowerCase()],
    );
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      res.status(401).json({ detail: "E-posta veya şifre hatalı." });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ detail: "E-posta veya şifre hatalı." });
      return;
    }
    const token = await createAccessToken(user.id, user.email);
    res.json({ access_token: token, token_type: "bearer", user: userOut(user) });
  } catch (err) {
    logger.error({ err }, "Login failed");
    res.status(500).json({ detail: "Giriş sırasında bir hata oluştu." });
  }
});

// ── Register ───────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { email, password, full_name } = req.body as { email?: string; password?: string; full_name?: string };
  if (!email || !password) {
    res.status(400).json({ detail: "E-posta ve şifre gerekli." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ detail: "Şifre en az 6 karakter olmalıdır." });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, avatar_url, google_id, is_active, created_at`,
      [email.toLowerCase(), passwordHash, full_name ?? null],
    );
    const user = result.rows[0];
    const token = await createAccessToken(user.id, user.email);
    res.json({ access_token: token, token_type: "bearer", user: userOut(user) });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === "23505") {
      res.status(400).json({ detail: "Bu e-posta adresi zaten kayıtlı." });
      return;
    }
    logger.error({ err }, "Register failed");
    res.status(500).json({ detail: "Kayıt sırasında bir hata oluştu." });
  }
});

export default router;
