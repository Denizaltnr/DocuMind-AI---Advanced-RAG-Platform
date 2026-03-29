# DocuMind AI — RAG Tabanlı Akıllı Belge Analiz Platformu

## Proje Özeti

PDF belgelerini yükleyip yapay zeka ile sorgulayabileceğiniz tam kapsamlı bir RAG platformu. Kimlik doğrulama sistemi ile her kullanıcı kendi belgelerini ve sohbet geçmişini ayrı ayrı görür.

## Teknoloji Yığını

### Frontend
- **Framework**: React + Vite + TypeScript
- **Stil**: Tailwind CSS (light theme, Slate/Zinc design)
- **State**: TanStack React Query
- **Router**: Wouter
- **Animasyon**: Framer Motion (collapsible sidebar)
- **Auth**: JWT token (localStorage) + `setAuthTokenGetter` API client hook

### Backend — Node.js (API Proxy)
- **Framework**: Express 5
- **Görev**: Python backend'e proxy yönlendirme (Authorization header iletimi dahil)
- **Port**: 8080

### Backend — Python (RAG + Auth Motoru)
- **Framework**: FastAPI + Uvicorn
- **AI**: LangChain + Gemini 2.5 Flash
- **Embeddings**: `models/gemini-embedding-001` (768 boyut)
- **Vektör DB**: ChromaDB (yerel dosya tabanlı)
- **PDF İşleme**: PyMuPDF
- **Auth**: JWT (python-jose) + bcrypt 4.0.1 (passlib uyumlu) + Google OAuth (authlib)
- **DB**: PostgreSQL (Replit built-in) — users tablosu
- **Port**: 8000

## Klasör Yapısı

```
artifacts/
└── doc-analyzer/            # React + Vite Frontend
    └── src/
        ├── contexts/
        │   └── auth-context.tsx    # JWT auth state + setAuthTokenGetter
        ├── pages/
        │   ├── home.tsx            # Ana dashboard (collapsible sidebar)
        │   ├── login.tsx           # Giriş sayfası
        │   └── signup.tsx          # Kayıt sayfası
        ├── components/
        │   ├── header.tsx          # Sidebar toggle + kullanıcı avatar/logout menüsü
        │   ├── doc-panel.tsx       # Collapsible belge paneli (expanded/collapsed mod)
        │   ├── chat-panel.tsx      # Notion-style sohbet arayüzü
        │   └── upload-modal.tsx    # Drag-drop PDF yükleme modalı

backend/                     # Python FastAPI RAG + Auth Backend
├── main.py                  # FastAPI uygulaması
├── middleware/
│   └── auth.py              # JWT Bearer token doğrulama (get_current_user)
├── routers/
│   ├── auth.py              # /auth/register, /login, /me, /google, /google/callback
│   ├── upload.py            # POST /upload — auth gerekli, userId kaydedilir
│   ├── documents.py         # GET/DELETE /documents — userId filtrelemeli
│   ├── chat.py              # POST /chat — auth gerekli, userId geçmişe kaydedilir
│   ├── query.py             # POST /query
│   └── history.py           # GET /history
├── services/
│   ├── auth_service.py      # JWT üretim/doğrulama, bcrypt, DB CRUD, Google OAuth
│   ├── pdf_processor.py     # PDF → chunk'lara bölme
│   ├── embeddings.py        # Gemini embeddings + ChromaDB
│   └── rag_chain.py         # LangChain ConversationalRetrievalChain (Gemini 2.5 Flash)
├── data/
│   ├── chroma/              # ChromaDB vektör veritabanı
│   ├── documents.json       # Belge metadata (userId alanı dahil)
│   └── history.json         # Sohbet geçmişi (userId alanı dahil)
└── uploads/                 # Yüklenen PDF dosyaları
```

## API Endpoint'leri

### Auth (JWT)
| Metod | Path | Açıklama |
|-------|------|----------|
| POST | `/api/auth/register` | E-posta/şifre ile kayıt → JWT döner |
| POST | `/api/auth/login` | E-posta/şifre ile giriş → JWT döner |
| GET | `/api/auth/me` | JWT ile mevcut kullanıcıyı getir |
| GET | `/api/auth/google` | Google OAuth başlat |
| GET | `/api/auth/google/callback` | Google OAuth callback → JWT + redirect |

### Belgeler (JWT gerekli)
| Metod | Path | Açıklama |
|-------|------|----------|
| GET | `/api/documents` | Kullanıcının kendi belgelerini listele |
| DELETE | `/api/documents/:id` | Belge sil |
| POST | `/api/upload` | PDF yükle + işle + embed et |

### Sohbet (JWT gerekli)
| Metod | Path | Açıklama |
|-------|------|----------|
| POST | `/api/chat` | RAG sohbet sorgusu (session oluşturur / devam ettirir) |
| POST | `/api/chat/clear-session` | In-memory oturum geçmişini temizle |
| GET | `/api/chat/sessions` | Kullanıcının sohbet oturumlarını listele |
| GET | `/api/chat/sessions/:id/messages` | Bir oturumdaki mesajları getir |
| DELETE | `/api/chat/sessions/:id` | Sohbet oturumunu sil |
| GET | `/api/history` | Eski sohbet geçmişi (legacy) |

## Veritabanı Şeması (PostgreSQL)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- NULL: Google ile giriş yapanlar
  google_id VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'Yeni Sohbet',  -- Gemini ile otomatik üretilir
  document_id VARCHAR(255),
  document_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Ortam Değişkenleri

| Değişken | Açıklama | Zorunlu |
|----------|----------|---------|
| `GOOGLE_API_KEY` | Gemini API anahtarı | Evet |
| `SESSION_SECRET` | JWT imzalama anahtarı (min 32 karakter) | Evet |
| `DATABASE_URL` | PostgreSQL bağlantı URL (Replit otomatik) | Evet |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Google login için |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Google login için |
| `GOOGLE_REDIRECT_URI` | `https://<domain>/api/auth/google/callback` | Google login için |

## Google OAuth Kurulumu

1. [console.cloud.google.com](https://console.cloud.google.com) → Yeni proje
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URI: `https://<REPLIT_DOMAIN>/api/auth/google/callback`
5. Client ID + Secret'ı Replit Secrets'a ekle

## Workflow'lar

- `Python RAG Backend` — `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- `artifacts/api-server: API Server` — Express proxy (port 8080, Authorization header iletimi)
- `artifacts/doc-analyzer: web` — React + Vite frontend
