import hashlib
import numpy as np
from typing import List, Optional
from app.ai.provider_interfaces import LLMProvider, EmbeddingProvider, VisionProvider

class MockAIProvider(LLMProvider, EmbeddingProvider, VisionProvider):
    """
    Deterministic, high-fidelity mock provider for offline testing,
    continuous integration, and fresh zero-key deployment.
    """

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
        is_hindi = "हिंदी" in system_instruction or "language requirement:\nrespond in natural, technically accurate hindi" in system_instruction.lower()

        # Check if chunks are empty or no relevant match
        out_of_scope_terms = ["cake", "recipe", "bake", "weather", "movie", "song", "joke"]
        if "<document_chunk" not in prompt or any(term in prompt_lower for term in out_of_scope_terms):
            if is_hindi:
                return "उपलब्ध दस्तावेज़ों में इस प्रश्न के लिए कोई सत्यापित जानकारी नहीं मिली। कृपया प्लांट इंजीनियर से संपर्क करें।"
            return "The available documentation does not provide verified procedures for this query. Please consult plant engineering or refer to the physical OEM manual."

        # Scenario 1: Pump PMP-402 / Torque / Mechanical Seal
        if "torque" in prompt_lower or "pmp-402" in prompt_lower or "mechanical seal" in prompt_lower or "सील" in prompt_lower:
            if is_hindi:
                return (
                    "बॉयलर फीड पंप PMP-402 मानक संचालन प्रक्रिया (SOP) के अनुसार:\n\n"
                    "1. **टॉर्क विनिर्देश (Torque Specification)**: कार्ट्रिज मैकेनिकल सील ग्लैंड बोल्ट को स्टार पैटर्न में बिल्कुल **48 Nm (35.4 ft-lb)** पर टॉर्क किया जाना चाहिए। इससे अधिक टॉर्क देने पर सील फेस विकृत हो जाती है और तत्काल रिसाव होता है।\n"
                    "2. **सील फ्लश तापमान (Plan 23 Flush)**: सुनिश्चित करें कि तापमान **65°C** से अधिक न हो।\n"
                    "3. **सुरक्षा चेतावनी (Mandatory LOTO)**: किसी भी ग्लैंड नट को ढीला करने से पहले सक्शन और डिस्चार्ज वाल्व को पूरी तरह से बंद और लॉकआउट/टैगआउट (LOTO) करें।"
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
        text_sample = first_chunk.split(">")[1].strip()[:200]
        if is_hindi:
            return f"सत्यापित औद्योगिक रिकॉर्ड के अनुसार:\n\n{text_sample}...\n\n(कृपया कार्य करने से पहले प्लांट सुरक्षा नियमों और LOTO प्रक्रियाओं का पालन करें।)"
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
