import base64
import re
import time
import uuid
from typing import List, Optional

from app.ai.llm.service import llm_service
from app.ai.llm.types import ChatTurn, LLMRequest
from app.ai.prompts import build_chat_prompt
from app.ai.vision import describe_image
from app.core.config import settings
from app.core.exceptions import InvalidInputError, LLMUnavailableError, NotFoundError
from app.core.security import AuthenticatedUser
from app.db.mongo import CONVERSATIONS, MESSAGES, WORKSPACES, get_db, iso, utcnow
from app.schemas.chat import ChatRequest, ChatResponse, CitationSchema
from app.services.retrieval_service import HybridRetrievalService

CONVERSATION_ID_RE = re.compile(r"^[A-Za-z0-9\-_]{8,64}$")

TECHNICAL_KEYWORDS = {
    "torque", "seal", "pump", "press", "valve", "chiller", "relief", "spindle", "vibration", "bearing",
    "pressure", "overhaul", "inspection", "spec", "specification", "bar", "nm", "rpm", "gland", "strainer",
    "accumulator", "nitrogen", "coolant", "temperature", "temp", "cavitation", "loto", "flow", "schematic",
    "blueprint", "diagram", "code", "alarm", "error", "fault",
    "टॉर्क", "सील", "पंप", "दबाव", "तापमान", "वाल्व", "अलार्म", "कंपन", "मैनुअल", "एसओपी",
}
GREETINGS = {"hi", "hello", "hey", "good morning", "good afternoon", "good evening", "greetings", "help",
             "who are you", "what can you do", "namaste", "namaskar", "kaise ho", "kya haal hai",
             "नमस्ते", "नमस्कार", "हेलो", "हाय", "प्रणाम", "सुप्रभात"}
GREETING_WORDS = {"hi", "hello", "hey", "namaste", "namaskar", "halo", "kaise", "नमस्ते", "नमस्कार", "हेलो", "हाय"}

INSUFFICIENT_MARKERS = [
    "not provide verified procedures",
    "कोई सत्यापित जानकारी नहीं मिली",
    "unavailable in the uploaded",
    "no proporciona procedimientos",
    "keine verifizierten verfahren",
    "ne fournit pas de procédures",
    "検証済みの手順が記載されていません",
]

NO_EVIDENCE = {
    "en": "The available documentation does not provide verified procedures for this query. "
          "Nothing in this workspace's uploaded SOPs or manuals covers it, and in Documents-only mode ForgeWise AI does not answer from general knowledge. "
          "Upload the relevant OEM manual in the SOP Library, switch to General mode, or consult plant engineering.",
    "hi": "उपलब्ध दस्तावेज़ों में इस प्रश्न के लिए कोई सत्यापित जानकारी नहीं मिली। "
          "इस वर्कस्पेस के अपलोड किए गए SOP या मैनुअल में यह जानकारी नहीं है। "
          "कृपया संबंधित OEM मैनुअल SOP लाइब्रेरी में अपलोड करें, जनरल मोड चुनें, या प्लांट इंजीनियरिंग से संपर्क करें।",
    "es": "La documentación disponible no proporciona procedimientos verificados para esta consulta. "
          "Cargue el manual OEM correspondiente, cambie al modo General o consulte con ingeniería de planta.",
    "de": "Die verfügbare Dokumentation enthält keine verifizierten Verfahren für diese Anfrage. "
          "Laden Sie das passende OEM-Handbuch hoch, wechseln Sie in den allgemeinen Modus oder wenden Sie sich an die Werkstechnik.",
}

GREETING_REPLY = {
    "en": "Hello! I am ForgeWise AI, your industrial copilot. I answer from the SOPs and OEM manuals uploaded to this workspace, "
          "with page citations. Ask me about maintenance procedures, torque specifications or alarm diagnostics.",
    "hi": "नमस्ते! मैं ForgeWise AI हूँ, आपका औद्योगिक सहायक। मैं इस वर्कस्पेस में अपलोड किए गए SOP और OEM मैनुअल्स के आधार पर, "
          "पृष्ठ संदर्भों के साथ उत्तर देता हूँ। आप रखरखाव प्रक्रिया, टॉर्क विनिर्देश या अलार्म डायग्नोस्टिक्स के बारे में पूछ सकते हैं।",
    "hinglish": "Hello! Main ForgeWise AI hoon, aapka industrial copilot. Main is workspace ke uploaded manuals aur SOPs se "
                "page citations ke saath jawab deta hoon. Maintenance, torque specs ya error codes ke baare mein poochiye.",
}


def is_greeting(message: str, has_image: bool) -> bool:
    msg = message.strip().lower()
    if has_image or any(kw in msg for kw in TECHNICAL_KEYWORDS):
        return False
    words = set(re.sub(r"[^\w\s]", " ", msg).split())
    return msg.rstrip("!.?") in GREETINGS or (len(words) <= 4 and bool(words & GREETING_WORDS))


def decode_image(data_url: str):
    match = re.match(r"^data:(image/[\w.+-]+);base64,(.+)$", data_url, re.DOTALL)
    if not match:
        raise InvalidInputError("Attached image must be a base64 data URL (PNG, JPEG or WebP).")
    try:
        return match.group(1), base64.b64decode(match.group(2), validate=False)
    except ValueError:
        raise InvalidInputError("Attached image could not be decoded.")


class ChatService:
    def __init__(self) -> None:
        self.retrieval_service = HybridRetrievalService()

    async def _load_or_create_conversation(self, request: ChatRequest, user: AuthenticatedUser) -> dict:
        db = get_db()
        if request.conversation_id:
            if not CONVERSATION_ID_RE.match(request.conversation_id):
                raise InvalidInputError("Invalid conversation id.")
            conv = await db[CONVERSATIONS].find_one({"_id": request.conversation_id})
            if conv is not None:
                if conv["user_id"] != user.user_id or conv["workspace_id"] != user.workspace_id:
                    raise NotFoundError("Conversation not found.")
                return conv
        now = utcnow()
        conv = {
            "_id": request.conversation_id or str(uuid.uuid4()),
            "organization_id": user.organization_id,
            "workspace_id": user.workspace_id,
            "user_id": user.user_id,
            "machine_id": request.machine_id,
            "title": request.message.strip()[:80] or "New conversation",
            "language": request.language,
            "mode": request.mode,
            "message_count": 0,
            "last_model": None,
            "created_at": now,
            "updated_at": now,
        }
        await db[CONVERSATIONS].insert_one(conv)
        return conv

    async def _history(self, conversation_id: str) -> List[ChatTurn]:
        limit = max(0, settings.CHAT_HISTORY_TURNS)
        if not limit:
            return []
        cursor = (
            get_db()[MESSAGES]
            .find({"conversation_id": conversation_id, "status": {"$ne": "failed"}}, {"sender": 1, "content": 1})
            .sort("created_at", -1)
            .limit(limit)
        )
        rows = [r async for r in cursor]
        return [ChatTurn(role="assistant" if r["sender"] == "assistant" else "user", content=r["content"]) for r in reversed(rows)]

    async def _workspace_default_model(self, workspace_id: str) -> Optional[str]:
        ws = await get_db()[WORKSPACES].find_one({"_id": workspace_id}, {"default_model": 1})
        return (ws or {}).get("default_model")

    async def process_chat(self, request: ChatRequest, current_user: AuthenticatedUser) -> ChatResponse:
        started = time.time()
        request_id = f"req-{uuid.uuid4().hex[:12]}"
        db = get_db()
        ws = current_user.workspace_id
        lang = request.language or "en"

        conv = await self._load_or_create_conversation(request, current_user)
        history = await self._history(conv["_id"])

        user_msg_id = str(uuid.uuid4())
        await db[MESSAGES].insert_one({
            "_id": user_msg_id,
            "conversation_id": conv["_id"],
            "organization_id": current_user.organization_id,
            "workspace_id": ws,
            "user_id": current_user.user_id,
            "sender": "user",
            "content": request.message.strip(),
            "has_image": bool(request.image_data),
            "mode": request.mode,
            "created_at": utcnow(),
        })

        async def finish(answer: str, *, grounded: bool, confidence: str, citations: List[CitationSchema],
                         model_used: str, provider: Optional[str] = None, fallback_used: bool = False,
                         degraded: bool = False, attempts: Optional[list] = None) -> ChatResponse:
            elapsed = int((time.time() - started) * 1000)
            msg_id = str(uuid.uuid4())
            now = utcnow()
            await db[MESSAGES].insert_one({
                "_id": msg_id,
                "conversation_id": conv["_id"],
                "organization_id": current_user.organization_id,
                "workspace_id": ws,
                "user_id": current_user.user_id,
                "sender": "assistant",
                "content": answer,
                "groundedness_status": confidence,
                "grounded": grounded,
                "citations": [c.model_dump() for c in citations],
                "model_used": model_used,
                "provider": provider,
                "fallback_used": fallback_used,
                "degraded": degraded,
                "attempts": attempts or [],
                "latency_ms": elapsed,
                "machine_id": request.machine_id,
                "created_at": now,
            })
            await db[CONVERSATIONS].update_one(
                {"_id": conv["_id"]},
                {"$set": {"updated_at": now, "last_model": model_used, "mode": request.mode},
                 "$inc": {"message_count": 2}},
            )
            return ChatResponse(
                answer=answer, language=lang, conversation_id=conv["_id"], request_id=request_id,
                grounded=grounded, confidence_status=confidence, citations=citations, model_used=model_used,
                provider=provider, fallback_used=fallback_used, degraded=degraded, attempts=attempts or [],
                latency_ms=elapsed, workspace_id=ws, message_id=msg_id, user_message_id=user_msg_id,
            )

        # Conversational greeting in Documents-only mode: answered locally, no LLM call.
        if request.mode == "grounded" and is_greeting(request.message, bool(request.image_data)):
            msg = request.message.lower()
            key = "hi" if lang == "hi" or re.search(r"[ऀ-ॿ]", msg) else (
                "hinglish" if any(w in msg for w in ("kaise", "haal", "namaste")) else "en")
            return await finish(GREETING_REPLY[key], grounded=True, confidence="supported", citations=[],
                                model_used="forgewise-greeting", provider="local")

        chunks = await self.retrieval_service.retrieve_chunks(
            query=request.message,
            organization_id=current_user.organization_id,
            machine_id=request.machine_id,
            workspace_id=ws,
            top_k=4,
        )

        if request.mode == "grounded" and not chunks and not request.image_data:
            return await finish(NO_EVIDENCE.get(lang, NO_EVIDENCE["en"]), grounded=False,
                                confidence="insufficient_evidence", citations=[], model_used="retrieval-only",
                                provider="local")

        image_note = ""
        if request.image_data:
            mime, raw = decode_image(request.image_data)
            image_note = await describe_image(raw, mime) or (
                "An image was attached, but no vision provider is configured (VISION_PROVIDER), so it was not analysed."
            )

        system, prompt = build_chat_prompt(
            query=request.message.strip(), context_chunks=chunks, language=lang,
            mode=request.mode, voice=request.voice, image_note=image_note,
        )
        preferred = request.model or await self._workspace_default_model(ws)
        if not request.model and request.provider:
            from app.ai.llm.catalog import default_model_for
            info = default_model_for("anthropic" if request.provider == "claude" else request.provider)
            preferred = info.id if info else preferred

        try:
            result = await llm_service.generate(
                LLMRequest(
                    system=system,
                    messages=history + [ChatTurn(role="user", content=prompt)],
                    temperature=0.1 if request.mode == "grounded" else 0.4,
                    max_tokens=min(settings.AI_MAX_OUTPUT_TOKENS, 700 if request.voice else settings.AI_MAX_OUTPUT_TOKENS),
                    context_chunks=chunks,
                    language=lang,
                ),
                preferred_model=preferred,
                allow_fallback=request.allow_fallback,
            )
        except LLMUnavailableError as err:
            # Keep the question in history (marked failed so it is not replayed as context)
            # and tell the client which conversation to retry in.
            await db[MESSAGES].update_one({"_id": user_msg_id}, {"$set": {"status": "failed"}})
            await db[CONVERSATIONS].update_one(
                {"_id": conv["_id"]}, {"$set": {"updated_at": utcnow()}, "$inc": {"message_count": 1}}
            )
            err.detail["details"]["conversation_id"] = conv["_id"]
            raise

        answer = result.text
        insufficient = any(marker in answer.lower() for marker in INSUFFICIENT_MARKERS)
        grounded = bool(chunks) and not insufficient
        if grounded:
            confidence = "supported"
        elif request.mode == "general":
            confidence = "general"
        else:
            confidence = "insufficient_evidence"

        citations = []
        if grounded:
            for c in chunks:
                content = c.get("content", "")
                citations.append(CitationSchema(
                    citation_id=f"cit-{uuid.uuid4().hex[:8]}",
                    document_id=c["document_id"],
                    document_title=c.get("document_title", "Document"),
                    page_number=c.get("page_number", 1),
                    section_title=c.get("section_title"),
                    excerpt=content[:280] + ("..." if len(content) > 280 else ""),
                    relevance_score=c.get("relevance_score", 1.0),
                ))

        return await finish(
            answer, grounded=grounded, confidence=confidence, citations=citations,
            model_used=result.model_id, provider=result.provider, fallback_used=result.fallback_used,
            degraded=result.degraded, attempts=[a.to_dict() for a in result.attempts],
        )

    # ---------- history ----------
    async def list_conversations(self, user: AuthenticatedUser, limit: int = 50) -> List[dict]:
        cursor = (
            get_db()[CONVERSATIONS]
            .find({"user_id": user.user_id, "workspace_id": user.workspace_id})
            .sort("updated_at", -1)
            .limit(max(1, min(limit, 200)))
        )
        return [self._summary(c) async for c in cursor]

    def _summary(self, c: dict) -> dict:
        return {
            "id": c["_id"],
            "title": c.get("title", "Conversation"),
            "machine_id": c.get("machine_id"),
            "language": c.get("language", "en"),
            "mode": c.get("mode", "grounded"),
            "message_count": c.get("message_count", 0),
            "last_model": c.get("last_model"),
            "created_at": iso(c.get("created_at")),
            "updated_at": iso(c.get("updated_at") or c.get("created_at")),
        }

    async def get_conversation(self, user: AuthenticatedUser, conversation_id: str) -> dict:
        db = get_db()
        conv = await db[CONVERSATIONS].find_one(
            {"_id": conversation_id, "user_id": user.user_id, "workspace_id": user.workspace_id}
        )
        if conv is None:
            raise NotFoundError("Conversation not found.")
        messages = [
            {
                "id": m["_id"],
                "sender": m["sender"],
                "content": m["content"],
                "groundedness_status": m.get("groundedness_status"),
                "citations": m.get("citations", []),
                "model_used": m.get("model_used"),
                "provider": m.get("provider"),
                "fallback_used": m.get("fallback_used", False),
                "latency_ms": m.get("latency_ms"),
                "feedback": m.get("feedback"),
                "created_at": iso(m.get("created_at")),
            }
            async for m in db[MESSAGES].find({"conversation_id": conversation_id}).sort("created_at", 1)
        ]
        return {**self._summary(conv), "messages": messages}

    async def delete_conversation(self, user: AuthenticatedUser, conversation_id: str) -> None:
        db = get_db()
        result = await db[CONVERSATIONS].delete_one(
            {"_id": conversation_id, "user_id": user.user_id, "workspace_id": user.workspace_id}
        )
        if result.deleted_count == 0:
            raise NotFoundError("Conversation not found.")
        await db[MESSAGES].delete_many({"conversation_id": conversation_id})
