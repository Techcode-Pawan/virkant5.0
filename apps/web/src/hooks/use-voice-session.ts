"use client";

/**
 * Hands-free voice session built on the browser Web Speech API.
 *
 * Why the previous hook "turned off too quickly":
 *  - recognition.continuous was false, so Chrome ended the session after one phrase;
 *  - nothing restarted it on `onend`, and the `no-speech` error (fired after a few seconds
 *    of silence) ended the session for good;
 *  - a new recogniser was created on every locale change without aborting the old one,
 *    and nothing was cleaned up on unmount (duplicate listeners, orphaned sessions);
 *  - the chat page decided whether to speak the reply from a stale `isRecording` flag,
 *    which was always false by the time the answer arrived.
 *
 * This hook keeps one recogniser per mount, restarts it whenever the browser ends a
 * session while the user still wants to listen, only gives up on genuine errors
 * (permission denied, no microphone, repeated rapid failures), detects the end of an
 * utterance with a configurable silence window, and pauses recognition while the
 * answer is spoken (unless barge-in is enabled) so the assistant doesn't hear itself.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState =
  | "unsupported"
  | "idle"
  | "requesting-permission"
  | "listening"
  | "processing"
  | "speaking"
  | "reconnecting"
  | "error";

export interface VoiceSettings {
  /** Pause after speech (ms) that ends one utterance and sends it. */
  silenceMs: number;
  /** Stop the whole session after this much inactivity (ms). 0 = never. */
  idleTimeoutMs: number;
  /** Keep listening while the answer is spoken so the user can talk over it. */
  bargeIn: boolean;
  /** Read answers aloud. */
  autoSpeak: boolean;
  rate: number;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  silenceMs: 1400,
  idleTimeoutMs: 0,
  bargeIn: false,
  autoSpeak: true,
  rate: 1,
};

const SETTINGS_KEY = "forgewise_voice_settings";

export function loadVoiceSettings(): VoiceSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) } : DEFAULT_VOICE_SETTINGS;
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

export function saveVoiceSettings(settings: VoiceSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

const SPEECH_LANG: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  es: "es-ES",
  de: "de-DE",
  fr: "fr-FR",
  ja: "ja-JP",
};

const MAX_RAPID_FAILURES = 6;

export interface UtteranceContext {
  signal: AbortSignal;
}

interface UseVoiceSessionOptions {
  lang: string;
  /** Called with each finished utterance. Return text to speak, or null. Throw to report an error. */
  onUtterance: (text: string, ctx: UtteranceContext) => Promise<string | null>;
  settings?: Partial<VoiceSettings>;
}

function getRecognitionCtor(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/** Strips markdown/citations so TTS reads natural sentences. */
export function speakableText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[(?:c\d+|[^\]]*p\.\s*\d+[^\]]*)\]/gi, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/[*_`~|]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitForSpeech(text: string, max = 220): string[] {
  // Split after sentence punctuation followed by whitespace, so "3.2" or "1.5 bar" stay intact.
  const sentences = text.split(/(?<=[.!?।。])\s+/).map((s) => `${s} `);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > max && current) {
      chunks.push(current.trim());
      current = "";
    }
    if (s.length > max) {
      for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max).trim());
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

export function useVoiceSession({ lang, onUtterance, settings: settingsOverride }: UseVoiceSessionOptions) {
  const [state, setStateValue] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [lastUtterance, setLastUtterance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  const stateRef = useRef<VoiceState>("idle");
  const recognitionRef = useRef<any>(null);
  const runningRef = useRef(false);
  const activeRef = useRef(false);
  const wantListeningRef = useRef(false);
  const permissionGrantedRef = useRef(false);
  const startedAtRef = useRef(0);
  const rapidFailuresRef = useRef(0);
  const networkFailureRef = useRef(false);
  const finalBufferRef = useRef("");
  const interimRef = useRef("");
  const ttsGenRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);
  const timers = useRef<{ restart?: number; silence?: number; idle?: number; keepAlive?: number }>({});
  const langRef = useRef(lang);
  const onUtteranceRef = useRef(onUtterance);
  const settingsRef = useRef<VoiceSettings>({ ...DEFAULT_VOICE_SETTINGS, ...settingsOverride });

  onUtteranceRef.current = onUtterance;
  settingsRef.current = { ...DEFAULT_VOICE_SETTINGS, ...settingsOverride };

  const setState = useCallback((next: VoiceState) => {
    stateRef.current = next;
    setStateValue(next);
  }, []);

  const clearTimer = (name: keyof typeof timers.current) => {
    const id = timers.current[name];
    if (id !== undefined) {
      window.clearTimeout(id);
      window.clearInterval(id);
      timers.current[name] = undefined;
    }
  };

  // ---------------- recognition control ----------------
  const startRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || runningRef.current || !wantListeningRef.current) return;
    try {
      rec.lang = SPEECH_LANG[langRef.current] || langRef.current || "en-US";
      startedAtRef.current = Date.now();
      rec.start();
      runningRef.current = true;
    } catch (err: any) {
      // InvalidStateError: already started (duplicate start) — harmless.
      if (err?.name !== "InvalidStateError") {
        runningRef.current = false;
      }
    }
  }, []);

  const pauseRecognition = useCallback(() => {
    wantListeningRef.current = false;
    clearTimer("restart");
    clearTimer("silence");
    const rec = recognitionRef.current;
    if (rec && runningRef.current) {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearTimer("idle");
    const { idleTimeoutMs } = settingsRef.current;
    if (idleTimeoutMs > 0 && activeRef.current) {
      timers.current.idle = window.setTimeout(() => {
        stopRef.current?.(`Voice session ended after ${Math.round(idleTimeoutMs / 60000)} min without speech.`);
      }, idleTimeoutMs);
    }
  }, []);

  const resumeListening = useCallback(() => {
    if (!activeRef.current) {
      setState(recognitionRef.current ? "idle" : "unsupported");
      return;
    }
    finalBufferRef.current = "";
    interimRef.current = "";
    setInterim("");
    wantListeningRef.current = true;
    setState("listening");
    resetIdleTimer();
    startRecognition();
  }, [resetIdleTimer, setState, startRecognition]);

  // ---------------- speech synthesis ----------------
  const cancelSpeech = useCallback(() => {
    ttsGenRef.current += 1;
    clearTimer("keepAlive");
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> =>
      new Promise((resolve) => {
        const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
        const clean = speakableText(text);
        if (!synth || !clean) {
          resolve();
          return;
        }
        cancelSpeech();
        const gen = ttsGenRef.current;
        const parts = splitForSpeech(clean);
        const bcp47 = SPEECH_LANG[langRef.current] || "en-US";
        const voices = synth.getVoices();
        const voice =
          voices.find((v) => v.lang === bcp47) || voices.find((v) => v.lang?.startsWith(bcp47.slice(0, 2))) || null;

        setState("speaking");
        if (settingsRef.current.bargeIn && activeRef.current) {
          wantListeningRef.current = true;
          startRecognition();
        } else {
          pauseRecognition();
        }
        // Chrome can silently pause long synthesis; resume() is a harmless keep-alive.
        timers.current.keepAlive = window.setInterval(() => {
          if (synth.speaking && !synth.paused) synth.resume();
        }, 5000);

        let index = 0;
        const next = () => {
          if (gen !== ttsGenRef.current) return resolve(); // cancelled / superseded
          if (index >= parts.length) {
            clearTimer("keepAlive");
            return resolve();
          }
          const utterance = new SpeechSynthesisUtterance(parts[index++]);
          utterance.lang = bcp47;
          utterance.rate = settingsRef.current.rate;
          if (voice) utterance.voice = voice;
          // Fallback in case a browser never fires onend for an utterance.
          const guard = window.setTimeout(next, utterance.text.length * 90 + 4000);
          utterance.onend = () => {
            window.clearTimeout(guard);
            next();
          };
          utterance.onerror = () => {
            window.clearTimeout(guard);
            next();
          };
          synth.speak(utterance);
        };
        next();
      }),
    [cancelSpeech, pauseRecognition, setState, startRecognition],
  );

  // ---------------- utterance processing ----------------
  const processUtterance = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setLastUtterance(trimmed);
      setInterim("");
      if (!settingsRef.current.bargeIn) pauseRecognition();
      setState("processing");
      setError(null);
      requestAbortRef.current?.abort();
      const controller = new AbortController();
      requestAbortRef.current = controller;
      try {
        const reply = await onUtteranceRef.current(trimmed, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (reply && settingsRef.current.autoSpeak) {
          const gen = ttsGenRef.current + 1;
          await speak(reply);
          if (gen !== ttsGenRef.current) return; // interrupted: interrupt() already resumed
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setError(err?.message || "The request failed. Please try again.");
      } finally {
        if (requestAbortRef.current === controller) requestAbortRef.current = null;
      }
      if (activeRef.current) resumeListening();
      else setState(recognitionRef.current ? "idle" : "unsupported");
    },
    [pauseRecognition, resumeListening, setState, speak],
  );

  const commitUtterance = useCallback(() => {
    clearTimer("silence");
    const text = `${finalBufferRef.current} ${interimRef.current}`.trim();
    finalBufferRef.current = "";
    interimRef.current = "";
    if (!text || stateRef.current !== "listening") return;
    void processUtterance(text);
  }, [processUtterance]);

  // ---------------- session control ----------------
  const stopRef = useRef<((message?: string) => void) | null>(null);

  const stop = useCallback(
    (message?: string) => {
      activeRef.current = false;
      setSessionActive(false);
      wantListeningRef.current = false;
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
      ["restart", "silence", "idle"].forEach((t) => clearTimer(t as any));
      cancelSpeech();
      pauseRecognition();
      finalBufferRef.current = "";
      interimRef.current = "";
      setInterim("");
      setNotice(message ?? null);
      setState(recognitionRef.current ? "idle" : "unsupported");
    },
    [cancelSpeech, pauseRecognition, setState],
  );
  stopRef.current = stop;

  const fail = useCallback(
    (message: string) => {
      stop();
      setError(message);
      setState("error");
    },
    [setState, stop],
  );

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    if (permissionGrantedRef.current) return true;
    if (!window.isSecureContext) {
      fail("Voice input needs a secure page (https:// or localhost).");
      return false;
    }
    try {
      const status = await (navigator.permissions as any)?.query({ name: "microphone" });
      if (status?.state === "granted") {
        permissionGrantedRef.current = true;
        return true;
      }
      if (status?.state === "denied") {
        fail("Microphone access is blocked. Allow it in the browser's site settings, or type your question instead.");
        return false;
      }
    } catch {
      /* Permissions API not available for microphone (e.g. Firefox/Safari) */
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      // Let the recogniser prompt by itself.
      return true;
    }
    setState("requesting-permission");
    try {
      // Ask once; release the stream immediately — the recogniser captures audio itself.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.getTracks().forEach((t) => t.stop());
      permissionGrantedRef.current = true;
      return true;
    } catch (err: any) {
      if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        fail("No microphone was found. Connect one, or type your question instead.");
      } else {
        fail("Microphone permission was denied. Allow it in the browser's site settings, or type your question instead.");
      }
      return false;
    }
  }, [fail, setState]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    setError(null);
    setNotice(null);
    if (!recognitionRef.current) {
      setState("unsupported");
      return;
    }
    if (!(await ensurePermission())) return;
    activeRef.current = true;
    setSessionActive(true);
    rapidFailuresRef.current = 0;
    resumeListening();
  }, [ensurePermission, resumeListening, setState]);

  /** Stop speaking immediately and go back to listening (or idle). */
  const interrupt = useCallback(() => {
    requestAbortRef.current?.abort();
    cancelSpeech();
    if (activeRef.current) resumeListening();
    else setState(recognitionRef.current ? "idle" : "unsupported");
  }, [cancelSpeech, resumeListening, setState]);

  /** Typed fallback that goes through the same pipeline (works without a microphone). */
  const submitText = useCallback((text: string) => processUtterance(text), [processUtterance]);

  /** Read arbitrary text aloud (e.g. a chat answer) without starting a session. */
  const speakOnly = useCallback(
    async (text: string) => {
      const gen = ttsGenRef.current + 1;
      await speak(text);
      if (gen !== ttsGenRef.current) return;
      if (activeRef.current) resumeListening();
      else setState(recognitionRef.current ? "idle" : "unsupported");
    },
    [resumeListening, setState, speak],
  );

  // ---------------- one recogniser per mount ----------------
  useEffect(() => {
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setRecognitionSupported(false);
      setState("unsupported");
      return;
    }
    setRecognitionSupported(true);
    const rec = new Ctor();
    rec.continuous = true; // not honoured everywhere (e.g. some mobile browsers) — onend restarts
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    const timerBag = timers.current;
    rec.onstart = () => {
      runningRef.current = true;
      if (activeRef.current && (stateRef.current === "reconnecting" || stateRef.current === "requesting-permission")) {
        setState("listening");
      }
    };

    rec.onresult = (event: any) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalBufferRef.current = `${finalBufferRef.current} ${result[0].transcript}`.trim();
        else interimText += result[0].transcript;
      }
      interimRef.current = interimText;
      const heard = `${finalBufferRef.current} ${interimText}`.trim();
      rapidFailuresRef.current = 0;
      networkFailureRef.current = false;
      resetIdleTimer();

      if (stateRef.current === "speaking") {
        // Barge-in: the user started talking over the answer.
        if (settingsRef.current.bargeIn && heard.length > 2) {
          cancelSpeech();
          setState("listening");
        } else {
          return;
        }
      }
      if (stateRef.current !== "listening") return;
      setInterim(heard);
      clearTimer("silence");
      timers.current.silence = window.setTimeout(commitUtterance, settingsRef.current.silenceMs);
    };

    rec.onerror = (event: any) => {
      switch (event.error) {
        case "no-speech":
        case "aborted":
          return; // benign: onend decides whether to restart
        case "audio-capture":
          fail("No microphone audio is available. Check that a microphone is connected and not used by another app.");
          return;
        case "not-allowed":
        case "service-not-allowed":
          if (document.hidden) return; // some browsers block background tabs; resume when visible
          permissionGrantedRef.current = false;
          fail("Microphone permission was denied. Allow it in the browser's site settings, or type your question instead.");
          return;
        case "language-not-supported":
          fail(`Speech recognition does not support ${SPEECH_LANG[langRef.current] || langRef.current} in this browser.`);
          return;
        case "network":
          networkFailureRef.current = true;
          if (activeRef.current) setState("reconnecting");
          return;
        default:
          return;
      }
    };

    rec.onend = () => {
      runningRef.current = false;
      if (!activeRef.current || !wantListeningRef.current) return;
      const lifetime = Date.now() - startedAtRef.current;
      // A session that ran a while and ended (e.g. after silence) is healthy: restart immediately.
      // Only sessions that die right after starting count as failures.
      if (lifetime < 1500 || networkFailureRef.current) rapidFailuresRef.current += 1;
      else rapidFailuresRef.current = 0;

      if (rapidFailuresRef.current > MAX_RAPID_FAILURES) {
        fail(
          networkFailureRef.current
            ? "The browser's speech service is unreachable. Check your connection, then start voice again."
            : "Speech recognition keeps stopping in this browser. Try Chrome or Edge, or type your question.",
        );
        return;
      }
      if (!navigator.onLine) {
        setState("reconnecting");
        return; // the 'online' listener restarts
      }
      if (document.hidden && rapidFailuresRef.current > 1) {
        setState("reconnecting");
        return; // the visibility listener restarts
      }
      if (rapidFailuresRef.current > 0) setState("reconnecting");
      const attempt = rapidFailuresRef.current;
      const delay = attempt === 0 ? 120 : Math.min(8000, 300 * 2 ** attempt) + Math.random() * 250;
      clearTimer("restart");
      timers.current.restart = window.setTimeout(startRecognition, delay);
    };

    const onOnline = () => {
      if (activeRef.current && wantListeningRef.current && !runningRef.current) {
        rapidFailuresRef.current = 0;
        networkFailureRef.current = false;
        startRecognition();
      }
    };
    const onOffline = () => {
      if (activeRef.current) setState("reconnecting");
    };
    const onVisible = () => {
      if (!document.hidden && activeRef.current && wantListeningRef.current && !runningRef.current) {
        rapidFailuresRef.current = 0;
        startRecognition();
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      activeRef.current = false;
      wantListeningRef.current = false;
      requestAbortRef.current?.abort();
      Object.keys(timerBag).forEach((t) => clearTimer(t as keyof typeof timerBag));
      rec.onstart = rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      runningRef.current = false;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
    // Created once per mount on purpose; language changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Language change: restart the running recogniser with the new language.
  useEffect(() => {
    langRef.current = lang;
    const rec = recognitionRef.current;
    if (rec && runningRef.current) {
      try {
        rec.abort(); // onend restarts with the new language
      } catch {
        /* ignore */
      }
    }
  }, [lang]);

  // Voices load asynchronously in Chrome; touching getVoices() early primes the list.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    const prime = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", prime);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", prime);
  }, []);

  return {
    state,
    sessionActive,
    interim,
    lastUtterance,
    error,
    notice,
    recognitionSupported,
    ttsSupported,
    start,
    stop,
    interrupt,
    submitText,
    speakOnly,
    clearError: () => setError(null),
  };
}
