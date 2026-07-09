import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Users, Send, Copy, CheckCheck, Link2, Radio,
  Wifi, WifiOff, Loader2, MessageSquare, UserPlus,
  Globe, Zap, Activity, Shield, Clock, ChevronRight,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

interface CollabUser   { id: string; name: string; color: string; joinedAt: number; }
interface CollabMessage {
  id: string; userId: string; userName: string; color: string;
  content: string; timestamp: number; type: "message" | "system";
}
interface TypingState  { userId: string; userName: string; color: string; isTyping: boolean; }

const USER_COLORS = ["#e21227","#06b6d4","#10b981","#f59e0b","#8b5cf6","#ec4899","#f97316","#0ea5e9"];
const NAMES_AR = ["وكيل ألفا","وكيل بيتا","وكيل غاما","وكيل دلتا","وكيل إيبسيلون","وكيل زيتا"];

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}
function uid() { return Math.random().toString(36).slice(2, 9); }

/* ─── Holographic Room Canvas ──────────────────────────────────────────── */
function HoloRoom({ users, typing }: { users: CollabUser[]; typing: TypingState[] }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const usersRef = useRef(users);
  const typingRef = useRef(typing);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { typingRef.current = typing; }, [typing]);

  useEffect(() => {
    const canvas = cv.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, raf = 0, t = 0;
    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize(); window.addEventListener("resize", resize);

    // Node positions (stable per session)
    const nodePos = Array.from({ length: 8 }, (_, i) => ({
      x: 0.1 + (i % 4) * 0.27,
      y: i < 4 ? 0.25 : 0.75,
      phase: i * 0.8,
    }));

    const draw = () => {
      t += 0.01;
      ctx.clearRect(0, 0, W, H);

      // Background grid
      ctx.strokeStyle = "rgba(6,182,212,0.05)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      const us = usersRef.current;
      const typers = typingRef.current.filter(t => t.isTyping).map(t => t.userId);

      // Draw connections between nodes
      for (let i = 0; i < Math.min(us.length, nodePos.length); i++) {
        for (let j = i + 1; j < Math.min(us.length, nodePos.length); j++) {
          const a = nodePos[i], b = nodePos[j];
          const ax = a.x * W, ay = a.y * H, bx = b.x * W, by = b.y * H;
          const pulse = 0.5 + Math.sin(t * 2 + i + j) * 0.3;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
          ctx.strokeStyle = `rgba(6,182,212,${pulse * 0.15})`; ctx.lineWidth = 1; ctx.stroke();

          // Data packet on connection
          const progress = ((t * 0.5 + i * 0.3) % 1);
          const px = ax + (bx - ax) * progress;
          const py = ay + (by - ay) * progress;
          ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(6,182,212,${pulse * 0.6})`; ctx.fill();
        }
      }

      // Draw user nodes
      us.forEach((user, i) => {
        if (i >= nodePos.length) return;
        const np = nodePos[i];
        const nx = np.x * W, ny = np.y * H;
        const isTyping = typers.includes(user.id);
        const pulse = 1 + Math.sin(t * 3 + np.phase) * (isTyping ? 0.3 : 0.08);

        // Glow ring
        const glowSize = 28 * pulse;
        const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, glowSize);
        glow.addColorStop(0, `${user.color}55`);
        glow.addColorStop(0.5, `${user.color}22`);
        glow.addColorStop(1, `${user.color}00`);
        ctx.beginPath(); ctx.arc(nx, ny, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glow; ctx.fill();

        // Outer orbit
        ctx.beginPath();
        ctx.arc(nx, ny, 20 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `${user.color}55`; ctx.lineWidth = 1.5; ctx.stroke();

        // Node circle
        const nodeGrad = ctx.createRadialGradient(nx - 4, ny - 4, 0, nx, ny, 14);
        nodeGrad.addColorStop(0, `${user.color}dd`);
        nodeGrad.addColorStop(1, `${user.color}88`);
        ctx.beginPath(); ctx.arc(nx, ny, 14, 0, Math.PI * 2);
        ctx.fillStyle = nodeGrad; ctx.fill();

        // Initials
        ctx.font = `bold 9px monospace`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(user.name.slice(0, 2), nx, ny);

        // Typing wave
        if (isTyping) {
          for (let d = 1; d <= 3; d++) {
            const wAlpha = Math.max(0, 0.4 - (d * 0.12)) * (0.5 + Math.sin(t * 6 + d) * 0.5);
            ctx.beginPath(); ctx.arc(nx, ny, 14 + d * 8 + Math.sin(t * 8) * 2, 0, Math.PI * 2);
            ctx.strokeStyle = `${user.color}${Math.round(wAlpha * 255).toString(16).padStart(2, "0")}`;
            ctx.lineWidth = 1; ctx.stroke();
          }
        }

        // Name label
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = `${user.color}cc`;
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(user.name.slice(0, 8), nx, ny + 18);
      });

      // Central hub
      const cx = W / 2, cy = H / 2;
      const hubPulse = 1 + Math.sin(t * 2) * 0.1;
      const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20 * hubPulse);
      hubGrad.addColorStop(0, "rgba(226,18,39,0.6)");
      hubGrad.addColorStop(0.6, "rgba(226,18,39,0.2)");
      hubGrad.addColorStop(1, "rgba(226,18,39,0)");
      ctx.beginPath(); ctx.arc(cx, cy, 20 * hubPulse, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad; ctx.fill();

      ctx.font = "bold 7px monospace"; ctx.fillStyle = "#e21227cc";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("HUB", cx, cy);

      // Hub connections to all users
      us.forEach((_, i) => {
        if (i >= nodePos.length) return;
        const np = nodePos[i];
        const nx = np.x * W, ny = np.y * H;
        const alpha = 0.08 + Math.sin(t + i) * 0.04;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = `rgba(226,18,39,${alpha})`; ctx.lineWidth = 0.5; ctx.stroke();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);

  return <canvas ref={cv} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ─── Message Bubble ───────────────────────────────────────────────────── */
function MsgBubble({ msg, isOwn }: { msg: CollabMessage; isOwn: boolean }) {
  if (msg.type === "system") {
    return (
      <motion.div className="flex justify-center my-1"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="text-[10px] text-slate-600 px-3 py-1 rounded-full border border-[#1a1a1a] bg-[#0d0d0d]">
          {msg.content}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} mb-2`}
      initial={{ opacity: 0, x: isOwn ? 20 : -20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black"
        style={{ background: `${msg.color}30`, border: `1.5px solid ${msg.color}66`, color: msg.color }}>
        {msg.userName.slice(0, 2)}
      </div>
      {/* Bubble */}
      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        <div className="text-[9px] font-bold px-1" style={{ color: `${msg.color}99` }}>
          {msg.userName}
        </div>
        <motion.div className="px-3 py-2 rounded-2xl text-sm text-white leading-relaxed"
          style={{
            background: isOwn
              ? `linear-gradient(135deg, ${msg.color}33, ${msg.color}1a)`
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${isOwn ? msg.color + "44" : "#1f1f1f"}`,
            borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            boxShadow: isOwn ? `0 0 12px ${msg.color}22` : "none",
          }}
          whileHover={{ scale: 1.01 }}>
          {msg.content}
        </motion.div>
        <div className="text-[9px] text-slate-700 px-1">{fmtTime(msg.timestamp)}</div>
      </div>
    </motion.div>
  );
}

/* ─── Main Modal ───────────────────────────────────────────────────────── */
export default function CollabModal({ open, onOpenChange }: Props) {
  const [wsState, setWsState] = useState<"idle"|"connecting"|"connected"|"error">("idle");
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [myName] = useState(() => NAMES_AR[Math.floor(Math.random() * NAMES_AR.length)]);
  const [myColor] = useState(() => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [messages, setMessages] = useState<CollabMessage[]>([]);
  const [typing, setTyping] = useState<TypingState[]>([]);
  const [input, setInput] = useState("");
  const [isTypingActive, setIsTypingActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"chat"|"room"|"users">("chat");
  const [latency, setLatency] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pingTimerRef = useRef<number | null>(null);
  const pingStartRef = useRef<number>(0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const wsUrl = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host  = window.location.host;
    return `${proto}//${host}/api/collab`;
  }, []);

  const connect = useCallback((targetRoomId?: string) => {
    wsRef.current?.close();
    setWsState("connecting");

    const ws = new WebSocket(wsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId: targetRoomId ?? "", name: myName, color: myColor }));
    };

    ws.onmessage = (e) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(e.data as string); } catch { return; }
      const type = msg.type as string;

      if (type === "joined_ack") {
        setWsState("connected");
        setMyId(msg.userId as string);
        setRoomId(msg.roomId as string);
        setUsers((msg.users as CollabUser[]) ?? []);
        setMessages((msg.history as CollabMessage[]) ?? []);
        // Start ping
        pingTimerRef.current = window.setInterval(() => {
          pingStartRef.current = Date.now();
          ws.send(JSON.stringify({ type: "pong" }));
        }, 5000);
      }
      if (type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        setLatency(Date.now() - pingStartRef.current);
      }
      if (type === "users")   setUsers(msg.users as CollabUser[]);
      if (type === "message") setMessages(prev => [...prev, msg.message as CollabMessage]);
      if (type === "history_append") setMessages(prev => [...prev, msg.message as CollabMessage]);
      if (type === "typing")  setTyping(prev => {
        const filtered = prev.filter(t => t.userId !== (msg.userId as string));
        if (msg.isTyping) return [...filtered, { userId: msg.userId as string, userName: msg.userName as string, color: msg.color as string, isTyping: true }];
        return filtered;
      });
      if (type === "joined" || type === "left") {
        // users will be updated via "users" event
      }
      if (type === "error") console.warn("Collab error:", msg.message);
    };

    ws.onclose = () => {
      setWsState("idle");
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
    ws.onerror = () => setWsState("error");
  }, [wsUrl, myName, myColor]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setWsState("idle");
    setMyId(null); setRoomId(""); setUsers([]); setMessages([]); setTyping([]);
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
  }, []);

  const sendMsg = useCallback(() => {
    const content = input.trim();
    if (!content || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "message", content }));
    setInput("");
    setIsTypingActive(false);
    wsRef.current.send(JSON.stringify({ type: "typing", isTyping: false }));
  }, [input]);

  const handleTyping = useCallback((val: string) => {
    setInput(val);
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    if (!isTypingActive) {
      setIsTypingActive(true);
      wsRef.current.send(JSON.stringify({ type: "typing", isTyping: true }));
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTypingActive(false);
      wsRef.current?.send(JSON.stringify({ type: "typing", isTyping: false }));
    }, 2000);
  }, [isTypingActive]);

  const copyRoom = useCallback(() => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  useEffect(() => {
    if (!open) { disconnect(); }
    return () => { if (!open) disconnect(); };
  }, [open, disconnect]);

  const activeTypers = typing.filter(t => t.isTyping && t.userId !== myId);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.95)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}>
        <motion.div className="relative flex flex-col overflow-hidden"
          style={{
            width: "min(1400px, 98vw)", height: "min(900px, 96vh)",
            background: "linear-gradient(135deg,#050508 0%,#090a10 50%,#050508 100%)",
            border: "1px solid rgba(226,18,39,0.2)", borderRadius: 20,
            boxShadow: "0 0 100px rgba(226,18,39,0.08), 0 0 40px rgba(6,182,212,0.05)",
          }}
          initial={{ opacity: 0, scale: 0.88, y: 60 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}>

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="relative flex items-center justify-between px-4 pt-3 pb-[10px] border-b border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4">
              <motion.div className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.35)" }}
                animate={{ boxShadow: ["0 0 10px rgba(226,18,39,0.2)","0 0 35px rgba(226,18,39,0.5)","0 0 10px rgba(226,18,39,0.2)"] }}
                transition={{ duration: 2, repeat: Infinity }}>
                <motion.div className="absolute inset-0 rounded-xl border border-red-500/10"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity }} />
                <Users size={22} color="#e21227" />
              </motion.div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-white tracking-widest">REAL-TIME</span>
                  <motion.span className="text-xl font-black tracking-widest"
                    style={{ color: "#e21227", textShadow: "0 0 20px #e21227" }}
                    animate={{ textShadow: ["0 0 10px #e2122788","0 0 35px #e21227","0 0 10px #e2122788"] }}
                    transition={{ duration: 2, repeat: Infinity }}>COLLAB</motion.span>
                  {wsState === "connected" && (
                    <motion.div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10"
                      animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                      <span className="text-[10px] font-bold text-emerald-400">متصل</span>
                    </motion.div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  WebSocket · {users.length} مستخدم · رسائل فورية · تحديثات حية
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {latency !== null && wsState === "connected" && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                  <Activity size={10} />
                  {latency}ms
                </div>
              )}
              {wsState === "connected" && (
                <button onClick={disconnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs transition-all">
                  <WifiOff size={12} />قطع
                </button>
              )}
              <button onClick={() => onOpenChange(false)}
                className="w-7 h-7 flex items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#111] text-slate-400 hover:text-white hover:border-red-500/50 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: Holographic Room */}
            <div className="w-80 flex-shrink-0 border-r border-[#1a1a1a] flex flex-col overflow-hidden">
              <div className="relative flex-1 overflow-hidden">
                <HoloRoom users={users} typing={activeTypers} />
                {/* Overlay info */}
                <div className="absolute top-3 left-3 right-3 pointer-events-none">
                  <div className="text-[9px] text-slate-600 font-bold tracking-widest">خريطة الشبكة · HOLOGRAM</div>
                </div>
                {wsState !== "connected" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                      <Globe size={48} color="#e2122333" />
                    </motion.div>
                    <p className="text-slate-700 text-xs">غير متصل</p>
                  </div>
                )}
              </div>

              {/* Room Stats */}
              <div className="border-t border-[#1a1a1a] p-3 grid grid-cols-3 gap-2">
                {[
                  { label: "مستخدمون", value: users.length, color: "#06b6d4" },
                  { label: "رسائل",    value: messages.filter(m => m.type === "message").length, color: "#10b981" },
                  { label: "يكتب",     value: activeTypers.length, color: "#f59e0b" },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center w-7 h-7 flex items-center justify-center rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]">
                    <motion.div className="text-lg font-black" style={{ color: s.color }}
                      animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                      {s.value}
                    </motion.div>
                    <div className="text-[9px] text-slate-600">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Chat + Controls */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tabs */}
              <div className="flex items-center gap-0 border-b border-[#1a1a1a] flex-shrink-0">
                {([["chat","المحادثة",MessageSquare],["room","الغرفة",Link2],["users","المستخدمون",Users]] as const).map(([t, l, Icon]) => (
                  <button key={t} onClick={() => setTab(t as typeof tab)}
                    className={`flex items-center gap-2 px-4 pt-3 pb-[10px] text-xs font-bold border-b-2 transition-all ${tab === t ? "text-red-400 border-red-500" : "text-slate-600 border-transparent hover:text-slate-400"}`}>
                    <Icon size={12} />{l}
                  </button>
                ))}
              </div>

              {/* Chat Tab */}
              {tab === "chat" && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {wsState !== "connected" ? (
                      <div className="flex flex-col items-center justify-center h-full gap-8">
                        {wsState === "connecting" ? (
                          <>
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                              <Loader2 size={40} color="#e21227" />
                            </motion.div>
                            <p className="text-slate-500 text-sm">جارٍ الاتصال...</p>
                          </>
                        ) : (
                          <div className="text-center space-y-6 max-w-sm">
                            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                              <Users size={56} color="#e2122333" />
                            </motion.div>
                            <div>
                              <div className="text-white font-bold mb-1">غرفة تعاون فوري</div>
                              <div className="text-slate-600 text-xs">أنشئ غرفة جديدة أو انضم بمعرّف موجود</div>
                            </div>
                            <div className="space-y-3">
                              <motion.button onClick={() => connect()}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                                style={{ background: "rgba(226,18,39,0.2)", border: "1px solid rgba(226,18,39,0.4)", color: "#e21227", boxShadow: "0 0 20px rgba(226,18,39,0.2)" }}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Zap size={16} />إنشاء غرفة جديدة
                              </motion.button>
                              <div className="flex gap-2">
                                <input value={joinRoomId} onChange={e => setJoinRoomId(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter" && joinRoomId.trim()) connect(joinRoomId.trim()); }}
                                  placeholder="معرّف الغرفة للانضمام..."
                                  className="flex-1 bg-[#0d0d0d] border border-[#222] rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-slate-700 font-mono focus:border-red-500/30" />
                                <motion.button onClick={() => joinRoomId.trim() && connect(joinRoomId.trim())}
                                  disabled={!joinRoomId.trim()}
                                  className="px-4 py-2.5 rounded-xl font-bold text-xs border border-[#222] text-slate-400 hover:text-white hover:border-[#333] disabled:opacity-30 transition-all"
                                  whileHover={{ scale: 1.02 }}>
                                  انضمام
                                </motion.button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {messages.map(msg => (
                          <MsgBubble key={msg.id} msg={msg} isOwn={msg.userId === myId} />
                        ))}
                        {/* Typing Indicators */}
                        <AnimatePresence>
                          {activeTypers.length > 0 && (
                            <motion.div className="flex items-center gap-2 px-2"
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                              {activeTypers.map(t => (
                                <div key={t.userId} className="flex items-center gap-1">
                                  <div className="w-4 h-4 rounded-full text-[7px] font-black flex items-center justify-center"
                                    style={{ background: `${t.color}30`, color: t.color }}>
                                    {t.userName.slice(0, 1)}
                                  </div>
                                </div>
                              ))}
                              <div className="flex items-center gap-0.5">
                                {[0, 1, 2].map(i => (
                                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500"
                                    animate={{ y: ["0%", "-60%", "0%"] }}
                                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                                ))}
                              </div>
                              <span className="text-[10px] text-slate-600">
                                {activeTypers.length === 1 ? `${activeTypers[0].userName} يكتب...` : `${activeTypers.length} يكتبون...`}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Input */}
                  {wsState === "connected" && (
                    <div className="flex-shrink-0 p-3 border-t border-[#1a1a1a]">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                          <textarea value={input}
                            onChange={e => { handleTyping(e.target.value); if (e.target.value.length < 500) e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                            placeholder="اكتب رسالة... (Enter للإرسال)"
                            rows={1}
                            className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white outline-none placeholder-slate-700 resize-none overflow-hidden focus:border-red-500/30 transition-colors"
                            style={{ minHeight: 48, maxHeight: 120 }}
                            dir="auto" />
                          {isTypingActive && (
                            <motion.div className="absolute bottom-2 right-3 w-1 h-4 bg-red-500 rounded-full"
                              animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} />
                          )}
                        </div>
                        <motion.button onClick={sendMsg} disabled={!input.trim()}
                          className="flex-shrink-0 p-3 rounded-xl font-bold disabled:opacity-30 transition-all"
                          style={{ background: "rgba(226,18,39,0.2)", border: "1px solid rgba(226,18,39,0.4)", color: "#e21227", boxShadow: "0 0 14px rgba(226,18,39,0.2)" }}
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Send size={18} />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Room Tab */}
              {tab === "room" && (
                <div className="flex-1 p-6 flex flex-col gap-6">
                  {wsState === "connected" ? (
                    <>
                      {/* Room ID */}
                      <div className="p-5 rounded-2xl border border-[#222] bg-[#0d0d0d]">
                        <div className="text-[10px] text-slate-600 font-bold tracking-widest mb-3">معرّف الغرفة</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 font-mono text-2xl font-black text-white tracking-widest">
                            {roomId}
                          </div>
                          <motion.button onClick={copyRoom}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                            style={{ borderColor: copied ? "#10b98144" : "#333", color: copied ? "#10b981" : "#666" }}
                            whileHover={{ scale: 1.03 }}>
                            {copied ? <><CheckCheck size={12} />تم</> : <><Copy size={12} />نسخ</>}
                          </motion.button>
                        </div>
                        <div className="text-[10px] text-slate-600 mt-2">شارك هذا المعرّف مع فريقك للانضمام</div>
                      </div>

                      {/* My Identity */}
                      <div className="p-4 rounded-2xl border border-[#222] bg-[#0d0d0d]">
                        <div className="text-[10px] text-slate-600 font-bold tracking-widest mb-3">هويّتك في الجلسة</div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                            style={{ background: `${myColor}30`, border: `2px solid ${myColor}66`, color: myColor }}>
                            {myName.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-white">{myName}</div>
                            <div className="text-[10px] font-mono" style={{ color: myColor }}>{myId?.slice(0, 8)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "المستخدمون المتصلون", val: users.length, color: "#06b6d4", icon: Users },
                          { label: "إجمالي الرسائل",      val: messages.filter(m => m.type === "message").length, color: "#10b981", icon: MessageSquare },
                          { label: "يكتبون الآن",          val: activeTypers.length, color: "#f59e0b", icon: Radio },
                          { label: "الزمن الفعلي ms",       val: latency ?? "—", color: "#8b5cf6", icon: Activity },
                        ].map((s,i) => (
                          <motion.div key={i} className="p-4 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] flex items-center gap-3"
                            whileHover={{ scale: 1.02 }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ background: `${s.color}15`, border: `1px solid ${s.color}33` }}>
                              <s.icon size={14} color={s.color} />
                            </div>
                            <div>
                              <div className="text-xl font-black" style={{ color: s.color }}>{s.val}</div>
                              <div className="text-[9px] text-slate-600">{s.label}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4">
                      <Shield size={48} color="#e2122322" />
                      <p className="text-slate-600 text-sm">اتصل أولاً لعرض معلومات الغرفة</p>
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {tab === "users" && (
                <div className="flex-1 overflow-y-auto p-4">
                  {users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <UserPlus size={40} color="#e2122222" />
                      <p className="text-slate-600 text-sm">لا يوجد مستخدمون متصلون</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {users.map((user, i) => {
                        const isTyping = activeTypers.some(t => t.userId === user.id);
                        const isMe = user.id === myId;
                        return (
                          <motion.div key={user.id}
                            className="flex items-center gap-3 p-3 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d]"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            style={{ borderColor: isMe ? `${user.color}33` : "#1a1a1a" }}>
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                                style={{ background: `${user.color}25`, border: `2px solid ${user.color}55`, color: user.color }}>
                                {user.name.slice(0, 2)}
                              </div>
                              <motion.div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-black"
                                style={{ background: "#10b981" }}
                                animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">{user.name}</span>
                                {isMe && <span className="text-[9px] px-1.5 py-0.5 rounded-full border text-red-400 border-red-500/30 bg-red-500/10">أنت</span>}
                              </div>
                              <div className="text-[10px] font-mono text-slate-600">{user.id.slice(0, 8)}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {isTyping && (
                                <motion.div className="flex items-center gap-0.5"
                                  animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.8, repeat: Infinity }}>
                                  {[0,1,2].map(k => (
                                    <motion.div key={k} className="w-1.5 h-1.5 rounded-full"
                                      style={{ background: user.color }}
                                      animate={{ y: ["0%", "-60%", "0%"] }}
                                      transition={{ duration: 0.6, repeat: Infinity, delay: k * 0.12 }} />
                                  ))}
                                </motion.div>
                              )}
                              <div className="text-[9px] text-slate-700 flex items-center gap-1">
                                <Clock size={8} />{fmtTime(user.joinedAt)}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="relative flex items-center justify-between px-5 py-2 border-t border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4 text-[10px]">
              {[
                { c: wsState === "connected" ? "#10b981" : "#e21227", l: wsState === "connected" ? `متصل · ${users.length} مستخدم` : "غير متصل" },
                { c: "#06b6d4",  l: "WebSocket · زمن فعلي" },
                { c: "#8b5cf6",  l: latency ? `${latency}ms` : "—" },
              ].map((t, i) => (
                <motion.span key={i} style={{ color: t.c }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}>
                  ● {t.l}
                </motion.span>
              ))}
            </div>
            <motion.div className="text-[10px] text-slate-700"
              animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 3, repeat: Infinity }}>
              COLLAB · REAL-TIME · WEBSOCKET · 3D
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
