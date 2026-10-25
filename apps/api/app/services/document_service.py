import os
import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
from app.db.models import Document, DocumentChunk
from app.schemas.documents import DocumentResponse
from app.ingestion.pipeline import process_document_pipeline
from app.core.exceptions import DocumentValidationError
from app.services.document_registry import custom_document_registry
from app.db.sqlite_db import execute_query, execute_write

class DocumentService:
    def __init__(self, db_session: Optional[AsyncSession] = None):
        self.session = db_session

    async def list_documents(
        self,
        organization_id: str,
        machine_id: Optional[str] = None,
        workspace_id: Optional[str] = None
    ) -> List[DocumentResponse]:
        results: List[DocumentResponse] = []
        seen_ids = set()

        # 1. Fetch from SQLite persistent store
        try:
            sql = "SELECT * FROM documents WHERE organization_id = ?"
            params = [organization_id]
            if workspace_id:
                sql += " AND (workspace_id = ? OR workspace_id = 'ws-a1111111' OR workspace_id IS NULL)"
                params.append(workspace_id)
            if machine_id:
                sql += " AND (machine_id = ? OR machine_id IS NULL)"
                params.append(machine_id)
            sql += " ORDER BY created_at DESC"

            rows = await execute_query(sql, tuple(params))
            for r in rows:
                if r["id"] not in seen_ids:
                    seen_ids.add(r["id"])
                    results.append(DocumentResponse(
                        id=r["id"],
                        organization_id=r["organization_id"],
                        machine_id=r.get("machine_id"),
                        title=r["title"],
                        file_name=r["file_name"],
                        file_key=r["file_key"],
                        mime_type=r["mime_type"],
                        file_size_bytes=r["file_size_bytes"],
                        version=r.get("version", "1.0"),
                        status=r.get("status", "ready"),
                        page_count=r.get("page_count", 1),
                        created_at=r.get("created_at", datetime.now(timezone.utc).isoformat())
                    ))
        except Exception:
            pass

        # 2. Add custom registry documents (per workspace in-memory)
        registry_docs = custom_document_registry.list_documents(
            workspace_id=workspace_id,
            organization_id=organization_id,
            machine_id=machine_id
        )
        for r_doc in registry_docs:
            if r_doc.id not in seen_ids:
                seen_ids.add(r_doc.id)
                results.append(r_doc)

        return results

    async def upload_document(
        self,
        file: UploadFile,
        title: str,
        organization_id: str,
        machine_id: Optional[str] = None,
        version: str = "1.0",
        workspace_id: Optional[str] = None
    ) -> DocumentResponse:
        content = await file.read()
        doc_id = str(uuid.uuid4())
        effective_ws = workspace_id or "ws-a1111111"
        effective_machine = machine_id.strip() if machine_id and machine_id.strip() else None

        # 1. Physical storage persistence
        storage_dir = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "raw", organization_id)
        os.makedirs(storage_dir, exist_ok=True)
        file_disk_name = f"{doc_id}_{file.filename}"
        storage_path = os.path.join(storage_dir, file_disk_name)
        with open(storage_path, "wb") as f:
            f.write(content)

        file_key = f"raw/{organization_id}/{file_disk_name}"

        # 2. Ingestion pipeline: text extraction, chunking, and embedding generation
        chunks, page_count = await process_document_pipeline(
            file_bytes=content,
            filename=file.filename,
            document_id=doc_id,
            organization_id=organization_id,
            machine_id=effective_machine
        )

        doc_dict = {
            "id": doc_id,
            "organization_id": organization_id,
            "workspace_id": effective_ws,
            "machine_id": effective_machine,
            "title": title or file.filename,
            "file_name": file.filename,
            "file_key": file_key,
            "mime_type": file.content_type or "application/pdf",
            "file_size_bytes": len(content),
            "version": version,
            "status": "ready",
            "page_count": max(page_count, 1),
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        # 3. Store in isolated in-memory custom registry
        custom_document_registry.add_custom_document(effective_ws, doc_dict, chunks)

        # 4. Persist to SQLite database
        try:
            await execute_write(
                """INSERT INTO documents (id, organization_id, workspace_id, machine_id, title, file_name, file_key, mime_type, file_size_bytes, version, status, page_count, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (doc_id, organization_id, effective_ws, effective_machine, doc_dict["title"], doc_dict["file_name"], file_key, doc_dict["mime_type"], doc_dict["file_size_bytes"], version, "ready", doc_dict["page_count"], doc_dict["created_at"])
            )
            for idx, c in enumerate(chunks):
                emb_json = json.dumps(c.get("embedding", []))
                await execute_write(
                    """INSERT INTO document_chunks (id, document_id, organization_id, workspace_id, chunk_index, page_number, section_title, content, embedding, metadata_json, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (str(uuid.uuid4()), doc_id, organization_id, effective_ws, idx, c["page_number"], c.get("section_title"), c["content"], emb_json, json.dumps(c.get("metadata", {})), doc_dict["created_at"])
                )
        except Exception as e:
            pass

        return DocumentResponse(
            id=doc_id,
            organization_id=organization_id,
            machine_id=effective_machine,
            title=doc_dict["title"],
            file_name=doc_dict["file_name"],
            file_key=file_key,
            mime_type=doc_dict["mime_type"],
            file_size_bytes=doc_dict["file_size_bytes"],
            version=version,
            status="ready",
            page_count=doc_dict["page_count"],
            created_at=doc_dict["created_at"]
        )

    async def delete_document(self, document_id: str, workspace_id: Optional[str] = None) -> bool:
        deleted = custom_document_registry.delete_document(document_id, workspace_id)
        try:
            await execute_write("DELETE FROM document_chunks WHERE document_id = ?", (document_id,))
            await execute_write("DELETE FROM documents WHERE id = ?", (document_id,))
            deleted = True
        except Exception:
            pass
        return deleted
