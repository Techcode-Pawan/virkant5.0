"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LanguageCode } from "../lib/i18n";

export function useVoice(locale: LanguageCode = "en") {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const lastSpokenTextRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = locale === "hi" ? "hi-IN" : "en-US";

        recognition.onstart = () => {
          setIsRecording(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          setIsRecording(false);
          setErrorMessage(`Speech recognition error: ${event.error}`);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [locale]);

  const startRecording = useCallback(() => {
    if (recognitionRef.current && !isRecording) {
      try {
        setTranscript("");
        recognitionRef.current.lang = locale === "hi" ? "hi-IN" : "en-US";
        recognitionRef.current.start();
      } catch (err) {
        setErrorMessage("Microphone permission denied or busy.");
      }
    }
  }, [isRecording, locale]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const speakText = useCallback((textToSpeak: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // cancel previous
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = locale === "hi" ? "hi-IN" : "en-US";
      lastSpokenTextRef.current = textToSpeak;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [locale]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const repeatLastAnswer = useCallback(() => {
    if (lastSpokenTextRef.current) {
      speakText(lastSpokenTextRef.current);
    }
  }, [speakText]);

  return {
    isRecording,
    isSpeaking,
    transcript,
    isSupported,
    errorMessage,
    startRecording,
    stopRecording,
    speakText,
    stopSpeaking,
    repeatLastAnswer,
  };
}
