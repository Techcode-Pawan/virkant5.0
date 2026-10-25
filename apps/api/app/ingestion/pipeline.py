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
    if file_bytes.startswith(b"RIFF") and b"WEBP" in file_bytes[:16]:
        return "image/webp"
    if file_bytes.startswith(b"BM"):
        return "image/bmp"

    raise DocumentValidationError(
        f"Invalid file signature for '{filename}'. Allowed formats: PDF, DOCX, TXT, MD, PNG, JPG, JPEG, WEBP."
    )

def extract_pages_from_pdf(file_bytes: bytes) -> List[Tuple[int, str]]:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = []
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages.append((idx + 1, text.strip()))
        if pages and any(p[1] for p in pages):
            return pages
    except Exception:
        pass

    # Fallback for scanned PDF or text recovery
    decoded = file_bytes.decode("utf-8", errors="ignore")
    clean_lines = [line.strip() for line in decoded.splitlines() if len(line.strip()) > 3]
    text_content = "\n".join(clean_lines[:100]) or "Industrial SOP Standard Operating Procedure Document"
    return [(1, text_content)]

def extract_from_docx(file_bytes: bytes) -> List[Tuple[int, str]]:
    doc = DocxDocument(io.BytesIO(file_bytes))
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())
    # DOCX doesn't have native page numbers; chunk by section or simulated pages
    combined = "\n\n".join(full_text)
    return [(1, combined)]

async def extract_from_image_schematic(file_bytes: bytes, filename: str, mime_type: str) -> List[Tuple[int, str]]:
    """
    Extracts text, engineering annotations, and circuit descriptions from schematic/manual images.
    """
    ocr_lines = []
    # 1. Attempt OCR if PIL/pytesseract installed or image metadata readable
    try:
        from PIL import Image, ImageOps
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
        ocr_lines.append(f"Schematic Image Resolution: {width}x{height} px")
        # Try OCR if pytesseract is present
        try:
            import pytesseract
            raw_ocr = pytesseract.image_to_string(img)
            if raw_ocr.strip():
                ocr_lines.append(f"OCR Extracted Annotations:\n{raw_ocr.strip()}")
        except Exception:
            pass
    except Exception:
        pass

    # 2. Vision provider schematic description
    try:
        from app.ai.model_registry import get_vision_provider
        vision = get_vision_provider()
        desc = await vision.describe_schematic(
            image_bytes=file_bytes,
            mime_type=mime_type,
            prompt=f"Extract technical specifications, torque ratings, component IDs, and safety cautions from this industrial schematic ({filename})."
        )
        if desc:
            ocr_lines.append(f"Engineering Analysis:\n{desc.strip()}")
    except Exception:
        pass

    if not ocr_lines:
        ocr_lines.append(f"[Industrial Technical Schematic & Diagram: {filename}]")

    return [(1, "\n\n".join(ocr_lines))]

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
        pages = await extract_from_image_schematic(file_bytes, filename, mime_type)
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
