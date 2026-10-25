import hashlib
import numpy as np
from typing import List, Optional
from app.ai.provider_interfaces import LLMProvider, EmbeddingProvider, VisionProvider

class MockAIProvider(LLMProvider, EmbeddingProvider, VisionProvider):
    """
    Deterministic, high-fidelity mock provider supporting multi-LLM,
    multi-language capabilities, and dynamic custom SOP manual grounding.
    """

    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self.model_name = model_name

    def _hash_to_vector(self, text: str, dim: int = 1536) -> List[float]:
        # Generate pseudo-random deterministic vector based on text hash
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        vec = rng.standard_normal(dim)
        # Normalize to unit vector for cosine distance
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_to_vector(t) for t in texts]

    async def embed_query(self, query: str) -> List[float]:
        return self._hash_to_vector(query)

    async def generate_response(
        self,
        prompt: str,
        system_instruction: str,
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> str:
        prompt_lower = prompt.lower()
        sys_lower = system_instruction.lower()

        # Detect language requirement
        is_hindi = "target_locale: hi" in sys_lower or "hindi" in sys_lower
        is_spanish = "target_locale: es" in sys_lower or "español" in sys_lower or "spanish" in sys_lower
        is_german = "target_locale: de" in sys_lower or "deutsch" in sys_lower or "german" in sys_lower
        is_french = "target_locale: fr" in sys_lower or "français" in sys_lower or "french" in sys_lower
        is_japanese = "target_locale: ja" in sys_lower or "日本語" in sys_lower or "japanese" in sys_lower

        # Check if chunks are empty or query is out of domain
        out_of_scope_terms = [
            "cake", "recipe", "bake", "weather", "movie", "song", "joke", "pizza", "football",
            "केक", "रेसिपी", "चॉकलेट", "मौसम", "फिल्म", "गाना", "चुटकुला",
            "receta", "pastel", "gâteau", "kuchen", "wetter", "météo", "tiempo"
        ]
        if "<document_chunk" not in prompt or any(term in prompt_lower for term in out_of_scope_terms):
            if is_hindi:
                return "उपलब्ध दस्तावेज़ों में इस प्रश्न के लिए कोई सत्यापित जानकारी नहीं मिली। कृपया प्लांट इंजीनियर से संपर्क करें।"
            if is_spanish:
                return "La documentación disponible no proporciona procedimientos verificados para esta consulta. Por favor, consulte con la ingeniería de la planta o el manual del fabricante."
            if is_german:
                return "Die verfügbare Dokumentation enthält keine verifizierten Verfahren für diese Anfrage. Bitte wenden Sie sich an die Werksleitung oder das OEM-Handbuch."
            if is_french:
                return "La documentation disponible ne fournit pas de procédures vérifiées pour cette requête. Veuillez consulter l'ingénierie de l'usine ou le manuel OEM."
            if is_japanese:
                return "利用可能なマニュアルには、この問い合わせに対する検証済みの手順が記載されていません。プラント技術担当者に確認してください。"
            return "The available documentation does not provide verified procedures for this query. Please consult plant engineering or refer to the physical OEM manual."

        # Scenario 0: Custom Ingested SOP Manual in the active Workspace!
        if "[custom sop]" in prompt_lower or "<document_chunk id=" in prompt:
            # Check if this prompt includes a custom SOP chunk
            chunks_raw = prompt.split("<document_chunk")
            custom_chunk_found = None
            for ch in chunks_raw[1:]:
                if "custom sop" in ch.lower() or "[custom" in ch.lower():
                    custom_chunk_found = ch
                    break

            if custom_chunk_found:
                title_part = "Custom SOP Manual"
                if 'title="' in custom_chunk_found:
                    title_part = custom_chunk_found.split('title="')[1].split('"')[0]
                page_part = "1"
                if 'page="' in custom_chunk_found:
                    page_part = custom_chunk_found.split('page="')[1].split('"')[0]
                content_text = custom_chunk_found.split(">")[1].split("</document_chunk>")[0].strip()

                if is_hindi:
                    return (
                        f"आपके अपलोड किए गए कस्टम एसओपी ({title_part}, पृष्ठ {page_part}) के अनुसार:\n\n"
                        f"{content_text}\n\n"
                        f"**सुरक्षा चेतावनी**: किसी भी संयंत्र रखरखाव से पहले मानक LOTO और पीपीई प्रोटोकॉल का अनुपालन करें।"
                    )
                if is_spanish:
                    return (
                        f"Según su manual SOP personalizado ({title_part}, Página {page_part}):\n\n"
                        f"Especificación de Torque (patrón de estrella):\n{content_text}\n\n"
                        f"**Seguridad obligatoria**: Asegúrese de aplicar los protocolos LOTO antes de intervenir el equipo."
                    )
                if is_german:
                    return (
                        f"Gemäß Ihrem hochgeladenen SOP-Handbuch ({title_part}, Seite {page_part}):\n\n"
                        f"{content_text}\n\n"
                        f"**Sicherheitshinweis**: Vor Beginn der Arbeiten ist die LOTO-Abschaltung zwingend durchzuführen."
                    )
                if is_french:
                    return (
                        f"Selon votre manuel SOP personnalisé ({title_part}, Page {page_part}) :\n\n"
                        f"{content_text}\n\n"
                        f"**Avertissement de sécurité** : Respectez scrupuleusement la procédure de consignation LOTO avant toute intervention."
                    )
                return (
                    f"According to your uploaded custom SOP ({title_part}, Page {page_part}):\n\n"
                    f"{content_text}\n\n"
                    f"**Safety Requirement**: Strictly execute facility Lockout/Tagout (LOTO) protocols and inspect personal protective gear before executing these steps."
                )

        # Scenario 1: Pump PMP-402 / Torque / Mechanical Seal
        if "torque" in prompt_lower or "pmp-402" in prompt_lower or "mechanical seal" in prompt_lower or "सील" in prompt_lower:
            if is_hindi:
                return (
                    "बॉयलर फीड पंप PMP-402 मानक संचालन प्रक्रिया (SOP) के अनुसार:\n\n"
                    "1. **टॉर्क विनिर्देश (Torque Specification)**: कार्ट्रिज मैकेनिकल सील ग्लैंड बोल्ट को स्टार पैटर्न में बिल्कुल **48 Nm (35.4 ft-lb)** पर टॉर्क किया जाना चाहिए। इससे अधिक टॉर्क देने पर सील फेस विकृत हो जाती है और तत्काल रिसाव होता है।\n"
                    "2. **सील फ्लश तापमान (Plan 23 Flush)**: सुनिश्चित करें कि तापमान **65°C** से अधिक न हो।\n"
                    "3. **सुरक्षा चेतावनी (Mandatory LOTO)**: किसी भी ग्लैंड नट को ढीला करने से पहले सक्शन और डिस्चार्ज वाल्व को पूरी तरह से बंद और लॉकआउट/टैगआउट (LOTO) करें।"
                )
            if is_spanish:
                return (
                    "Según el manual de mantenimiento de la bomba de alimentación PMP-402:\n\n"
                    "1. **Especificación de Torque**: Los pernos del prensaestopas del sello mecánico deben apretarse en patrón de estrella a exactamente **48 Nm (35.4 ft-lb)**. Un torque excesivo deforma la cara del sello provocando fugas inmediatas.\n"
                    "2. **Monitoreo de Enfriamiento (Plan 23)**: Verifique que la temperatura no supere los **65°C**.\n"
                    "3. **ADVERTENCIA DE SEGURIDAD**: Aísle y aplique LOTO a las válvulas de succión y descarga antes de aflojar fijaciones."
                )
            if is_german:
                return (
                    "Gemäß dem Wartungshandbuch der Kesselspeisepumpe PMP-402:\n\n"
                    "1. **Drehmomentspezifikation**: Die Stopfbuchsenschrauben der Gleitringdichtung müssen im Sternmuster auf genau **48 Nm (35,4 ft-lb)** angezogen werden. Ein übermäßiges Drehmoment führt zu Verzug der Dichtfläche und sofortiger Leckage.\n"
                    "2. **Spülplantemperatur (Plan 23)**: Sicherstellen, dass die Temperatur **65°C** nicht überschreitet.\n"
                    "3. **SICHERHEITSHINWEIS**: Vor dem Lösen von Schrauben sind Saug- und Druckarmaturen vollständig abzusperren und nach LOTO zu sichern."
                )
            return (
                "Based on the Boiler Feed Pump PMP-402 Maintenance SOP:\n\n"
                "1. **Torque Specification**: Mechanical seal gland bolts must be torqued in a star pattern to exactly **48 Nm (35.4 ft-lb)**. Exceeding this torque causes seal face distortion and immediate fluid leakage.\n"
                "2. **Seal Flush Monitoring**: Verify that Plan 23 flush temperature remains below **65°C**.\n"
                "3. **SAFETY WARNING**: Suction and discharge isolation valves must be fully locked and tagged out (**LOTO**) and the casing de-pressurized before loosening any gland fasteners."
            )

        # Scenario 2: Spindle Coolant / E-304 Alarm / Temperature
        if "coolant" in prompt_lower or "e-304" in prompt_lower or "temperature" in prompt_lower or "spindle" in prompt_lower or "तापमान" in prompt_lower:
            if is_hindi:
                return (
                    "Okuma MU-5000V कूलिंग डायग्नोस्टिक मैनुअल के अनुसार:\n\n"
                    "अलार्म कोड **E-304** तब ट्रिगर होता है जब स्पिंडल कूलेंट का तापमान 45 सेकंड से अधिक समय तक **88°C** से ऊपर बना रहता है।\n\n"
                    "**जाँच प्रक्रिया**:\n"
                    "1. जांचें कि बाहरी चिल्लर पंखा स्वतंत्र रूप से घूम रहा है और रेडिएटर फिन्स (radiator fins) साफ हैं।\n"
                    "2. कूलेंट प्रवाह दर (circulation flow rate) को **14.5 से 18.0 L/min** के बीच सत्यापित करें।\n"
                    "3. **सावधानी**: अलार्म E-304 सक्रिय रहने पर स्पिंडल को 3000 RPM से ऊपर न चलाएं।"
                )
            if is_spanish:
                return (
                    "Según el manual de diagnóstico de husillo Okuma MU-5000V:\n\n"
                    "El código de alarma **E-304** se activa cuando la temperatura del refrigerante del husillo supera los **88°C** durante más de 45 segundos.\n\n"
                    "**Pasos diagnósticos**:\n"
                    "1. Confirme que el ventilador del enfriador gira libremente y que las aletas del radiador no estén obstruidas.\n"
                    "2. Verifique que el caudal de circulación esté entre **14.5 y 18.0 L/min**.\n"
                    "3. **PRECAUCIÓN**: No opere el husillo a más de 3000 RPM mientras persista la alarma E-304."
                )
            return (
                "According to the Okuma MU-5000V Spindle & Cooling Diagnostic Manual:\n\n"
                "Alarm code **E-304** triggers when refrigerated spindle coolant temperature exceeds **88°C** for more than 45 seconds.\n\n"
                "**Diagnostic Steps**:\n"
                "1. Confirm external chiller fan spins freely and radiator fins are not clogged with metal dust or aerosolized oil.\n"
                "2. Verify coolant circulation flow rate is between **14.5 and 18.0 L/min**.\n"
                "3. Check thermostatic expansion valve bulb contact.\n\n"
                "**WARNING**: Do not operate spindle above 3000 RPM while condition E-304 is active."
            )

        # Scenario 3: Hydraulic Pressure / PRV-102 / Chatter
        if "valve" in prompt_lower or "relief" in prompt_lower or "hydraulic" in prompt_lower or "chatter" in prompt_lower:
            if is_hindi:
                return (
                    "हाइड्रोलिक प्रेस (HYD-PRESS-01) वाल्व निरीक्षण SOP के अनुसार:\n\n"
                    "मुख्य आनुपातिक रिलीफ वाल्व **PRV-102** में कंपन (chatter) पायलट कंट्रोल लाइन में फंसी हवा का संकेत देता है।\n\n"
                    "1. हाई-प्रेशर पायलट सोलेनॉइड को डी-एनर्जाइज करें।\n"
                    "2. पायलट पोर्ट G1/4 से तब तक हवा निकालें जब तक कि बुलबुला-मुक्त ISO VG 46 तेल न बहने लगे।\n"
                    "3. संचायक (accumulator) नाइट्रोजन प्री-चार्ज दबाव को **110 bar (+/- 5 bar)** पर सत्यापित करें।\n\n"
                    "**खतरा (DANGER)**: सिस्टम का कार्य दबाव 315 bar है। दबाव में फिटिंग्स को कभी न कसें।"
                )
            return (
                "According to the 2000-Ton Hydraulic Press Emergency Isolation SOP:\n\n"
                "Chatter at main proportional relief valve **PRV-102** indicates air entrapment in the pilot control line or a worn pilot orifice.\n\n"
                "1. De-energize high-pressure pilot solenoid.\n"
                "2. Bleed pilot port G1/4 using certified bleed nipple until bubble-free ISO VG 46 hydraulic oil flows.\n"
                "3. Verify accumulator nitrogen pre-charge pressure is at **110 bar (+/- 5 bar)** at 20°C ambient.\n\n"
                "**DANGER**: System operating pressure is 315 bar. Never tighten hydraulic fittings while line is pressurized."
            )

        # General Grounded Response fallback using snippet from chunk
        first_chunk = prompt.split("<document_chunk")[1].split("</document_chunk>")[0]
        text_sample = first_chunk.split(">")[1].strip()[:240]
        if is_hindi:
            return f"सत्यापित औद्योगिक रिकॉर्ड के अनुसार:\n\n{text_sample}...\n\n(कृपया कार्य करने से पहले प्लांट सुरक्षा नियमों और LOTO प्रक्रियाओं का पालन करें।)"
        if is_spanish:
            return f"Según la documentación técnica verificada:\n\n{text_sample}...\n\n(Asegúrese de aplicar los protocolos LOTO antes de intervenir el equipo.)"
        return f"Based on the verified documentation:\n\n{text_sample}...\n\n(Ensure Lockout/Tagout procedures are followed before servicing equipment.)"

    async def describe_schematic(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: Optional[str] = None
    ) -> str:
        return (
            "Multimodal schematic analysis: The figure represents an industrial piping and instrumentation diagram (P&ID) "
            "showing a high-pressure centrifugal pump with dual mechanical seals, suction strainers, and Plan 23 seal flush heat exchanger."
        )
