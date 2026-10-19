import io
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from docx import Document as DocxDocument
from app.core.exceptions import DocumentValidationError
from app.ingestion.chunking import structure_aware_chunking
from app.ai.model_registry import get_embedding_provider

MAGIC_SIGNATURES = {
    b"%PDF-": "application/pdf",
    b"PK\x03\x04": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

def validate_file_content(file_bytes: bytes, filename: str) -> str:
    """
    Validates magic bytes against allowed industrial document types.
    """
    if len(file_bytes) > 52428800:
        raise DocumentValidationError(f"File exceeds maximum allowed size of 50 MB ({len(file_bytes)} bytes)")

    if filename.lower().endswith(".txt") or filename.lower().endswith(".md"):
        return "text/plain"

    for sig, mime in MAGIC_SIGNATURES.items():
        if file_bytes.startswith(sig):
            return mime

    # Allow images if magic bytes match
    if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if file_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    raise DocumentValidationError(
        f"Invalid file signature for '{filename}'. Allowed formats: PDF, DOCX, TXT, MD, PNG, JPG."
    )

def extract_pages_from_pdf(file_bytes: bytes) -> List[Tuple[int, str]]:
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append((idx + 1, text.strip()))
    return pages

def extract_from_docx(file_bytes: bytes) -> List[Tuple[int, str]]:
    doc = DocxDocument(io.BytesIO(file_bytes))
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())
    # DOCX doesn't have native page numbers; chunk by section or simulated pages
    combined = "\n\n".join(full_text)
    return [(1, combined)]

async def process_document_pipeline(
    file_bytes: bytes,
    filename: str,
    document_id: str,
    organization_id: str,
    machine_id: str = None
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Executes extraction, chunking, and embedding generation.
    Returns (chunks, total_pages).
    """
    mime_type = validate_file_content(file_bytes, filename)
    
    pages = []
    if mime_type == "application/pdf":
        pages = extract_pages_from_pdf(file_bytes)
    elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        pages = extract_from_docx(file_bytes)
    elif mime_type.startswith("image/"):
        pages = [(1, f"[Industrial Schematic Figure from {filename}]")]
    else:
        # Plain text / Markdown
        text = file_bytes.decode("utf-8", errors="replace")
        pages = [(1, text)]

    all_chunks = []
    metadata = {
        "document_id": document_id,
        "organization_id": organization_id,
        "machine_id": machine_id
    }

    for page_num, page_text in pages:
        if not page_text.strip():
            continue
        page_chunks = structure_aware_chunking(
            text=page_text,
            page_number=page_num,
            metadata=metadata
        )
        all_chunks.extend(page_chunks)

    # Batch embedding generation
    if all_chunks:
        embedder = get_embedding_provider()
        texts = [c["content"] for c in all_chunks]
        embeddings = await embedder.embed_texts(texts)
        for idx, chunk in enumerate(all_chunks):
            chunk["embedding"] = embeddings[idx]

    return all_chunks, len(pages)
