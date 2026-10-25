import os
import re
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import UploadFile
from pymongo.errors import PyMongoError

from app.core.config import settings
from app.core.exceptions import DocumentValidationError, NotFoundError
from app.core.logging import app_logger
from app.db.mongo import CHUNKS, DOCUMENTS, get_db, iso, utcnow
from app.ingestion.pipeline import process_document_pipeline
from app.schemas.documents import DocumentResponse

API_ROOT = Path(__file__).resolve().parents[2]


def storage_root() -> Path:
    root = Path(settings.STORAGE_DIR)
    return root if root.is_absolute() else API_ROOT / root


def safe_filename(name: Optional[str]) -> str:
    """Strips directories and unsafe characters so uploads cannot escape the storage folder."""
    base = os.path.basename((name or "upload").replace("\\", "/"))
    base = re.sub(r"[^\w.\- ]", "_", base, flags=re.UNICODE).strip(" .")
    return (base or "upload")[:150]


def to_response(d: dict) -> DocumentResponse:
    return DocumentResponse(
        id=d["_id"],
        organization_id=d["organization_id"],
        machine_id=d.get("machine_id"),
        title=d["title"],
        file_name=d["file_name"],
        file_key=d.get("file_key", ""),
        mime_type=d.get("mime_type", "application/octet-stream"),
        file_size_bytes=d.get("file_size_bytes", 0),
        version=d.get("version", "1.0"),
        status=d.get("status", "ready"),
        page_count=d.get("page_count", 1),
        chunk_count=d.get("chunk_count", 0),
        error_message=d.get("error_message"),
        created_at=iso(d.get("created_at")),
    )


class DocumentService:
    async def list_documents(
        self, organization_id: str, workspace_id: str, machine_id: Optional[str] = None
    ) -> List[DocumentResponse]:
        query = {"organization_id": organization_id, "workspace_id": workspace_id}
        if machine_id:
            query["$or"] = [{"machine_id": machine_id}, {"machine_id": None}]
        cursor = get_db()[DOCUMENTS].find(query).sort("created_at", -1)
        return [to_response(d) async for d in cursor]

    async def get_document(self, document_id: str, workspace_id: str) -> dict:
        doc = await get_db()[DOCUMENTS].find_one({"_id": document_id, "workspace_id": workspace_id})
        if doc is None:
            raise NotFoundError("Document not found in this workspace.")
        return doc

    async def upload_document(
        self,
        file: UploadFile,
        title: str,
        organization_id: str,
        workspace_id: str,
        machine_id: Optional[str] = None,
        version: str = "1.0",
    ) -> DocumentResponse:
        content = await file.read(settings.MAX_UPLOAD_SIZE_BYTES + 1)
        if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise DocumentValidationError(
                f"File exceeds the maximum upload size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB."
            )
        if not content:
            raise DocumentValidationError("The uploaded file is empty.")

        doc_id = str(uuid.uuid4())
        effective_machine = machine_id.strip() if machine_id and machine_id.strip() else None
        filename = safe_filename(file.filename)

        # Validate + extract before writing anything, so invalid files leave no trace.
        chunks, page_count = await process_document_pipeline(
            file_bytes=content,
            filename=filename,
            document_id=doc_id,
            organization_id=organization_id,
            machine_id=effective_machine,
        )

        storage_dir = storage_root() / "raw" / safe_filename(organization_id)
        storage_dir.mkdir(parents=True, exist_ok=True)
        disk_name = f"{doc_id}_{filename}"
        storage_path = storage_dir / disk_name
        storage_path.write_bytes(content)

        now = utcnow()
        doc = {
            "_id": doc_id,
            "organization_id": organization_id,
            "workspace_id": workspace_id,
            "machine_id": effective_machine,
            "title": (title or filename).strip()[:200],
            "file_name": filename,
            "file_key": f"raw/{safe_filename(organization_id)}/{disk_name}",
            "mime_type": file.content_type or "application/octet-stream",
            "file_size_bytes": len(content),
            "version": version,
            "status": "ready" if chunks else "failed",
            "page_count": max(page_count, 1),
            "chunk_count": len(chunks),
            "error_message": None if chunks else "No extractable text was found (scanned PDF or image without OCR).",
            "created_at": now,
        }
        db = get_db()
        try:
            await db[DOCUMENTS].insert_one(doc)
            if chunks:
                await db[CHUNKS].insert_many([
                    {
                        "_id": str(uuid.uuid4()),
                        "document_id": doc_id,
                        "organization_id": organization_id,
                        "workspace_id": workspace_id,
                        "chunk_index": idx,
                        "page_number": c["page_number"],
                        "section_title": c.get("section_title"),
                        "content": c["content"],
                        "embedding": c.get("embedding"),
                        "embedding_model": c.get("embedding_model"),
                        "created_at": now,
                    }
                    for idx, c in enumerate(chunks)
                ], ordered=False)
        except PyMongoError:
            # Roll back partial writes and the stored file, then surface the error (→ 503/500).
            try:
                await db[CHUNKS].delete_many({"document_id": doc_id})
                await db[DOCUMENTS].delete_one({"_id": doc_id})
            except PyMongoError:
                pass
            storage_path.unlink(missing_ok=True)
            raise
        return to_response(doc)

    async def delete_document(self, document_id: str, workspace_id: str) -> None:
        db = get_db()
        doc = await self.get_document(document_id, workspace_id)
        await db[CHUNKS].delete_many({"document_id": document_id})
        await db[DOCUMENTS].delete_one({"_id": document_id, "workspace_id": workspace_id})
        path = self.file_path(doc)
        try:
            path.unlink(missing_ok=True)
        except OSError as exc:
            app_logger.warning(f"Could not remove stored file for {document_id}: {exc}")

    def file_path(self, doc: dict) -> Path:
        root = storage_root().resolve()
        path = (root / doc.get("file_key", "")).resolve()
        if root not in path.parents:
            raise NotFoundError("Stored file not found.")
        return path

    async def get_chunks(self, document_id: str, workspace_id: str) -> List[dict]:
        await self.get_document(document_id, workspace_id)
        cursor = get_db()[CHUNKS].find(
            {"document_id": document_id, "workspace_id": workspace_id},
            {"embedding": 0},
        ).sort("chunk_index", 1)
        return [
            {
                "id": c["_id"],
                "document_id": c["document_id"],
                "chunk_index": c.get("chunk_index", 0),
                "page_number": c.get("page_number", 1),
                "section_title": c.get("section_title"),
                "content": c.get("content", ""),
                "embedding_model": c.get("embedding_model"),
            }
            async for c in cursor
        ]
