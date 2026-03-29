# RAG Tabanlı Akıllı Belge Analiz Platformu (DocRAG)

## Proje Özeti

PDF belgelerini yükleyip yapay zeka ile sorgulayabileceğiniz tam kapsamlı bir RAG (Retrieval-Augmented Generation) platformu.

## Teknoloji Yığını

### Frontend
- **Framework**: React + Vite
- **Stil**: Tailwind CSS
- **State Yönetimi**: TanStack React Query
- **Animasyon**: Framer Motion
- **Dosya Yükleme**: react-dropzone

### Backend — Node.js (API Proxy)
- **Framework**: Express 5
- **Görev**: Python backend'e proxy yönlendirme + `/api/healthz` sağlık kontrolü
- **Port**: 8080

### Backend — Python (RAG Motoru)
- **Framework**: FastAPI + Uvicorn
- **AI**: LangChain + OpenAI GPT-4o-mini
- **Embeddings**: OpenAI text-embedding-3-small
- **Vektör DB**: ChromaDB (yerel dosya tabanlı)
- **PDF İşleme**: PyMuPDF
- **Port**: 8000

## Klasör Yapısı

```
artifacts/
└── doc-analyzer/          # React + Vite Frontend
    └── src/
        ├── pages/
        │   ├── documents.tsx  # PDF yükleme & listeleme
        │   ├── query.tsx      # AI soru-cevap (chat arayüzü)
        │   └── history.tsx    # Sorgu geçmişi
        ├── components/
        │   ├── layout.tsx     # Sidebar navigasyon
        │   └── file-upload.tsx # Drag-and-drop yükleme

backend/                   # Python FastAPI RAG Backend
├── main.py                # FastAPI uygulaması
├── routers/
│   ├── upload.py          # POST /upload — PDF işleme & embedding
│   ├── documents.py       # GET/DELETE /documents — belge yönetimi
│   ├── query.py           # POST /query — RAG sorgu motoru
│   └── history.py         # GET/DELETE /history — geçmiş
├── services/
│   ├── pdf_processor.py   # PDF → chunk'lara bölme
│   ├── embeddings.py      # OpenAI embeddings + ChromaDB
│   └── rag_chain.py       # LangChain RAG zinciri
├── data/
│   ├── chroma/            # ChromaDB vektör veritabanı
│   ├── documents.json     # Belge metadata
│   └── history.json       # Sorgu geçmişi
└── uploads/               # Yüklenen PDF dosyaları

lib/
├── api-spec/openapi.yaml  # OpenAPI 3.1 spec
├── api-client-react/      # Üretilen React Query hooks
└── api-zod/               # Üretilen Zod şemaları
```

## API Endpoint'leri

| Metod | Path | Açıklama |
|-------|------|----------|
| GET | `/api/documents` | Yüklü belgeleri listele |
| DELETE | `/api/documents/:id` | Belge sil |
| POST | `/api/py/upload` | PDF yükle + işle + embed et |
| POST | `/api/query` | RAG sorgusu yap |
| GET | `/api/history` | Sorgu geçmişini getir |
| DELETE | `/api/history` | Geçmişi temizle |

## RAG Akışı

1. **PDF Yükleme** → PyMuPDF ile metin çıkar
2. **Chunking** → RecursiveCharacterTextSplitter (1000 char, 200 overlap)
3. **Embedding** → OpenAI text-embedding-3-small
4. **Vektör Depolama** → ChromaDB (yerel)
5. **Sorgulama** → Benzer chunk'lar → GPT-4o-mini → Türkçe cevap

## Ortam Değişkenleri

- `OPENAI_API_KEY` — OpenAI API anahtarı (gerekli)

## Workflow'lar

- `Python RAG Backend` — `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- `artifacts/api-server: API Server` — Express proxy sunucu (port 8080)
- `artifacts/doc-analyzer: web` — React + Vite frontend (port 18411)
