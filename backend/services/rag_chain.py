import os
import time
import random
import logging
import httpx
from typing import List, Dict, Optional

from services.embeddings import search_similar_chunks

logger = logging.getLogger(__name__)

GOOGLE_API_KEY  = os.environ.get("GOOGLE_API_KEY")
OPENAI_BASE_URL = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL", "").rstrip("/")
OPENAI_API_KEY  = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY", "dummy-key")

_session_histories: Dict[str, List[Dict]] = {}


# ── Direct OpenAI call via httpx (no new packages) ──────────────────
def _call_openai(messages: List[Dict], max_tokens: int = 4096) -> Optional[str]:
    if not OPENAI_BASE_URL:
        return None
    try:
        url = f"{OPENAI_BASE_URL}/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "max_tokens": max_tokens,
        }
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        logger.warning("OpenAI direct call failed: %s — falling back to Gemini", exc)
        return None


# ── Gemini LLM fallback via LangChain ────────────────────────────────
def _call_gemini(messages: List[Dict], temperature: float = 0.3) -> str:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain.schema import HumanMessage, SystemMessage, AIMessage

    lc_messages = []
    for m in messages:
        role = m["role"]
        content = m["content"]
        if role == "system":
            lc_messages.append(SystemMessage(content=content))
        elif role == "assistant":
            lc_messages.append(AIMessage(content=content))
        else:
            lc_messages.append(HumanMessage(content=content))

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=temperature,
        google_api_key=GOOGLE_API_KEY,
    )

    for attempt in range(4):
        try:
            resp = llm.invoke(lc_messages)
            return resp.content
        except Exception as exc:
            err = str(exc).lower()
            is_quota = any(k in err for k in ("429", "resource_exhausted", "quota", "rate"))
            if is_quota and attempt < 3:
                wait = (2 ** attempt) + random.uniform(0.5, 1.5)
                logger.warning("Gemini rate-limit (attempt %d/4). Waiting %.1fs…", attempt + 1, wait)
                time.sleep(wait)
            else:
                raise


# ── Unified LLM caller ───────────────────────────────────────────────
def call_llm(messages: List[Dict], temperature: float = 0.3) -> str:
    result = _call_openai(messages)
    if result is not None:
        logger.info("LLM: used OpenAI (gpt-4o-mini) via Replit AI integrations")
        return result
    logger.info("LLM: falling back to Gemini gemini-2.5-flash")
    return _call_gemini(messages, temperature=temperature)


# ── Context builder ───────────────────────────────────────────────────
def build_context(chunks: List[Dict]) -> str:
    parts = [
        f"[Kaynak {i} – Sayfa {c['page']} ({c['filename']})]:\n{c['text']}"
        for i, c in enumerate(chunks, 1)
    ]
    return "\n\n---\n\n".join(parts)


# ── Session history helpers ───────────────────────────────────────────
def _get_history(session_id: str) -> List[Dict]:
    return _session_histories.get(session_id, [])


def _append_history(session_id: str, question: str, answer: str):
    hist = _session_histories.setdefault(session_id, [])
    hist.append({"role": "user", "content": question})
    hist.append({"role": "assistant", "content": answer})
    if len(hist) > 20:
        _session_histories[session_id] = hist[-20:]


def clear_session(session_id: str):
    _session_histories.pop(session_id, None)


# ── Single-shot RAG ───────────────────────────────────────────────────
def generate_answer(question: str, doc_id: Optional[str], top_k: int = 5) -> Dict:
    chunks = search_similar_chunks(query=question, doc_id=doc_id, top_k=top_k)

    if not chunks:
        return {
            "answer": (
                "Sorunuzla ilgili belgede herhangi bir bilgi bulunamadı. "
                "Lütfen farklı bir soru deneyin veya önce bir belge yükleyin."
            ),
            "sources": [],
            "chunks_used": 0,
        }

    context = build_context(chunks)
    messages = [
        {
            "role": "system",
            "content": (
                "Sen bir belge analiz asistanısın. "
                "Kullanıcının sorularını yalnızca sağlanan belge bağlamına dayanarak "
                "Türkçe olarak yanıtlayacaksın.\n\n"
                "Kurallar:\n"
                "- Yalnızca verilen bağlamdaki bilgileri kullan\n"
                "- Bağlamda olmayan bir bilgiyi uydurmaya çalışma\n"
                "- Eğer cevap bağlamda yoksa, bunu açıkça belirt\n"
                "- Cevaplarını net, anlaşılır ve kapsamlı tut\n"
                "- Mümkünse hangi sayfadan bilgi aldığını belirt"
            ),
        },
        {
            "role": "user",
            "content": (
                f"Belge Bağlamı:\n{context}\n\n"
                f"Soru: {question}\n\n"
                "Lütfen yukarıdaki bağlama dayanarak soruyu yanıtla."
            ),
        },
    ]

    answer = call_llm(messages)
    return {"answer": answer, "sources": chunks, "chunks_used": len(chunks)}


# ── Conversational RAG ────────────────────────────────────────────────
def chat_with_documents(
    session_id: str,
    question: str,
    doc_id: Optional[str] = None,
) -> Dict:
    chunks = search_similar_chunks(query=question, doc_id=doc_id, top_k=5)
    context = build_context(chunks) if chunks else "İlgili belge bağlamı bulunamadı."

    history = _get_history(session_id)

    system_msg = {
        "role": "system",
        "content": (
            "Sen bir belge analiz asistanısın. Yalnızca aşağıdaki belge bağlamına "
            "ve konuşma geçmişine dayanarak soruyu Türkçe olarak yanıtla.\n\n"
            "Kurallar:\n"
            "- Yalnızca verilen bağlamdaki bilgileri kullan\n"
            "- Bağlamda olmayan bir bilgiyi uydurmaya çalışma\n"
            "- Eğer cevap bağlamda yoksa, bunu açıkça belirt\n"
            "- Cevabın açık, anlaşılır ve kapsamlı olsun\n"
            "- Mümkünse kaynağın sayfa numarasını belirt\n\n"
            f"Belge Bağlamı:\n{context}"
        ),
    }

    messages = [system_msg] + history + [{"role": "user", "content": question}]

    answer = call_llm(messages)
    _append_history(session_id, question, answer)

    sources = []
    seen: set = set()
    for chunk in chunks:
        key = (chunk.get("document_id", ""), chunk.get("chunk_index", 0))
        if key not in seen:
            seen.add(key)
            sources.append(
                {
                    "text": chunk["text"],
                    "page": chunk["page"],
                    "score": chunk.get("score", 0.0),
                    "document_id": chunk.get("document_id", ""),
                    "filename": chunk.get("filename", ""),
                }
            )

    return {"answer": answer, "sources": sources, "session_id": session_id}


# ── Title generation helper (used by chat.py) ────────────────────────
def generate_title(question: str) -> str:
    messages = [
        {
            "role": "user",
            "content": (
                "Generate a very short chat title (3-6 words max) for a conversation "
                "that starts with this question. Respond in the same language as the question. "
                "Only output the title, nothing else.\n\nQuestion: " + question
            ),
        }
    ]
    try:
        title = call_llm(messages, temperature=0.0).strip().strip("\"'")
        return title[:80] if title else question[:60]
    except Exception as exc:
        logger.warning("Title generation failed: %s", exc)
        return question[:60]
