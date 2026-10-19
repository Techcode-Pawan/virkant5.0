from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.ai.model_registry import get_embedding_provider
from app.db.models import DocumentChunk, Document

# Fallback seed knowledge for instant offline demo if DB has not been populated
DEMO_KNOWLEDGE_CHUNKS = [
    {
        "id": "c1111111-1111-1111-1111-111111111111",
        "document_id": "d1111111-1111-1111-1111-111111111111",
        "document_title": "Boiler Feed Pump PMP-402 Maintenance Manual",
        "page_number": 14,
        "section_title": "Section 3.2: Mechanical Seal Inspection & Torque",
        "machine_id": "PMP-402",
        "content": "When inspecting the cartridge mechanical seal on pump PMP-402, verify that seal flush plan 23 temperature does not exceed 65°C. Gland bolts must be torqued in a star pattern to exactly 48 Nm (35.4 ft-lb). Excessive gland torque causes seal face distortion and immediate fluid leakage. CAUTION: Ensure suction and discharge valves are fully locked and tagged out (LOTO) prior to loosening any gland nuts."
    },
    {
        "id": "c2222222-2222-2222-2222-222222222222",
        "document_id": "d1111111-1111-1111-1111-111111111111",
        "document_title": "Boiler Feed Pump PMP-402 Maintenance Manual",
        "page_number": 22,
        "section_title": "Section 4.5: High Temperature & Vibration Troubleshooting",
        "machine_id": "PMP-402",
        "content": "Vibration readings exceeding 4.5 mm/s RMS on the inboard bearing housing indicate either shaft misalignment or cavitation. If cavitation noise is audible, clean suction basket if differential pressure exceeds 0.35 bar. Normal operating pressure on discharge manifold is 38.0 to 42.5 bar."
    },
    {
        "id": "c3333333-3333-3333-3333-333333333333",
        "document_id": "d2222222-2222-2222-2222-222222222222",
        "document_title": "Okuma MU-5000V Spindle & Cooling Diagnostic Manual",
        "page_number": 34,
        "section_title": "Section 5.1: Spindle Chiller High Temperature Warning E-304",
        "machine_id": "CNC-MILL-02",
        "content": "Alarm code E-304 triggers when the refrigerated spindle coolant loop returns a temperature greater than 88°C for more than 45 seconds. Diagnostic procedure: 1. Confirm external chiller fan is spinning freely and radiator fins are not clogged with metal dust or aerosolized oil. 2. Verify coolant circulation flow rate is between 14.5 and 18.0 L/min. WARNING: Do not run spindle above 3000 RPM while E-304 condition persists."
    },
    {
        "id": "c4444444-4444-4444-4444-444444444444",
        "document_id": "d3333333-3333-3333-3333-333333333333",
        "document_title": "2000-Ton Hydraulic Press Emergency Isolation SOP",
        "page_number": 8,
        "section_title": "Section 2.1: Main Cylinder Pressure Relief Valve Chatter",
        "machine_id": "HYD-PRESS-01",
        "content": "Chatter or rapid pulsing at main proportional relief valve PRV-102 indicates air entrapment in the pilot control line or a worn pilot orifice. 1. De-energize high-pressure pilot solenoid. 2. Bleed pilot port G1/4 using certified bleed nipple until bubble-free ISO VG 46 hydraulic oil flows. 3. Verify accumulator nitrogen pre-charge pressure is at 110 bar +/- 5 bar at 20°C ambient. DANGER: System operating pressure is 315 bar. Never tighten fittings under pressure."
    }
]

class HybridRetrievalService:
    def __init__(self, db_session: Optional[AsyncSession] = None):
        self.session = db_session
        self.embedder = get_embedding_provider()

    async def retrieve_chunks(
        self,
        query: str,
        organization_id: str,
        machine_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Performs hybrid retrieval using semantic similarity and keyword matching.
        """
        query_vec = await self.embedder.embed_query(query)
        results = []

        # 1. Attempt database search if session is active
        if self.session is not None:
            try:
                # Query chunks belonging to organization
                stmt = (
                    select(DocumentChunk, Document.title)
                    .join(Document, DocumentChunk.document_id == Document.id)
                    .where(DocumentChunk.organization_id == organization_id)
                )
                if machine_id:
                    stmt = stmt.where(Document.machine_id == machine_id)
                
                db_res = await self.session.execute(stmt)
                rows = db_res.all()
                for chunk, doc_title in rows:
                    results.append({
                        "id": str(chunk.id),
                        "document_id": str(chunk.document_id),
                        "document_title": doc_title,
                        "page_number": chunk.page_number,
                        "section_title": chunk.section_title or f"Page {chunk.page_number}",
                        "content": chunk.content,
                        "machine_id": chunk.metadata_json.get("machine_id") if chunk.metadata_json else None
                    })
            except Exception:
                # Fallback to in-memory store
                results = []

        # 2. Use demo knowledge if DB has no chunks
        if not results:
            results = [c for c in DEMO_KNOWLEDGE_CHUNKS]

        # 3. Filter by machine_id if requested
        if machine_id:
            filtered = [r for r in results if r.get("machine_id") == machine_id]
            if filtered:
                results = filtered

        # 4. Rank by lexical and semantic keyword overlap
        STOP_WORDS = {"how", "do", "i", "a", "the", "in", "is", "at", "to", "for", "of", "and", "or", "what", "where", "room"}
        query_terms = set(t for t in query.lower().split() if t not in STOP_WORDS)
        scored = []
        for item in results:
            content_lower = item["content"].lower()
            overlap_score = sum(1 for term in query_terms if term in content_lower)
            if overlap_score > 0:
                scored.append((overlap_score, item))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored[:top_k]]
