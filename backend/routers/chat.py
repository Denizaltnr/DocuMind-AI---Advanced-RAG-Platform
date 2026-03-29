import os
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from services.rag_chain import chat_with_documents, clear_session

router = APIRouter()

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "history.json")
DOCUMENTS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "documents.json")

os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)


def load_history() -> list:
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_history(history: list):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2, default=str)


def get_document_name(doc_id: Optional[str]) -> str:
    if not doc_id:
        return "Tüm Belgeler"
    if os.path.exists(DOCUMENTS_FILE):
        with open(DOCUMENTS_FILE, "r", encoding="utf-8") as f:
            docs = json.load(f)
        doc = next((d for d in docs if d["id"] == doc_id), None)
        if doc:
            return doc["filename"]
    return "Bilinmeyen Belge"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    documentId: Optional[str] = None
    sessionId: Optional[str] = None
    topK: int = 5


class SourceChunk(BaseModel):
    text: str
    page: int
    score: float
    documentId: str
    filename: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    sessionId: str
    question: str
    historyId: str


class ClearSessionRequest(BaseModel):
    sessionId: str


class ClearSessionResponse(BaseModel):
    success: bool
    message: str


@router.post("", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Soru boş olamaz.")

    if not os.environ.get("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY ortam değişkeni ayarlanmamış."
        )

    session_id = req.sessionId or str(uuid.uuid4())

    try:
        result = chat_with_documents(
            session_id=session_id,
            question=req.question,
            doc_id=req.documentId,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Sohbet işlenirken hata oluştu: {str(e)}"
        )

    history_id = str(uuid.uuid4())
    doc_name = get_document_name(req.documentId)

    history_item = {
        "id": history_id,
        "question": req.question,
        "answer": result["answer"],
        "documentId": req.documentId,
        "documentName": doc_name,
        "sessionId": session_id,
        "createdAt": datetime.utcnow().isoformat(),
        "sources": result["sources"],
    }

    history = load_history()
    history.insert(0, history_item)
    history = history[:200]
    save_history(history)

    return ChatResponse(
        answer=result["answer"],
        sources=[
            SourceChunk(
                text=s["text"],
                page=s["page"],
                score=s.get("score", 0.0),
                documentId=s.get("document_id", s.get("documentId", "")),
                filename=s["filename"],
            )
            for s in result["sources"]
        ],
        sessionId=session_id,
        question=req.question,
        historyId=history_id,
    )


@router.post("/clear-session", response_model=ClearSessionResponse)
def clear_session_endpoint(req: ClearSessionRequest):
    clear_session(req.sessionId)
    return ClearSessionResponse(
        success=True,
        message=f"Oturum '{req.sessionId}' temizlendi."
    )
