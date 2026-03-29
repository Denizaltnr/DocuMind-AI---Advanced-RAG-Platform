import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, query, history, documents, chat

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError(
        "OPENAI_API_KEY ortam değişkeni bulunamadı. "
        "Lütfen Replit Secrets bölümünden ekleyin."
    )

app = FastAPI(
    title="RAG Belge Analiz Platformu",
    description="PDF belgelerini analiz eden RAG tabanlı yapay zeka platformu",
    version="1.0.0",
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=600,
)

app.include_router(upload.router, prefix="/upload", tags=["upload"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(query.router, prefix="/query", tags=["query"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(history.router, prefix="/history", tags=["history"])


@app.get("/health")
def health():
    return {"status": "ok", "openai_configured": bool(OPENAI_API_KEY)}
