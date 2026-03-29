import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, query, history, documents

app = FastAPI(
    title="RAG Belge Analiz Platformu",
    description="PDF belgelerini analiz eden RAG tabanlı yapay zeka platformu",
    version="1.0.0",
    redirect_slashes=False
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/upload", tags=["upload"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(query.router, prefix="/query", tags=["query"])
app.include_router(history.router, prefix="/history", tags=["history"])


@app.get("/health")
def health():
    return {"status": "ok"}
