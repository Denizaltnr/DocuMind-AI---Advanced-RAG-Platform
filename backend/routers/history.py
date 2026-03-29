import os
import json
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "history.json")


def load_history() -> list:
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_history(history: list):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2, default=str)


class SourceChunk(BaseModel):
    text: str
    page: int
    score: float
    documentId: str
    filename: str


class HistoryItem(BaseModel):
    id: str
    question: str
    answer: str
    documentId: Optional[str] = None
    documentName: Optional[str] = None
    createdAt: str
    sources: List[SourceChunk]


class DeleteResult(BaseModel):
    success: bool
    message: str


@router.get("", response_model=List[HistoryItem])
def get_history():
    history = load_history()
    result = []
    for item in history:
        result.append(HistoryItem(
            id=item["id"],
            question=item["question"],
            answer=item["answer"],
            documentId=item.get("documentId"),
            documentName=item.get("documentName"),
            createdAt=item["createdAt"],
            sources=[
                SourceChunk(
                    text=s["text"],
                    page=s["page"],
                    score=s["score"],
                    documentId=s.get("document_id", s.get("documentId", "")),
                    filename=s["filename"]
                )
                for s in item.get("sources", [])
            ]
        ))
    return result


@router.delete("", response_model=DeleteResult)
def clear_history():
    save_history([])
    return DeleteResult(success=True, message="Tüm sorgu geçmişi temizlendi.")
