import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2 } from "lucide-react";
import { streamChat, type ChatMessage } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

type Status = "idle" | "listening" | "thinking" | "speaking";

type Turn = { role: "user" | "assistant"; text: string };

type SRInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SR: (new () => SRInstance) | undefined = typeof window !== "undefined"
  ? ((window as unknown as { SpeechRecognition?: new () => SRInstance; webkitSpeechRecognition?: new () => SRInstance })
      .SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => SRInstance }).webkitSpeechRecognition)
  : undefined;

export function VoiceChatModal({ open, onOpenChange }: Props) {
  const { state } = useStore();
  const [status, setStatus] = useState<Status>("idle");
  const [partial, setPartial] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [active, setActive] = useState(false);
  const recogRef = useRef<SRInstance | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { turnsRef.current = turns; }, [turns]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => {
    if (!open) {
      stopAll();
      setTurns([]);
      setPartial("");
      setStatus("idle");
      setActive(false);
      setError(null);
    }
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function stopAll() {
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    recogRef.current = null;
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function speak(text: string, onEnd: () => void) {
    if (mutedRef.current || !("speechSynthesis" in window)) {
      onEnd();
      return;
    }
    setStatus("speaking");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = state.settings.language === "ar" ? "ar-SA" : "en-US";
    u.rate = 1.0;
    u.onend = () => onEnd();
    u.onerror = () => onEnd();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function startListening() {
    if (!SR) {
      setError(state.settings.language === "ar" ? "متصفّحك لا يدعم التعرّف على الكلام" : "Your browser does not support speech recognition");
      return;
    }
    setError(null);
    setPartial("");
    const r = new SR();
    r.lang = state.settings.language === "ar" ? "ar-SA" : "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onstart = () => setStatus("listening");
    r.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result) continue;
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) final += alt.transcript;
        else interim += alt.transcript;
      }
      setPartial(final || interim);
      if (final.trim()) {
        try { r.stop(); } catch { /* ignore */ }
        void onUserUtterance(final.trim());
      }
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" && activeRef.current) {
        setTimeout(() => { if (activeRef.current && status === "idle") startListening(); }, 200);
        return;
      }
      setError(`mic: ${e.error}`);
      setStatus("idle");
    };
    r.onend = () => {
      if (status === "listening") setStatus("idle");
    };
    recogRef.current = r;
    try { r.start(); } catch { /* may already be started */ }
  }

  async function onUserUtterance(text: string) {
    if (!text) return;
    const userTurn: Turn = { role: "user", text };
    const next = [...turnsRef.current, userTurn];
    setTurns(next);
    setPartial("");
    setStatus("thinking");

    const messages: ChatMessage[] = next.map((t) => ({ role: t.role, content: t.text }));
    const ac = new AbortController();
    abortRef.current = ac;
    let answer = "";
    try {
      answer = await streamChat(
        {
          model: state.activeModel,
          persona: state.activePersona,
          customInstructions: state.customInstructions ?? "",
          language: state.settings.language,
          memory: state.memory,
          messages,
          mode: "chat",
          webContext: null,
        },
        () => { /* stream chunks ignored — we wait for full answer to speak */ },
        ac.signal,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "request failed";
      setError(msg);
      setStatus("idle");
      return;
    }

    const finalAnswer = answer.trim() || (state.settings.language === "ar" ? "تعذّر التوليد." : "No response.");
    setTurns((prev) => [...prev, { role: "assistant", text: finalAnswer }]);
    speak(finalAnswer, () => {
      setStatus("idle");
      if (activeRef.current) startListening();
    });
  }

  function startCall() {
    setActive(true);
    activeRef.current = true;
    startListening();
  }

  function endCall() {
    setActive(false);
    activeRef.current = false;
    stopAll();
    setStatus("idle");
  }

  const lang = state.settings.language;
  const isAr = lang === "ar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-lg bg-card border-border">
        <DialogTitle className="text-base">
          {isAr ? "محادثة صوتية" : "Voice Chat"}
        </DialogTitle>
        <DialogDescription>
          {isAr ? "اضغط على الميكروفون وتحدّث، سيردّ النموذج صوتياً." : "Press the mic and talk — the model will respond by voice."}
        </DialogDescription>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative">
            <button
              onClick={active ? endCall : startCall}
              className={`relative h-28 w-28 rounded-full flex items-center justify-center transition-all ${
                active
                  ? "bg-destructive/20 border-2 border-destructive text-destructive"
                  : "bg-primary/20 border-2 border-primary text-primary hover:bg-primary/30"
              }`}
              aria-label={active ? "End call" : "Start call"}
            >
              {active ? <PhoneOff className="w-10 h-10" /> : <Phone className="w-10 h-10" />}
              {status === "listening" && (
                <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping" />
              )}
            </button>
          </div>

          <div className="text-[12px] uppercase tracking-wider text-muted-foreground h-4">
            {status === "idle" && active && (isAr ? "في انتظار صوتك..." : "Waiting for your voice...")}
            {status === "listening" && (
              <span className="text-primary inline-flex items-center gap-1">
                <Mic className="w-3 h-3" /> {isAr ? "أستمع..." : "Listening..."}
              </span>
            )}
            {status === "thinking" && (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> {isAr ? "أفكّر..." : "Thinking..."}
              </span>
            )}
            {status === "speaking" && (
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> {isAr ? "أتحدّث..." : "Speaking..."}
              </span>
            )}
            {!active && status === "idle" && (isAr ? "اضغط على الزرّ لبدء المكالمة" : "Press the button to start a call")}
          </div>

          {partial && (
            <div className="w-full text-sm text-muted-foreground italic text-center px-2 min-h-[20px]">
              "{partial}"
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted((m) => !m)}
              className={`h-9 px-3 rounded-md border border-border text-xs flex items-center gap-1.5 ${
                muted ? "bg-destructive/15 text-destructive border-destructive/40" : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {muted ? <MicOff className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {muted ? (isAr ? "صوت الردّ مكتوم" : "Reply muted") : (isAr ? "صوت الردّ مفعّل" : "Reply audio on")}
            </button>
          </div>

          {error && (
            <div className="text-[12px] text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2 w-full">
              {error}
            </div>
          )}

          <div className="w-full max-h-48 overflow-y-auto space-y-2 mt-2">
            {turns.map((t, i) => (
              <div key={i} className={`text-[13px] ${t.role === "user" ? "text-muted-foreground" : "text-foreground"}`}>
                <span className="font-mono text-[10px] uppercase tracking-wider mr-2 opacity-60">
                  {t.role === "user" ? (isAr ? "أنت" : "You") : "AI"}
                </span>
                {t.text}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
