import os
from typing import List, Dict, Optional
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from services.embeddings import search_similar_chunks, CHROMA_PATH

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

_session_memories: Dict[str, ConversationBufferWindowMemory] = {}


def get_llm(temperature: float = 0.1) -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=temperature,
        openai_api_key=OPENAI_API_KEY,
    )


def build_context(chunks: List[Dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(
            f"[Kaynak {i} – Sayfa {chunk['page']} ({chunk['filename']})]:\n{chunk['text']}"
        )
    return "\n\n---\n\n".join(parts)


def generate_answer(question: str, doc_id: Optional[str], top_k: int = 5) -> Dict:
    """
    Basit tek-seferlik RAG cevabı (geçmiş sayfası & query endpoint'i için).
    """
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
        "Kullanıcının sorularını yalnızca sağlanan belge bağlamına dayanarak Türkçe olarak yanıtlayacaksın.\n\n"
        "Kurallar:\n"
        "- Yalnızca verilen bağlamdaki bilgileri kullan\n"
        "- Bağlamda olmayan bir bilgiyi uydurmaya çalışma\n"
        "- Eğer cevap bağlamda yoksa, bunu açıkça belirt\n"
        "- Cevaplarını net, anlaşılır ve kapsamlı tut\n"
        "- Mümkünse hangi sayfadan bilgi aldığını belirt"
    )

    user_prompt = f"Belge Bağlamı:\n{context}\n\nSoru: {question}\n\nLütfen yukarıdaki bağlama dayanarak soruyu yanıtla."

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    return {
        "answer": response.content,
        "sources": chunks,
        "chunks_used": len(chunks),
    }


def get_conversational_chain(session_id: str, doc_id: Optional[str]) -> ConversationalRetrievalChain:
    """
    ConversationalRetrievalChain: oturum bazlı konuşma geçmişini korur.
    """
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        openai_api_key=OPENAI_API_KEY,
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
        combine_docs_chain_kwargs={
            "prompt": _build_chat_prompt(),
        },
    )

    return chain


def _build_chat_prompt():
    from langchain.prompts import PromptTemplate

    template = """Sen bir belge analiz asistanısın. Yalnızca aşağıdaki belge bağlamına ve konuşma geçmişine dayanarak soruyu Türkçe olarak yanıtla.

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


def clear_session(session_id: str):
    if session_id in _session_memories:
        del _session_memories[session_id]


def chat_with_documents(
    session_id: str,
    question: str,
    doc_id: Optional[str] = None,
) -> Dict:
    """
    ConversationalRetrievalChain ile konuşma geçmişini koruyarak cevap üretir.
    """
    chain = get_conversational_chain(session_id=session_id, doc_id=doc_id)

    result = chain.invoke({"question": question})

    answer = result.get("answer", "")
    source_docs = result.get("source_documents", [])

    sources = []
    seen = set()
    for doc in source_docs:
        meta = doc.metadata
        key = (meta.get("document_id", ""), meta.get("chunk_index", 0))
        if key not in seen:
            seen.add(key)
            sources.append({
                "text": doc.page_content,
                "page": meta.get("page", 0),
                "score": 0.0,
                "document_id": meta.get("document_id", ""),
                "filename": meta.get("filename", ""),
            })

    return {
        "answer": answer,
        "sources": sources,
        "session_id": session_id,
    }
