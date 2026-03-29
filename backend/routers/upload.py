import os
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import aiofiles

from services.pdf_processor import extract_text_chunks, get_page_count
from services.embeddings import add_document_chunks

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
METADATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "documents.json")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.dirname(METADATA_FILE), exist_ok=True)


def load_documents() -> list:
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_documents(docs: list):
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(docs, f, ensure_ascii=False, indent=2, default=str)


class UploadResponse(BaseModel):
    id: str
    filename: str
    uploadedAt: str
    pageCount: int
    chunkCount: int
    fileSize: int
    message: str


@router.post("", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Yalnızca PDF dosyaları kabul edilmektedir.")

    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    content = await file.read()
    file_size = len(content)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    try:
        page_count = get_page_count(file_path)
        chunks = extract_text_chunks(file_path)
        chunk_count = add_document_chunks(doc_id, file.filename, chunks)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"PDF işlenirken hata oluştu: {str(e)}")

    uploaded_at = datetime.utcnow().isoformat()
    doc_meta = {
        "id": doc_id,
        "filename": file.filename,
        "uploadedAt": uploaded_at,
        "pageCount": page_count,
        "chunkCount": chunk_count,
        "fileSize": file_size,
        "filePath": file_path
    }

    docs = load_documents()
    docs.append(doc_meta)
    save_documents(docs)

    return UploadResponse(
        id=doc_id,
        filename=file.filename,
        uploadedAt=uploaded_at,
        pageCount=page_count,
        chunkCount=chunk_count,
        fileSize=file_size,
        message=f"Belge başarıyla yüklendi ve {chunk_count} parçaya ayrıldı."
    )
