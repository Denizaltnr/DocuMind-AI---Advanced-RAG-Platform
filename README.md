<div align="center">

<img src="https://img.shields.io/badge/DocuMind-AI-3B82F6?style=for-the-badge&logo=openai&logoColor=white" alt="DocuMind AI" height="40"/>

# DocuMind AI — Advanced RAG Platform

**Yapay zeka destekli akıllı belge analiz ve sorgulama platformu**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-document--analyzer--denizaltnr.replit.app-3B82F6?style=for-the-badge)](https://document-analyzer-denizaltnr.replit.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/gemini)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_DB-FF6B6B?style=flat-square)](https://www.trychroma.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## 📖 Proje Hakkında

**DocuMind AI**, PDF belgelerinizi yükleyip yapay zeka ile doğal dil üzerinden sorgulayabileceğiniz tam yığın bir **Retrieval-Augmented Generation (RAG)** platformudur. Google'ın Gemini modelleri ve ChromaDB vektör veritabanı kullanılarak geliştirilmiştir. Çok kullanıcılı yapısı, kalıcı sohbet geçmişi ve Google OAuth desteğiyle kurumsal düzeyde bir deneyim sunar.

> 🎓 Bu proje bir **mezuniyet projesi** kapsamında geliştirilmiştir.

---

## ✨ Özellikler

### 🤖 Yapay Zeka & RAG Motoru
- **Gemini 2.5 Flash** ile gelişmiş doğal dil anlama ve cevap üretme
- **Gemini Embedding** (`models/gemini-embedding-001`, 768 boyut) ile semantik arama
- **LangChain ConversationalRetrievalChain** ile bağlam koruyan çok turlu sohbet
- Kaynak alıntılama — her yanıt için ilgili PDF sayfa ve parçaları gösterilir

### 📄 Belge İşleme
- Sürükle-bırak PDF yükleme (maks. 50 MB)
- **PyMuPDF** ile sayfa sayısı, metin çıkarma ve chunk'lama
- **ChromaDB** vektör veritabanında kullanıcıya özel belge depolama
- Belge silme (vektör DB + dosya sistem'den eş zamanlı)

### 💬 Sohbet & Geçmiş
- Kalıcı sohbet oturumları (PostgreSQL ile)
- **Gemini ile otomatik başlık üretimi** — ilk sorudan akıllıca başlık oluşturur
- Geçmiş sohbetlere tek tıkla geri dönme ve mesajları yükleme
- Çöp kutusu ikonu ile sohbet silme

### 🔐 Kimlik Doğrulama
- E-posta / şifre ile kayıt & giriş (bcrypt şifreleme)
- **Google OAuth 2.0** popup tabanlı akış
- JWT token yönetimi (7 günlük geçerlilik)
- Her kullanıcı yalnızca kendi belgelerini ve sohbet geçmişini görür

### 🎨 Arayüz
- Slate/Zinc light-mode SaaS tasarım dili
- **Collapsible sidebar** — Framer Motion animasyonlu açılır/kapanır panel
- Belge & sohbet geçmişi aynı sidebar'da
- **TR / EN** dil desteği (tarayıcı diline göre otomatik algılama)
- Tam responsive yapı

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, TanStack Query, Wouter |
| **Backend (AI)** | Python 3.11, FastAPI, LangChain, Gemini 2.5 Flash, ChromaDB, PyMuPDF |
| **Backend (Proxy)** | Node.js, Express 5 |
| **Veritabanı** | PostgreSQL 16 (kullanıcılar, sohbet oturumları, mesajlar) |
| **Vektör DB** | ChromaDB (yerel dosya tabanlı) |
| **Kimlik Doğrulama** | JWT (python-jose), bcrypt, Google OAuth 2.0 (Authlib) |
| **Paket Yönetimi** | pnpm (monorepo), pip |

---

## 🏗️ Proje Yapısı

```
DocuMind-AI/
├── artifacts/
│   ├── doc-analyzer/          # React + Vite Frontend
│   │   └── src/
│   │       ├── components/    # Header, DocPanel, ChatPanel, UploadModal
│   │       ├── contexts/      # AuthContext, LangContext
│   │       ├── lib/           # i18n, chat-api, utils
│   │       └── pages/         # Home, Login, Documents, Query
│   └── api-server/            # Express Proxy (Node.js)
│       └── src/
│           ├── app.ts         # Python backend'e proxy yönlendirme
│           └── routes/        # Ek API rotaları
│
├── backend/                   # Python FastAPI RAG + Auth Motoru
│   ├── main.py                # FastAPI uygulama giriş noktası
│   ├── middleware/
│   │   └── auth.py            # JWT Bearer token doğrulama
│   ├── routers/
│   │   ├── auth.py            # /register, /login, /me, Google OAuth
│   │   ├── upload.py          # PDF yükleme & işleme
│   │   ├── documents.py       # Belge listeleme & silme
│   │   ├── chat.py            # RAG sohbet + oturum yönetimi
│   │   └── history.py         # Sohbet geçmişi
│   ├── services/
│   │   ├── auth_service.py    # JWT, bcrypt, DB CRUD, Google OAuth
│   │   ├── pdf_processor.py   # PDF → chunk dönüşümü
│   │   ├── embeddings.py      # Gemini embeddings + ChromaDB
│   │   └── rag_chain.py       # LangChain RAG zinciri
│   └── data/
│       ├── chroma/            # ChromaDB vektör veritabanı
│       └── documents.json     # Belge metadata
│
├── lib/
│   ├── api-spec/              # OpenAPI spec (openapi.yaml)
│   ├── api-client-react/      # Üretilmiş TanStack Query hook'ları
│   └── db/                    # Veritabanı şeması
│
└── README.md
```

---

## 🗄️ Veritabanı Şeması

```sql
-- Kullanıcılar
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),            -- NULL: Google OAuth kullanıcıları
  google_id   VARCHAR(255) UNIQUE,
  full_name   VARCHAR(255),
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sohbet oturumları
CREATE TABLE chat_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255) DEFAULT 'Yeni Sohbet',
  document_id   VARCHAR(255),
  document_name VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Mesajlar
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL,      -- 'user' | 'assistant'
  content    TEXT NOT NULL,
  sources    JSONB,                     -- PDF kaynak chunk'ları
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Kurulum (Local)

### Gereksinimler
- Python 3.11+
- Node.js 20+
- pnpm 9+
- PostgreSQL 16+

### 1. Depoyu Klonlayın

```bash
git clone https://github.com/Denizaltnr/DocuMind-AI---Advanced-RAG-Platform.git
cd DocuMind-AI---Advanced-RAG-Platform
```

### 2. Python Bağımlılıklarını Yükleyin

```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 3. Node.js Bağımlılıklarını Yükleyin

```bash
pnpm install
```

### 4. Ortam Değişkenlerini Ayarlayın

```bash
# Backend için .env dosyası oluşturun
cat > backend/.env << EOF
GOOGLE_API_KEY=your_gemini_api_key
SESSION_SECRET=your_jwt_secret_min_32_chars
DATABASE_URL=postgresql://user:password@localhost:5432/documind
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback
EOF
```

| Değişken | Açıklama | Nereden Alınır |
|----------|----------|----------------|
| `GOOGLE_API_KEY` | Gemini API anahtarı | [Google AI Studio](https://aistudio.google.com/apikey) |
| `SESSION_SECRET` | JWT imzalama anahtarı (min 32 karakter) | Rastgele oluşturun |
| `DATABASE_URL` | PostgreSQL bağlantı URL | Kendi DB'niz |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Google Cloud Console |

### 5. PostgreSQL Tablolarını Oluşturun

```bash
psql $DATABASE_URL -c "
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'Yeni Sohbet',
  document_id VARCHAR(255),
  document_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
"
```

### 6. Servisleri Başlatın

**Terminal 1 — Python Backend:**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Express Proxy:**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 3 — React Frontend:**
```bash
pnpm --filter @workspace/doc-analyzer run dev
```

Uygulama `http://localhost:5173` adresinde çalışır (ya da Vite'ın atadığı port).

---

## 🔑 Google OAuth Kurulumu

1. [Google Cloud Console](https://console.cloud.google.com) → Yeni proje oluşturun
2. **APIs & Services** → **Credentials** → **Create OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized redirect URI: `http://localhost:8080/api/auth/google/callback`
5. Client ID ve Secret'ı `.env` dosyasına ekleyin

---

## 🌐 Canlı Demo

**[https://document-analyzer-denizaltnr.replit.app](https://document-analyzer-denizaltnr.replit.app)**

> Demo ortamında bir hesap oluşturun veya Google ile giriş yapın. PDF yükleyin ve yapay zeka ile sohbet edin.

---

## 📸 Ekran Görüntüleri

| Giriş Sayfası | Ana Ekran | Sohbet |
|:---:|:---:|:---:|
| Auth sayfası — E-posta/şifre ve Google OAuth | Collapsible sidebar, belge seçimi | RAG tabanlı kaynak alıntılı yanıtlar |

---

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.

---

<div align="center">

**DocuMind AI** — Belgelerinizle zekice konuşun

Mezuniyet Projesi · 2025 · Deniz Altıner

[![GitHub](https://img.shields.io/badge/GitHub-Denizaltnr-181717?style=flat-square&logo=github)](https://github.com/Denizaltnr)

</div>
