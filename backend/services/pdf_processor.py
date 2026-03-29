import fitz
from typing import List, Dict
from langchain.text_splitter import RecursiveCharacterTextSplitter


def extract_text_chunks(
    file_path: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> List[Dict]:
    """
    PDF dosyasından metin çıkarır ve LangChain RecursiveCharacterTextSplitter
    kullanarak anlamlı parçalara böler.
    """
    doc = fitz.open(file_path)
    pages_text: List[tuple[int, str]] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text().strip()
        if text:
            pages_text.append((page_num + 1, text))

    doc.close()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""],
    )

    chunks: List[Dict] = []
    for page_num, text in pages_text:
        page_chunks = splitter.split_text(text)
        for chunk_text in page_chunks:
            chunk_text = chunk_text.strip()
            if chunk_text:
                chunks.append({
                    "text": chunk_text,
                    "page": page_num,
                })

    return chunks


def get_page_count(file_path: str) -> int:
    doc = fitz.open(file_path)
    count = len(doc)
    doc.close()
    return count
