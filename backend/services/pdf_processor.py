import fitz
from typing import List, Dict


def extract_text_chunks(file_path: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[Dict]:
    doc = fitz.open(file_path)
    chunks = []
    full_text_by_page = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        full_text_by_page.append((page_num + 1, text))

    doc.close()

    for page_num, text in full_text_by_page:
        text = text.strip()
        if not text:
            continue

        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "text": chunk_text,
                    "page": page_num,
                    "start": start,
                    "end": end
                })
            if end == len(text):
                break
            start = end - chunk_overlap

    return chunks


def get_page_count(file_path: str) -> int:
    doc = fitz.open(file_path)
    count = len(doc)
    doc.close()
    return count
