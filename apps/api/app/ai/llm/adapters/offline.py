"""
Offline extractive mode.

Used only when no language model is reachable. It never generates or
paraphrases content: it quotes the retrieved document excerpts verbatim with
their source, so operators still get the exact SOP text instead of nothing.
"""
from app.ai.llm.adapters.base import ProviderAdapter
from app.ai.llm.errors import ProviderError
from app.ai.llm.types import LLMRequest

HEADERS = {
    "en": "No language model is available right now, so these are the most relevant passages from your documents, quoted verbatim:",
    "hi": "इस समय कोई भाषा मॉडल उपलब्ध नहीं है, इसलिए आपके दस्तावेज़ों के सबसे प्रासंगिक अंश ज्यों-के-त्यों नीचे दिए गए हैं:",
    "es": "No hay ningún modelo de lenguaje disponible; estos son los pasajes más relevantes de sus documentos, citados textualmente:",
    "de": "Derzeit ist kein Sprachmodell verfügbar. Hier sind die relevantesten Passagen aus Ihren Dokumenten im Wortlaut:",
    "fr": "Aucun modèle de langage n'est disponible ; voici les passages les plus pertinents de vos documents, cités mot pour mot :",
    "ja": "現在利用できる言語モデルがないため、ドキュメントから最も関連性の高い箇所をそのまま引用します：",
}
FOOTERS = {
    "en": "Verify against the source document and follow site LOTO/PPE rules before acting.",
    "hi": "कार्य करने से पहले मूल दस्तावेज़ से सत्यापित करें और LOTO/PPE नियमों का पालन करें।",
    "es": "Verifique con el documento original y siga las normas LOTO/EPP antes de actuar.",
    "de": "Vor dem Handeln mit dem Originaldokument abgleichen und LOTO/PSA-Regeln befolgen.",
    "fr": "Vérifiez avec le document source et respectez les règles LOTO/EPI avant d'agir.",
    "ja": "作業前に原本で確認し、LOTO/PPE の規則に従ってください。",
}


class OfflineExtractiveAdapter(ProviderAdapter):
    name = "offline"
    label = "Offline extractive"
    requires_key = False

    def is_configured(self) -> bool:
        return True

    async def generate(self, request: LLMRequest, model: str, timeout: float) -> str:
        if not request.context_chunks:
            raise ProviderError(
                "unavailable",
                "Offline mode can only quote uploaded documents and none matched this question.",
                retryable=False,
            )
        lang = request.language if request.language in HEADERS else "en"
        lines = [HEADERS[lang], ""]
        for chunk in request.context_chunks[:3]:
            title = chunk.get("document_title", "Document")
            page = chunk.get("page_number", 1)
            excerpt = (chunk.get("content") or "").strip()
            if len(excerpt) > 700:
                excerpt = excerpt[:700].rsplit(" ", 1)[0] + " …"
            lines.extend(f"> {line}" for line in excerpt.splitlines() if line.strip())
            lines.append(f"— {title}, p. {page}")
            lines.append("")
        lines.append(FOOTERS[lang])
        return "\n".join(lines)

    async def health_check(self, timeout: float = 10.0) -> None:
        return None
