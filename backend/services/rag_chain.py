import os
from typing import List, Dict, Optional
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from services.embeddings import search_similar_chunks


def build_context(chunks: List[Dict]) -> str:
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Kaynak {i} - Sayfa {chunk['page']} ({chunk['filename']})]:\n{chunk['text']}"
        )
    return "\n\n---\n\n".join(context_parts)


def generate_answer(question: str, doc_id: Optional[str], top_k: int = 5) -> Dict:
    chunks = search_similar_chunks(query=question, doc_id=doc_id, top_k=top_k)

    if not chunks:
        return {
            "answer": "Sorunuzla ilgili belgede herhangi bir bilgi bulunamadı. Lütfen farklı bir soru deneyin veya önce bir belge yükleyin.",
            "sources": [],
            "chunks_used": 0
        }

    context = build_context(chunks)

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.1,
        openai_api_key=os.environ.get("OPENAI_API_KEY")
    )

    system_prompt = """Sen bir belge analiz asistanısın. Kullanıcının sorularını yalnızca sağlanan belge bağlamına dayanarak Türkçe olarak yanıtlayacaksın.

Kurallar:
- Yalnızca verilen bağlamdaki bilgileri kullan
- Bağlamda olmayan bir bilgiyi uydurmaya çalışma
- Eğer cevap bağlamda yoksa, bunu açıkça belirt
- Cevaplarını net, anlaşılır ve kapsamlı tut
- Mümkünse hangi sayfadan bilgi aldığını belirt"""

    user_prompt = f"""Belge Bağlamı:
{context}

Soru: {question}

Lütfen yukarıdaki bağlama dayanarak soruyu yanıtla."""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ])

    return {
        "answer": response.content,
        "sources": chunks,
        "chunks_used": len(chunks)
    }
