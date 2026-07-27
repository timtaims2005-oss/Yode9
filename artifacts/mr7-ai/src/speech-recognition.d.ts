/**
 * Global SpeechRecognition type declarations.
 * Supplements lib.dom when the browser Speech API types are missing or incomplete.
 * This is an AMBIENT global file (no import/export) so declarations apply globally.
 */

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  grammars: unknown;
  start(): void;
  stop(): void;
  abort(): void;
  onstart:  ((e: Event) => void) | null;
  onend:    ((e: Event) => void) | null;
  onerror:  ((e: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onaudiostart: ((e: Event) => void) | null;
  onaudioend:   ((e: Event) => void) | null;
  onspeechstart: ((e: Event) => void) | null;
  onspeechend:   ((e: Event) => void) | null;
  onnomatch:     ((e: SpeechRecognitionEvent) => void) | null;
  onsoundstart:  ((e: Event) => void) | null;
  onsoundend:    ((e: Event) => void) | null;
}

declare var SpeechRecognition: {
  new(): SpeechRecognition;
  prototype: SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  new(): SpeechRecognition;
  prototype: SpeechRecognition;
};

interface Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}
