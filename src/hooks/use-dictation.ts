import { useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/** Browser dictation (Web Speech API, en-IN). Hidden by callers when unsupported. */
export function useDictation(onTranscript: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    setSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const toggle = () => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = event => {
      const transcript = Array.from({ length: event.results.length }, (_, i) => event.results[i]?.[0]?.transcript ?? "").join(" ").trim();
      if (transcript) callbackRef.current(transcript);
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return { supported, listening, toggle };
}
