import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from app.schemas.documents import DocumentResponse

# Baseline plant documents - clean initial state for real user uploads
BASELINE_PLANT_DOCUMENTS: List[dict] = []

class CustomDocumentRegistry:
    """
    Manages custom SOP manual uploads and per-workspace isolated knowledge chunks.
    Ensures that uploaded custom SOP manuals are immediately grounded and retrievable
    with zero latency.
    """
    def __init__(self):
        # Maps workspace_id -> list of custom document dicts
        self._workspace_docs: Dict[str, List[dict]] = {}

    def add_custom_document(
        self,
        workspace_id: str,
        doc_dict: dict,
        chunks: List[dict]
    ) -> None:
        if workspace_id not in self._workspace_docs:
            self._workspace_docs[workspace_id] = []
        
        doc_entry = {
            **doc_dict,
            "workspace_id": workspace_id,
            "is_custom": True,
            "chunks": chunks
        }
        self._workspace_docs[workspace_id].insert(0, doc_entry)

    def list_documents(
        self,
        workspace_id: Optional[str],
        organization_id: str,
        machine_id: Optional[str] = None
    ) -> List[DocumentResponse]:
        results: List[DocumentResponse] = []

        # 1. Add workspace-specific custom SOPs first
        if workspace_id and workspace_id in self._workspace_docs:
            for d in self._workspace_docs[workspace_id]:
                if machine_id and d.get("machine_id") != machine_id:
                    continue
                results.append(DocumentResponse(
                    id=d["id"],
                    organization_id=d["organization_id"],
                    machine_id=d.get("machine_id"),
                    title=f"[Custom SOP] {d['title']}",
                    file_name=d["file_name"],
                    file_key=d.get("file_key", ""),
                    mime_type=d["mime_type"],
                    file_size_bytes=d["file_size_bytes"],
                    version=d.get("version", "1.0"),
                    status="ready",
                    page_count=d.get("page_count", 1),
                    created_at=d.get("created_at", datetime.now(timezone.utc).isoformat())
                ))

        # 2. Add baseline plant SOPs
        for d in BASELINE_PLANT_DOCUMENTS:
            if machine_id and d.get("machine_id") != machine_id:
                continue
            results.append(DocumentResponse(
                id=d["id"],
                organization_id=d["organization_id"],
                machine_id=d.get("machine_id"),
                title=d["title"],
                file_name=d["file_name"],
                file_key=d["file_key"],
                mime_type=d["mime_type"],
                file_size_bytes=d["file_size_bytes"],
                version=d["version"],
                status="ready",
                page_count=d["page_count"],
                created_at=d["created_at"]
            ))

        return results

    def get_all_chunks(self, workspace_id: Optional[str] = None) -> List[dict]:
        all_chunks: List[dict] = []

        # 1. Custom chunks from workspace
        if workspace_id and workspace_id in self._workspace_docs:
            for doc in self._workspace_docs[workspace_id]:
                doc_title = doc.get("title", "Custom SOP Manual")
                for chunk in doc.get("chunks", []):
                    all_chunks.append({
                        "id": chunk.get("id", str(uuid.uuid4())),
                        "document_id": doc["id"],
                        "document_title": f"[Custom SOP] {doc_title}",
                        "page_number": chunk.get("page_number", 1),
                        "section_title": chunk.get("section_title", "Custom Operational Procedure"),
                        "machine_id": doc.get("machine_id") or chunk.get("metadata", {}).get("machine_id"),
                        "content": chunk.get("content", ""),
                        "is_custom": True,
                        "workspace_id": workspace_id
                    })

        # 2. Baseline chunks
        for doc in BASELINE_PLANT_DOCUMENTS:
            for chunk in doc["chunks"]:
                all_chunks.append({
                    **chunk,
                    "is_custom": False,
                    "workspace_id": "baseline"
                })

        return all_chunks

    def delete_document(self, document_id: str, workspace_id: Optional[str] = None) -> bool:
        if workspace_id and workspace_id in self._workspace_docs:
            initial_len = len(self._workspace_docs[workspace_id])
            self._workspace_docs[workspace_id] = [
                d for d in self._workspace_docs[workspace_id] if d["id"] != document_id
            ]
            if len(self._workspace_docs[workspace_id]) < initial_len:
                return True
        return False

# Global registry singleton
custom_document_registry = CustomDocumentRegistry()
