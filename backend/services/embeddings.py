import os
from typing import List, Dict, Optional
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain.schema import Document

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "chroma")

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")


def get_embedding_function():
    return GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=GOOGLE_API_KEY,
    )


def get_vectorstore(collection_name: str = "documents") -> Chroma:
    return Chroma(
        collection_name=collection_name,
        embedding_function=get_embedding_function(),
        persist_directory=CHROMA_PATH,
    )


def add_document_chunks(doc_id: str, filename: str, chunks: List[Dict]) -> int:
    vectorstore = get_vectorstore()
    documents = []
    ids = []

    for i, chunk in enumerate(chunks):
        doc = Document(
            page_content=chunk["text"],
            metadata={
                "document_id": doc_id,
                "filename": filename,
                "page": chunk["page"],
                "chunk_index": i,
            },
        )
        documents.append(doc)
        ids.append(f"{doc_id}_chunk_{i}")

    vectorstore.add_documents(documents=documents, ids=ids)
    return len(documents)


def search_similar_chunks(
    query: str, doc_id: Optional[str], top_k: int = 5
) -> List[Dict]:
    vectorstore = get_vectorstore()

    filter_dict = {"document_id": doc_id} if doc_id else None

    results = vectorstore.similarity_search_with_score(
        query=query,
        k=top_k,
        filter=filter_dict,
    )

    chunks = []
    for doc, score in results:
        chunks.append(
            {
                "text": doc.page_content,
                "page": doc.metadata.get("page", 0),
                "score": float(score),
                "document_id": doc.metadata.get("document_id", ""),
                "filename": doc.metadata.get("filename", ""),
            }
        )

    return chunks


def delete_document_chunks(doc_id: str):
    vectorstore = get_vectorstore()
    collection = vectorstore._collection
    results = collection.get(where={"document_id": doc_id})
    if results and results.get("ids"):
        collection.delete(ids=results["ids"])
