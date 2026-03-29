import os
import uuid
import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

from services.rag_chain import chat_with_documents, clear_session, generate_title
from services.auth_service import get_connection
from middleware.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

DOCUMENTS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "documents.json")
os.makedirs(os.path.dirname(DOCUMENTS_FILE), exist_ok=True)


# ── Helpers ──────────────────────────────────────────────────────────

def _load_documents() -> list:
    if os.path.exists(DOCUMENTS_FILE):
        with open(DOCUMENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _get_document_name(doc_id: Optional[str], user_id: str) -> str:
    if not doc_id:
        return ""
    docs = _load_documents()
    doc = next((d for d in docs if d["id"] == doc_id and d.get("userId") == user_id), None)
    return doc["filename"] if doc else "Bilinmeyen Belge"


def _db_get_session(conn, session_id: str, user_id: str):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM chat_sessions WHERE id=%s AND user_id=%s",
            (session_id, user_id),
        )
        return cur.fetchone()


def _db_create_session(conn, session_id: str, user_id: str, document_id: Optional[str], document_name: str):
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO chat_sessions (id, user_id, title, document_id, document_name)
               VALUES (%s, %s, %s, %s, %s)""",
            (session_id, user_id, "Yeni Sohbet", document_id, document_name or None),
        )
        conn.commit()


def _db_touch_session(conn, session_id: str):
    with conn.cursor() as cur:
        cur.execute("UPDATE chat_sessions SET updated_at=NOW() WHERE id=%s", (session_id,))
        conn.commit()


def _db_update_title(conn, session_id: str, title: str):
    with conn.cursor() as cur:
        cur.execute("UPDATE chat_sessions SET title=%s WHERE id=%s", (title, session_id))
        conn.commit()


def _db_save_message(conn, session_id: str, role: str, content: str, sources=None):
    import json as _json
    with conn.cursor() as cur:
        sources_json = _json.dumps(sources) if sources else None
        cur.execute(
            "INSERT INTO messages (session_id, role, content, sources) VALUES (%s, %s, %s, %s::jsonb)",
            (session_id, role, content, sources_json),
        )
        conn.commit()


def _generate_title(question: str) -> str:
    return generate_title(question)


# ── Pydantic models ──────────────────────────────────────────────────

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


class MessageItem(BaseModel):
    id: str
    role: str
    content: str
    sources: Optional[List[SourceChunk]] = None
    createdAt: str


class SessionItem(BaseModel):
    id: str
    title: str
    documentId: Optional[str] = None
    documentName: Optional[str] = None
    createdAt: str
    updatedAt: str


class DeleteSessionResponse(BaseModel):
    success: bool


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Soru boş olamaz.")

    session_id = req.sessionId or str(uuid.uuid4())
    user_id = str(current_user["id"])

    conn = get_connection()
    try:
        doc_name = _get_document_name(req.documentId, user_id)
        existing = _db_get_session(conn, session_id, user_id)
        is_first = existing is None

        if is_first:
            _db_create_session(conn, session_id, user_id, req.documentId, doc_name)

        try:
            result = chat_with_documents(
                session_id=session_id,
                question=req.question,
                doc_id=req.documentId,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Sohbet işlenirken hata oluştu: {str(e)}")

        sources_data = [
            {
                "text": s["text"],
                "page": s["page"],
                "score": s.get("score", 0.0),
                "documentId": s.get("document_id", s.get("documentId", "")),
                "filename": s["filename"],
            }
            for s in result["sources"]
        ]

        _db_save_message(conn, session_id, "user", req.question)
        _db_save_message(conn, session_id, "assistant", result["answer"], sources_data)
        _db_touch_session(conn, session_id)

        if is_first:
            try:
                title = _generate_title(req.question)
                _db_update_title(conn, session_id, title)
            except Exception as e:
                logger.warning("Could not update session title: %s", e)

    finally:
        conn.close()

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
        historyId=str(uuid.uuid4()),
    )


@router.post("/clear-session", response_model=ClearSessionResponse)
def clear_session_endpoint(
    req: ClearSessionRequest, current_user: dict = Depends(get_current_user)
):
    clear_session(req.sessionId)
    return ClearSessionResponse(success=True, message=f"Oturum '{req.sessionId}' temizlendi.")


@router.get("/sessions", response_model=List[SessionItem])
def list_sessions(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, title, document_id, document_name, created_at, updated_at
                   FROM chat_sessions WHERE user_id=%s
                   ORDER BY updated_at DESC LIMIT 50""",
                (user_id,),
            )
            rows = cur.fetchall()
        return [
            SessionItem(
                id=str(r["id"]),
                title=r["title"],
                documentId=r["document_id"],
                documentName=r["document_name"],
                createdAt=r["created_at"].isoformat(),
                updatedAt=r["updated_at"].isoformat(),
            )
            for r in rows
        ]
    finally:
        conn.close()


@router.get("/sessions/{session_id}/messages", response_model=List[MessageItem])
def get_session_messages(
    session_id: str, current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    conn = get_connection()
    try:
        session = _db_get_session(conn, session_id, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Sohbet bulunamadı.")

        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, role, content, sources, created_at
                   FROM messages WHERE session_id=%s ORDER BY created_at ASC""",
                (session_id,),
            )
            rows = cur.fetchall()

        items = []
        for r in rows:
            raw_sources = r["sources"]
            sources = None
            if raw_sources:
                src_list = raw_sources if isinstance(raw_sources, list) else []
                sources = [
                    SourceChunk(
                        text=s["text"],
                        page=s["page"],
                        score=s.get("score", 0.0),
                        documentId=s.get("documentId", ""),
                        filename=s["filename"],
                    )
                    for s in src_list
                ]
            items.append(MessageItem(
                id=str(r["id"]),
                role=r["role"],
                content=r["content"],
                sources=sources,
                createdAt=r["created_at"].isoformat(),
            ))
        return items
    finally:
        conn.close()


@router.delete("/sessions/{session_id}", response_model=DeleteSessionResponse)
def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    conn = get_connection()
    try:
        session = _db_get_session(conn, session_id, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Sohbet bulunamadı.")
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM chat_sessions WHERE id=%s AND user_id=%s",
                (session_id, user_id),
            )
            conn.commit()
        clear_session(session_id)
        return DeleteSessionResponse(success=True)
    finally:
        conn.close()
