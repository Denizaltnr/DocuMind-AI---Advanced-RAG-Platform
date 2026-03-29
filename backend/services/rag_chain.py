import os
import time
import random
import logging
from typing import List, Dict, Optional

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain.schema import HumanMessage, SystemMessage
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from langchain_chroma import Chroma
from services.embeddings import search_similar_chunks, CHROMA_PATH

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

_session_memories: Dict[str, ConversationBufferWindowMemory] = {}


# ── LLM factory ──────────────────────────────────────────────────
def get_llm(temperature: float = 0.3) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        temperature=temperature,
        google_api_key=GOOGLE_API_KEY,
        convert_system_message_to_human=True,
    )


# ── Retry wrapper (429 / ResourceExhausted) ───────────────────────
def _invoke_with_retry(llm, messages, max_retries: int = 4):
    """
    Ücretsiz Gemini katmanındaki 429 rate-limit hatalarını
    üstel geri-çekilme + jitter ile yönetir.
    """
    for attempt in range(max_retries):
        try:
            return llm.invoke(messages)
        except Exception as exc:
            err_str = str(exc).lower()
            is_rate_limit = (
                "429" in err_str
                or "resource_exhausted" in err_str
                or "quota" in err_str
                or "rate" in err_str
            )
            if is_rate_limit and attempt < max_retries - 1:
                wait = (2 ** attempt) + random.uniform(0.5, 1.5)
                logger.warning(
                    "Gemini rate-limit (deneme %d/%d). %.1f sn bekleniyor…",
                    attempt + 1, max_retries, wait,
                )
                time.sleep(wait)
            else:
                raise


# ── Context builder ───────────────────────────────────────────────
def build_context(chunks: List[Dict]) -> str:
    parts = [
        f"[Kaynak {i} – Sayfa {c['page']} ({c['filename']})]:\n{c['text']}"
        for i, c in enumerate(chunks, 1)
    ]
    return "\n\n---\n\n".join(parts)


# ── Single-shot RAG (query & history endpoints) ───────────────────
def generate_answer(
    question: str, doc_id: Optional[str], top_k: int = 5
) -> Dict:
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
    llm = get_llm()

    system_prompt = (
        "Sen bir belge analiz asistanısın. "
        "Kullanıcının sorularını yalnızca sağlanan belge bağlamına dayanarak "
        "Türkçe olarak yanıtlayacaksın.\n\n"
        "Kurallar:\n"
        "- Yalnızca verilen bağlamdaki bilgileri kullan\n"
        "- Bağlamda olmayan bir bilgiyi uydurmaya çalışma\n"
        "- Eğer cevap bağlamda yoksa, bunu açıkça belirt\n"
        "- Cevaplarını net, anlaşılır ve kapsamlı tut\n"
        "- Mümkünse hangi sayfadan bilgi aldığını belirt"
    )
    user_prompt = (
        f"Belge Bağlamı:\n{context}\n\n"
        f"Soru: {question}\n\n"
        "Lütfen yukarıdaki bağlama dayanarak soruyu yanıtla."
    )

    response = _invoke_with_retry(
        llm,
        [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)],
    )

    return {
        "answer": response.content,
        "sources": chunks,
        "chunks_used": len(chunks),
    }


# ── Conversational chain ─────────────────────────────────────────
def _build_chat_prompt():
    from langchain.prompts import PromptTemplate

    template = """Sen bir belge analiz asistanısın. Yalnızca aşağıdaki belge \
bağlamına ve konuşma geçmişine dayanarak soruyu Türkçe olarak yanıtla.

Kurallar:
- Yalnızca verilen bağlamdaki bilgileri kullan
- Bağlamda olmayan bir bilgiyi uydurmaya çalışma
- Eğer cevap bağlamda yoksa, bunu açıkça belirt
- Cevabın açık, anlaşılır ve kapsamlı olsun
- Mümkünse kaynağın sayfa numarasını belirt

Bağlam:
{context}

Soru: {question}

Cevap:"""
    return PromptTemplate(input_variables=["context", "question"], template=template)


def get_conversational_chain(
    session_id: str, doc_id: Optional[str]
) -> ConversationalRetrievalChain:
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=GOOGLE_API_KEY,
    )

    vectorstore = Chroma(
        collection_name="documents",
        embedding_function=embeddings,
        persist_directory=CHROMA_PATH,
    )

    search_kwargs: Dict = {"k": 5}
    if doc_id:
        search_kwargs["filter"] = {"document_id": doc_id}

    retriever = vectorstore.as_retriever(search_kwargs=search_kwargs)

    if session_id not in _session_memories:
        _session_memories[session_id] = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer",
            k=10,
        )

    memory = _session_memories[session_id]
    llm = get_llm()

    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        return_source_documents=True,
        verbose=False,
        combine_docs_chain_kwargs={"prompt": _build_chat_prompt()},
    )

    return chain


def clear_session(session_id: str):
    if session_id in _session_memories:
        del _session_memories[session_id]


def chat_with_documents(
    session_id: str,
    question: str,
    doc_id: Optional[str] = None,
) -> Dict:
    """
    Konuşma geçmişini koruyarak Gemini 1.5 Flash ile RAG cevabı üretir.
    """
    chain = get_conversational_chain(session_id=session_id, doc_id=doc_id)

    try:
        result = chain.invoke({"question": question})
    except Exception as exc:
        err_str = str(exc).lower()
        is_rate_limit = (
            "429" in err_str
            or "resource_exhausted" in err_str
            or "quota" in err_str
        )
        if is_rate_limit:
            raise RuntimeError(
                "Gemini API rate limiti aşıldı. Lütfen birkaç saniye bekleyip tekrar deneyin."
            ) from exc
        raise

    answer = result.get("answer", "")
    source_docs = result.get("source_documents", [])

    sources = []
    seen = set()
    for doc in source_docs:
        meta = doc.metadata
        key = (meta.get("document_id", ""), meta.get("chunk_index", 0))
        if key not in seen:
            seen.add(key)
            sources.append(
                {
                    "text": doc.page_content,
                    "page": meta.get("page", 0),
                    "score": 0.0,
                    "document_id": meta.get("document_id", ""),
                    "filename": meta.get("filename", ""),
                }
            )

    return {
        "answer": answer,
        "sources": sources,
        "session_id": session_id,
    }
