import re
from typing import List, Dict, Any

def structure_aware_chunking(
    text: str,
    page_number: int = 1,
    target_chunk_size: int = 1500, # ~350-450 tokens
    overlap_size: int = 200,
    metadata: Dict[str, Any] = None
) -> List[Dict[str, Any]]:
    """
    Slices extracted text while detecting section titles (e.g., 'Section 3.1: ...'
    or 'Warning:', 'Caution:') and preserving page and equipment metadata.
    """
    chunks = []
    metadata = metadata or {}

    # Extract likely section title from the beginning of text if present
    section_match = re.search(r"^(Section\s+[\d\.]+:?[^\n]+|[A-Z\s]{4,}:)", text, re.MULTILINE)
    default_section = section_match.group(1).strip() if section_match else f"Page {page_number}"

    # Split text into paragraphs first
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text.strip()]

    current_chunk = ""
    current_section = default_section

    for para in paragraphs:
        # Check if paragraph looks like a new section heading
        heading_match = re.search(r"^(Section\s+[\d\.]+:?[^\n]+|[0-9]+\.[0-9]+\s+[A-Z][^\n]+)", para)
        if heading_match:
            current_section = heading_match.group(1).strip()

        if len(current_chunk) + len(para) > target_chunk_size and len(current_chunk) > 300:
            chunks.append({
                "page_number": page_number,
                "section_title": current_section,
                "content": current_chunk.strip(),
                "metadata": metadata
            })
            # Overlap: keep the last sentence/portion
            current_chunk = current_chunk[-overlap_size:] + " " + para
        else:
            current_chunk = (current_chunk + "\n\n" + para).strip()

    if current_chunk:
        chunks.append({
            "page_number": page_number,
            "section_title": current_section,
            "content": current_chunk.strip(),
            "metadata": metadata
        })

    # A single paragraph without blank lines can exceed the target many times
    # over; split those on whitespace with overlap so retrieval stays precise.
    limit = target_chunk_size * 2
    bounded: List[Dict[str, Any]] = []
    for chunk in chunks:
        content = chunk["content"]
        if len(content) <= limit:
            bounded.append(chunk)
            continue
        start = 0
        while start < len(content):
            end = min(len(content), start + target_chunk_size)
            if end < len(content):
                space = content.rfind(" ", start + target_chunk_size // 2, end)
                end = space if space > start else end
            bounded.append({**chunk, "content": content[start:end].strip()})
            if end >= len(content):
                break
            start = max(end - overlap_size, start + 1)
    return bounded
