import os
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

from services.embeddings import delete_document_chunks
from middleware.auth import get_current_user

router = APIRouter()

METADATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "documents.json")


def load_documents() -> list:
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_documents(docs: list):
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(docs, f, ensure_ascii=False, indent=2, default=str)


class DocumentOut(BaseModel):
    id: str
    filename: str
    uploadedAt: str
    pageCount: int
    chunkCount: int
    fileSize: int


class DeleteResult(BaseModel):
    success: bool
    message: str


@router.get("", response_model=List[DocumentOut])
def list_documents(current_user: dict = Depends(get_current_user)):
    docs = load_documents()
    user_id = str(current_user["id"])
    user_docs = [d for d in docs if d.get("userId") == user_id]
    return [
        DocumentOut(
            id=d["id"],
            filename=d["filename"],
            uploadedAt=d["uploadedAt"],
            pageCount=d["pageCount"],
            chunkCount=d["chunkCount"],
            fileSize=d["fileSize"]
        )
        for d in user_docs
    ]


@router.delete("/{doc_id}", response_model=DeleteResult)
def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    docs = load_documents()
    user_id = str(current_user["id"])
    doc = next((d for d in docs if d["id"] == doc_id and d.get("userId") == user_id), None)

    if not doc:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")

    try:
        delete_document_chunks(doc_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vektör veritabanından silerken hata: {str(e)}")

    if os.path.exists(doc.get("filePath", "")):
        os.remove(doc["filePath"])

    docs = [d for d in docs if d["id"] != doc_id]
    save_documents(docs)

    history_file = os.path.join(os.path.dirname(__file__), "..", "data", "history.json")
    if os.path.exists(history_file):
        with open(history_file, "r", encoding="utf-8") as f:
            history = json.load(f)
        history = [h for h in history if h.get("documentId") != doc_id]
        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2, default=str)

    return DeleteResult(success=True, message=f"'{doc['filename']}' belgesi başarıyla silindi.")
