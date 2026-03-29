import os
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from services.rag_chain import generate_answer

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


class QueryRequest(BaseModel):
    question: str
    documentId: Optional[str] = None
    topK: int = 5


class SourceChunk(BaseModel):
    text: str
    page: int
    score: float
    documentId: str
    filename: str


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    documentId: Optional[str] = None
    question: str
    historyId: str


@router.post("", response_model=QueryResponse)
def query_document(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Soru boş olamaz.")

    try:
        result = generate_answer(
            question=req.question,
            doc_id=req.documentId,
            top_k=req.topK
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sorgu işlenirken hata oluştu: {str(e)}")

    history_id = str(uuid.uuid4())
    doc_name = get_document_name(req.documentId)

    history_item = {
        "id": history_id,
        "question": req.question,
        "answer": result["answer"],
        "documentId": req.documentId,
        "documentName": doc_name,
        "createdAt": datetime.utcnow().isoformat(),
        "sources": result["sources"]
    }

    history = load_history()
    history.insert(0, history_item)
    history = history[:100]
    save_history(history)

    return QueryResponse(
        answer=result["answer"],
        sources=[
            SourceChunk(
                text=s["text"],
                page=s["page"],
                score=s["score"],
                documentId=s["document_id"],
                filename=s["filename"]
            )
            for s in result["sources"]
        ],
        documentId=req.documentId,
        question=req.question,
        historyId=history_id
    )
