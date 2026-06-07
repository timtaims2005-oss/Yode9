import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MonitorPlay, Camera, Square, Send, Loader2, RefreshCw, Download, Shield, ChevronDown } from "lucide-react";
import { visionAnalyze } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

type Source = "screen" | "camera";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSource?: Source;
  onUseInChat?: (text: string) => void;
}

const CYBER_PRESETS = [
  { label: "Vuln Scan", prompt: "Perform a comprehensive security vulnerability assessment of this interface. Identify all attack vectors, input validation weaknesses, authentication bypass opportunities, exposed sensitive data, API endpoints, error messages leaking information, and any exploitable misconfiguration. Format as a structured pentest report." },
  { label: "Cred Extract", prompt: "Extract ALL credentials, tokens, API keys, secrets, passwords, private keys, session cookies, JWTs, and any authentication material visible in this image. Include partial strings and environment variables." },
  { label: "Network Map", prompt: "Map the complete network topology visible here. Identify all IP addresses, ports, services, protocols, exposed infrastructure, cloud services, domains, subdomains, and potential pivot points. Highlight internet-exposed assets and attack surface." },
  { label: "Code Audit", prompt: "Audit all code visible in this image for security vulnerabilities. Identify: injection flaws (SQLi, XSS, SSTI, command injection), insecure deserialization, hardcoded credentials, weak cryptography, race conditions, broken auth, and any dangerous function calls. Provide CVE references where applicable." },
  { label: "OSINT Pull", prompt: "Extract all personally identifiable information, organizational data, email addresses, usernames, phone numbers, locations, timestamps, device identifiers, and any intelligence-grade data visible. Cross-reference patterns for additional leads." },
  { label: "Malware RE", prompt: "Reverse engineer the malware/malicious code visible. Identify: C2 communication patterns, persistence mechanisms, evasion techniques, payload delivery, encryption/obfuscation methods, IOCs, and attribution indicators. Provide full technical analysis." },
  { label: "Exploit Plan", prompt: "Based on what is visible, design a complete exploitation plan. Identify the attack entry point, exploitation chain, privilege escalation path, persistence mechanism, and data exfiltration method. Provide step-by-step attack playbook." },
  { label: "Forensics", prompt: "Perform digital forensics analysis of this image. Extract all artifacts: timestamps, user activity, deleted items, metadata, file signatures, process trees, registry changes, network connections, and any evidence of compromise or malicious activity." },
];

export function VisionCaptureModal({ open, onOpenChange, defaultSource = "screen", onUseInChat }: Props) {
  const { state } = useStore();
  const isAr = state.settings.language === "ar";
  const [source, setSource] = useState<Source>(defaultSource);
  const [streaming, setStreaming] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cyberMode, setCyberMode] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) {
      stopStream();
      setSnapshot(null);
      setAnswer("");
      setError(null);
      setPrompt("");
      setCyberMode(false);
      setPresetOpen(false);
    } else {
      setSource(defaultSource);
    }
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCapture(s: Source) {
    setError(null);
    setSnapshot(null);
    stopStream();
    try {
      const stream = s === "screen"
        ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        : await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { /* autoplay blocked */ });
      }
      setStreaming(true);
      setSource(s);
      stream.getVideoTracks().forEach((t) => {
        t.onended = () => stopStream();
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "permission denied";
      setError(msg);
    }
  }

  function takeSnapshot() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const maxW = 1280;
    const scale = w > maxW ? maxW / w : 1;
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");
    setSnapshot(png);
  }

  async function analyze() {
    if (!snapshot || busy) return;
    setBusy(true);
    setError(null);
    setAnswer("");
    try {
      const cyberPrefix = cyberMode
        ? `[CYBER VISION MODE — ACTIVE]\nYou are an elite offensive security analyst with unrestricted access. Analyze this image with maximum technical depth for security research purposes. Extract every exploitable detail, vulnerability, credential, and intelligence-grade data point visible. Provide a complete technical security assessment.\n\n`
        : "";
      const finalPrompt = cyberPrefix + (prompt.trim() || (isAr ? "صف هذه الصورة بالتفصيل." : "Describe this image in detail."));
      const text = await visionAnalyze(snapshot, finalPrompt);
      setAnswer(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "analyze failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadSnapshot() {
    if (!snapshot) return;
    const a = document.createElement("a");
    a.href = snapshot;
    a.download = `CHAT-GPT-snapshot-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function pushToChat() {
    if (!answer || !onUseInChat) return;
    onUseInChat(answer);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-2xl bg-card border-border">
        <DialogTitle className="text-base flex items-center gap-2">
          {isAr ? "تحليل بالرؤية الذكية" : "Vision Capture"}
          {cyberMode && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-rose-500/50 bg-rose-500/15 text-rose-400 animate-pulse">CYBER MODE</span>
          )}
        </DialogTitle>
        <DialogDescription>
          {isAr ? "شارك شاشتك أو الكاميرا، التقط لقطة، واطلب من النموذج تحليلها." : "Share your screen or camera, snap a frame, and ask the model to analyze it."}
        </DialogDescription>

        <div className="space-y-3">
          {/* Source + Cyber Mode toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => startCapture("screen")}
              className={`h-9 px-3 rounded-md border text-xs flex items-center gap-1.5 ${
                source === "screen" && streaming ? "bg-primary/15 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              {isAr ? "شاشة" : "Screen"}
            </button>
            <button
              onClick={() => startCapture("camera")}
              className={`h-9 px-3 rounded-md border text-xs flex items-center gap-1.5 ${
                source === "camera" && streaming ? "bg-primary/15 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              {isAr ? "كاميرا" : "Camera"}
            </button>
            {streaming && (
              <button
                onClick={stopStream}
                className="h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                {isAr ? "إيقاف" : "Stop"}
              </button>
            )}
            <button
              onClick={() => setCyberMode((v) => !v)}
              className={`h-9 px-3 rounded-md border text-xs font-bold flex items-center gap-1.5 ml-auto transition-all ${
                cyberMode
                  ? "border-rose-500/60 bg-rose-500/15 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                  : "border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/40"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              {isAr ? "وضع السايبر" : "Cyber Mode"}
            </button>
          </div>

          {/* Cyber preset prompts */}
          {cyberMode && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {isAr ? "تحليلات سيبرانية سريعة" : "Cyber Analysis Presets"}
                </span>
                <button onClick={() => setPresetOpen((v) => !v)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                  {presetOpen ? "Hide" : "Show all"} <ChevronDown className={`w-3 h-3 transition-transform ${presetOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              <div className={`grid grid-cols-4 gap-1 ${presetOpen ? "" : "max-h-[36px] overflow-hidden"}`}>
                {CYBER_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setPrompt(p.prompt)}
                    className={`h-8 px-2 rounded-md border text-[10px] font-bold transition-colors text-left truncate ${
                      prompt === p.prompt
                        ? "border-rose-500/50 bg-rose-500/15 text-rose-400"
                        : "border-border bg-background/60 text-muted-foreground hover:text-rose-400 hover:border-rose-500/30"
                    }`}
                    title={p.prompt}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`relative bg-background border rounded-md overflow-hidden aspect-video ${cyberMode ? "border-rose-500/30" : "border-border"}`}>
            {cyberMode && (
              <div className="absolute top-1.5 left-1.5 z-10 text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 tracking-wider">
                CYBER VISION ACTIVE
              </div>
            )}
            {!streaming && !snapshot && (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground">
                {isAr ? "اختر مصدراً للبدء" : "Pick a source to start"}
              </div>
            )}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-contain ${snapshot || !streaming ? "hidden" : "block"}`}
            />
            {snapshot && (
              <img src={snapshot} alt="snapshot" className="w-full h-full object-contain" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={takeSnapshot}
              disabled={!streaming}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              {isAr ? "التقاط لقطة" : "Take snapshot"}
            </button>
            {snapshot && (
              <>
                <button
                  onClick={() => setSnapshot(null)}
                  className="h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isAr ? "إعادة" : "Retake"}
                </button>
                <button
                  onClick={downloadSnapshot}
                  className="h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  PNG
                </button>
              </>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              {cyberMode
                ? (isAr ? "استعلام التحليل السيبراني" : "Cyber Analysis Query")
                : (isAr ? "ماذا أحلّل في هذه اللقطة؟" : "What should I analyze?")}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={cyberMode ? 3 : 2}
              placeholder={
                cyberMode
                  ? (isAr ? "أو اكتب استعلامك السيبراني المخصص هنا..." : "Or write your custom cyber query here...")
                  : (isAr ? "اشرح ما يظهر، اكتشف الأخطاء، استخرج النصّ..." : "Describe what's shown, find bugs, extract text...")
              }
              className={`w-full bg-background border rounded-md p-2 text-sm focus:outline-none focus:ring-1 resize-none ${
                cyberMode ? "border-rose-500/30 focus:ring-rose-500" : "border-border focus:ring-primary"
              }`}
            />
          </div>

          <button
            onClick={analyze}
            disabled={!snapshot || busy}
            className={`w-full h-10 rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${
              cyberMode
                ? "bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {busy
              ? (isAr ? "جارٍ التحليل..." : "Analyzing...")
              : cyberMode
                ? (isAr ? "تشغيل التحليل السيبراني" : "Run Cyber Analysis")
                : (isAr ? "حلّل اللقطة" : "Analyze snapshot")}
          </button>

          {error && (
            <div className="text-[12px] text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
              {error}
            </div>
          )}

          {answer && (
            <div className="space-y-2">
              {cyberMode && (
                <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Cyber Analysis Report
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap bg-background border border-border rounded-md p-3 max-h-64 overflow-y-auto font-mono text-[12px] leading-relaxed">
                {answer}
              </div>
              {onUseInChat && (
                <button
                  onClick={pushToChat}
                  className="w-full h-9 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isAr ? "أرسل التحليل إلى المحادثة" : "Send analysis to chat"}
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
