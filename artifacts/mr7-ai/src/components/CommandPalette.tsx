import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { AI_MODELS, PERSONAS } from "@/lib/ai-config";
import {
  Plus, Settings, Crown, KeyRound, Keyboard, LayoutGrid, MessageSquare,
  UserCog, Search, X, Zap, Shield, Terminal, Brain, Eye, Globe, Code2,
  Bug, Lock, Network, Radio, Cpu, FlaskConical, Rocket, GitBranch,
  Boxes, BookOpen, ChevronRight, Command, Layers, Crosshair, Bot,
  CreditCard, Star,
} from "lucide-react";

type Item = {
  id: string;
  label: string;
  labelAr: string;
  group: string;
  groupAr: string;
  icon: React.ElementType;
  color: string;
  action: () => void;
  keywords?: string;
  badge?: string;
};

const PARTICLE_COUNT = 80;
type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; size: number; color: string; opacity: number };

function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  const particles = useRef<Particle[]>([]);
  const rafId = useRef<number>(0);
  const mouse = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["#e21227", "#00e5ff", "#a78bfa", "#ffffff", "#ff4d4d", "#22d3ee"];
    particles.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      vz: (Math.random() - 0.5) * 0.001,
      size: Math.random() * 2.5 + 0.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * 0.7 + 0.2,
    }));

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = (e.clientX - rect.left) / rect.width;
      mouse.current.y = (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener("mousemove", onMouseMove);

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(226,18,39,0.04)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 60) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 60) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      for (const p of particles.current) {
        p.x += p.vx + (mouse.current.x - 0.5) * 0.00008;
        p.y += p.vy + (mouse.current.y - 0.5) * 0.00008;
        p.z += p.vz;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
        if (p.z < 0.1) p.z = 0.9; if (p.z > 1) p.z = 0.1;

        const perspective = 1 / (1 + p.z * 0.5);
        const px = p.x * w, py = p.y * h;
        const sz = p.size * perspective * 2.5;
        const alpha = p.opacity * perspective;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < particles.current.length; i++) {
        const a = particles.current[i];
        for (let j = i + 1; j < particles.current.length; j++) {
          const b = particles.current[j];
          const dx = (a.x - b.x) * canvas.width;
          const dy = (a.y - b.y) * canvas.height;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.globalAlpha = (1 - dist / 80) * 0.15;
            ctx.strokeStyle = a.color;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      rafId.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [active, canvasRef]);
}

export function CommandPalette({
  open,
  onOpenChange,
  onAction,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAction: (action: string, payload?: string) => void;
}) {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeGroup, setActiveGroup] = useState("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useParticleCanvas(canvasRef, open);

  const act = useCallback((fn: () => void) => { fn(); onOpenChange(false); }, [onOpenChange]);
  const openModal = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent("kali:open-module", { detail: { moduleId: id } }));
  }, []);

  const ALL_ITEMS = useMemo((): Item[] => [
    { id: "new-chat",     label: "New Chat",          labelAr: "محادثة جديدة",   group: "Actions", groupAr: "أوامر",   icon: Plus,         color: "text-emerald-400", action: () => act(() => onAction("new-chat")),        badge: "Ctrl+N" },
    { id: "search",       label: "Search Chats",      labelAr: "بحث المحادثات",  group: "Actions", groupAr: "أوامر",   icon: Search,       color: "text-cyan-400",   action: () => act(() => onAction("open-search")),     badge: "Ctrl+F" },
    { id: "shortcuts",    label: "Keyboard Shortcuts", labelAr: "اختصارات لوحة المفاتيح", group: "Actions", groupAr: "أوامر", icon: Keyboard, color: "text-slate-400", action: () => act(() => onAction("open-shortcuts")),  badge: "?" },
    { id: "settings",     label: "Settings",           labelAr: "الإعدادات",     group: "Actions", groupAr: "أوامر",   icon: Settings,     color: "text-slate-400",  action: () => act(() => onAction("open-settings")) },
    { id: "account",      label: "Account",            labelAr: "الحساب",        group: "Actions", groupAr: "أوامر",   icon: UserCog,      color: "text-amber-400",  action: () => act(() => onAction("open-account")) },
    { id: "upgrade",      label: "Upgrade Plan",       labelAr: "ترقية الخطة",   group: "Actions", groupAr: "أوامر",   icon: Crown,        color: "text-yellow-400", action: () => act(() => onAction("open-pricing")),    badge: "Elite" },
    { id: "api-access",   label: "API Access",         labelAr: "وصول API",      group: "Actions", groupAr: "أوامر",   icon: KeyRound,     color: "text-blue-400",   action: () => act(() => onAction("open-api")) },
    { id: "tools-hub",    label: "Tools Hub",          labelAr: "مركز الأدوات",  group: "Actions", groupAr: "أوامر",   icon: LayoutGrid,   color: "text-emerald-400", action: () => act(() => onAction("open-tools")),     badge: "Ctrl+Shift+T" },
    { id: "payment",      label: "Payment & Billing",  labelAr: "الدفع والفوترة", group: "Actions", groupAr: "أوامر",   icon: CreditCard,   color: "text-violet-400", action: () => act(() => openModal("stripe-checkout")) },
    { id: "arsenal-hub",  label: "Arsenal Hub",        labelAr: "مركز الترسانة", group: "Arsenal", groupAr: "ترسانة",  icon: Boxes,        color: "text-red-400",    action: () => act(() => openModal("arsenal")),        badge: "Hub" },
    { id: "kali-agent",   label: "KaliAgent",          labelAr: "كالي وكيل",     group: "Arsenal", groupAr: "ترسانة",  icon: Terminal,     color: "text-red-400",    action: () => act(() => openModal("agent")),          keywords: "kali agent attack" },
    { id: "nexus",        label: "NEXUS Agent",        labelAr: "وكيل نيكسوس",   group: "Arsenal", groupAr: "ترسانة",  icon: Network,      color: "text-yellow-400", action: () => act(() => openModal("nexus")),          keywords: "nexus network recon" },
    { id: "jarvis",       label: "J.A.R.V.I.S",        labelAr: "جارفيس",        group: "Arsenal", groupAr: "ترسانة",  icon: Cpu,          color: "text-cyan-400",   action: () => act(() => openModal("jarvis")),         keywords: "jarvis iron man hud" },
    { id: "parseltongue", label: "Parseltongue",        labelAr: "بارسيلتونغ",    group: "Arsenal", groupAr: "ترسانة",  icon: Lock,         color: "text-green-400",  action: () => act(() => openModal("parseltongue")),   keywords: "obfuscate encode encrypt payload" },
    { id: "ragflow",      label: "RAGFlow",             labelAr: "راغ فلو",       group: "Arsenal", groupAr: "ترسانة",  icon: BookOpen,     color: "text-blue-400",   action: () => act(() => openModal("rag")),            keywords: "rag document knowledge base" },
    { id: "open-gravity", label: "OpenGravity IDE",     labelAr: "بيئة التطوير",  group: "Arsenal", groupAr: "ترسانة",  icon: Code2,        color: "text-violet-400", action: () => act(() => openModal("openGravity")),    keywords: "ide code editor" },
    { id: "team-agent",   label: "Team Agent",          labelAr: "وكيل الفريق",   group: "Arsenal", groupAr: "ترسانة",  icon: Bot,          color: "text-orange-400", action: () => act(() => openModal("teamAgent")),      keywords: "team parallel multi agent" },
    { id: "skills-lib",   label: "Skills Library",      labelAr: "مكتبة المهارات", group: "Arsenal", groupAr: "ترسانة", icon: Star,         color: "text-emerald-400", action: () => act(() => openModal("skills")),        keywords: "skills playbooks security" },
    { id: "agent-os",     label: "Agent OS",            labelAr: "نظام الوكيل",   group: "Arsenal", groupAr: "ترسانة",  icon: Layers,       color: "text-amber-400",  action: () => act(() => openModal("agentOS")),        keywords: "agent os system automation" },
    { id: "gemini-cli",   label: "Gemini CLI",          labelAr: "جيميني CLI",    group: "Arsenal", groupAr: "ترسانة",  icon: Terminal,     color: "text-indigo-400", action: () => act(() => openModal("geminiCLI")),      keywords: "gemini cli google" },
    { id: "hermes",       label: "Hermes Agent",        labelAr: "وكيل هرمس",     group: "Arsenal", groupAr: "ترسانة",  icon: Rocket,       color: "text-yellow-400", action: () => act(() => openModal("hermes")),          keywords: "hermes messenger" },
    { id: "graphify",     label: "Graphify",            labelAr: "جرافيفاي",      group: "Arsenal", groupAr: "ترسانة",  icon: GitBranch,    color: "text-violet-400", action: () => act(() => openModal("graphify")),        keywords: "graph visualization data" },
    { id: "ai-terminal",  label: "AI Terminal",         labelAr: "طرفية الذكاء الاصطناعي", group: "Arsenal", groupAr: "ترسانة", icon: Terminal, color: "text-green-400", action: () => act(() => openModal("ai-terminal")), keywords: "terminal shell command" },
    { id: "shell-gen",    label: "Shell Generator",     labelAr: "منشئ الأوامر",  group: "Arsenal", groupAr: "ترسانة",  icon: Terminal,     color: "text-red-400",    action: () => act(() => openModal("shellGenerator")), keywords: "shell bash script generator" },
    { id: "malware",      label: "Malware Arsenal",     labelAr: "ترسانة البرامج الضارة", group: "Arsenal", groupAr: "ترسانة", icon: Bug, color: "text-red-500",     action: () => act(() => openModal("malwareArsenal")), keywords: "malware exploit payload" },
    { id: "red-team",     label: "Red Team Dash",       labelAr: "لوحة الفريق الأحمر", group: "Arsenal", groupAr: "ترسانة", icon: Crosshair, color: "text-red-400", action: () => act(() => openModal("redTeamDash")),    keywords: "red team offensive pentest" },
    { id: "osint-dash",   label: "OSINT Dashboard",     labelAr: "لوحة OSINT",    group: "Arsenal", groupAr: "ترسانة",  icon: Eye,          color: "text-cyan-400",   action: () => act(() => openModal("osintDash")),      keywords: "osint intelligence recon" },
    { id: "deep-search",  label: "Deep Search",         labelAr: "البحث العميق",  group: "Arsenal", groupAr: "ترسانة",  icon: Search,       color: "text-blue-400",   action: () => act(() => openModal("deepSearch")),     keywords: "search dark web intelligence" },
    { id: "godmode",      label: "Godmode",             labelAr: "الوضع الإلهي",  group: "Arsenal", groupAr: "ترسانة",  icon: Zap,          color: "text-yellow-400", action: () => act(() => openModal("godMod3")),         keywords: "godmode elite advanced" },
    { id: "threat-globe", label: "Threat Globe",        labelAr: "كرة التهديدات", group: "Security", groupAr: "أمن",    icon: Globe,        color: "text-red-400",    action: () => act(() => openModal("threatGlobe")),    keywords: "threat map global security" },
    { id: "attack-graph", label: "Attack Graph 3D",     labelAr: "رسم الهجوم 3D", group: "Security", groupAr: "أمن",    icon: Network,      color: "text-orange-400", action: () => act(() => openModal("attackGraph")),    keywords: "attack graph 3d visual" },
    { id: "vuln-graph",   label: "Vuln Graph 3D",       labelAr: "رسم الثغرات 3D", group: "Security", groupAr: "أمن",   icon: Bug,          color: "text-red-400",    action: () => act(() => openModal("vulnGraph3D")),    keywords: "vulnerability graph topology" },
    { id: "war-room",     label: "War Room",            labelAr: "غرفة الحرب",    group: "Security", groupAr: "أمن",    icon: Shield,       color: "text-red-500",    action: () => act(() => openModal("warRoom")),         keywords: "war room command center" },
    { id: "soc-command",  label: "SOC Command",         labelAr: "مركز SOC",      group: "Security", groupAr: "أمن",    icon: Radio,        color: "text-cyan-400",   action: () => act(() => openModal("socCommand")),     keywords: "soc security operations" },
    { id: "network-topo", label: "Network Topology",    labelAr: "طوبولوجيا الشبكة", group: "Security", groupAr: "أمن", icon: Network,      color: "text-blue-400",   action: () => act(() => openModal("networkTopo")),    keywords: "network topology map" },
    { id: "pentest-lab",  label: "PentestLab Pro",      labelAr: "مختبر الاختراق", group: "Security", groupAr: "أمن",   icon: FlaskConical, color: "text-red-400",    action: () => act(() => openModal("pentestLabPro")), keywords: "pentest lab pro" },
    ...AI_MODELS.map(m => ({
      id: `model-${m.id}`, label: m.id, labelAr: m.id,
      group: "Models", groupAr: "نماذج", icon: m.icon, color: m.color,
      action: () => act(() => onAction("set-model", m.id)),
      badge: state.activeModel === m.id ? "ACTIVE" : undefined,
      keywords: `model ai ${m.id}`,
    })),
    { id: "clear-persona", label: "Clear Persona", labelAr: "مسح الشخصية",
      group: "Personas", groupAr: "شخصيات", icon: UserCog, color: "text-slate-400",
      action: () => act(() => onAction("set-persona", "")),
      badge: !state.activePersona ? "ACTIVE" : undefined,
    },
    ...PERSONAS.map(p => ({
      id: `persona-${p.id}`, label: p.id, labelAr: p.id,
      group: "Personas", groupAr: "شخصيات", icon: p.icon, color: p.color,
      action: () => act(() => onAction("set-persona", p.id)),
      badge: state.activePersona === p.id ? "ACTIVE" : undefined,
      keywords: `persona ${p.id} ${p.desc}`,
    })),
    ...state.chats.slice(0, 12).map(c => ({
      id: `chat-${c.id}`, label: c.title || "Untitled", labelAr: c.title || "بلا عنوان",
      group: "Chats", groupAr: "محادثات", icon: MessageSquare, color: "text-slate-400",
      action: () => act(() => onAction("select-chat", c.id)),
      keywords: c.title,
    })),
  ], [act, onAction, openModal, state.activeModel, state.activePersona, state.chats]);

  const GROUPS = [
    { id: "all",      label: "الكل",     en: "All" },
    { id: "Actions",  label: "أوامر",    en: "Actions" },
    { id: "Arsenal",  label: "ترسانة",   en: "Arsenal" },
    { id: "Security", label: "أمن",      en: "Security" },
    { id: "Models",   label: "نماذج",    en: "Models" },
    { id: "Personas", label: "شخصيات",   en: "Personas" },
    { id: "Chats",    label: "محادثات",  en: "Chats" },
  ];

  const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = activeGroup === "all" ? ALL_ITEMS : ALL_ITEMS.filter(i => i.group === activeGroup);
    if (!q) return items;
    return items.filter(i => {
      const hay = [i.label, i.labelAr, i.group, i.keywords || ""].join(" ").toLowerCase();
      const terms = q.split(" ");
      return terms.every(t => hay.includes(t));
    });
  }, [query, activeGroup, ALL_ITEMS]);

  useEffect(() => { setSelectedIndex(0); }, [query, activeGroup]);

  useEffect(() => {
    if (!open) { setQuery(""); setActiveGroup("all"); return; }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter")     { e.preventDefault(); filtered[selectedIndex]?.action(); }
      if (e.key === "Escape")    { e.preventDefault(); onOpenChange(false); }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, filtered, selectedIndex, onOpenChange]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const grouped = useMemo(() => {
    if (activeGroup !== "all") return null;
    const map = new Map<string, { groupAr: string; items: Item[] }>();
    for (const item of filtered) {
      if (!map.has(item.group)) map.set(item.group, { groupAr: item.groupAr, items: [] });
      map.get(item.group)!.items.push(item);
    }
    return map;
  }, [activeGroup, filtered]);

  let flatIndex = 0;
  const renderItem = (item: Item, idx: number) => {
    const Icon = item.icon;
    const isActive = idx === selectedIndex;
    return (
      <motion.button
        key={item.id}
        initial={false}
        animate={{ opacity: 1 }}
        onMouseEnter={() => setSelectedIndex(idx)}
        onClick={item.action}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-75 group relative
          ${isActive ? "bg-gradient-to-r from-red-500/15 via-red-500/10 to-transparent border-l-2 border-red-500" : "border-l-2 border-transparent hover:bg-white/5"}`}
      >
        {isActive && (
          <motion.div
            layoutId="cmd-cursor"
            className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent pointer-events-none"
            transition={{ duration: 0.15 }}
          />
        )}
        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors
          ${isActive ? "bg-red-500/20 ring-1 ring-red-500/40" : "bg-white/5"}`}>
          <Icon className={`w-3.5 h-3.5 ${item.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-medium truncate ${isActive ? "text-white" : "text-white/80"}`}>
            {isArabic(item.labelAr) ? item.labelAr : item.label}
          </div>
          {isArabic(item.labelAr) && (
            <div className="text-[10px] text-white/30 font-mono truncate">{item.label}</div>
          )}
        </div>
        {item.badge && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider flex-shrink-0
            ${item.badge === "ACTIVE" ? "bg-red-500/30 text-red-300 ring-1 ring-red-500/40" :
              item.badge === "Elite" ? "bg-yellow-500/20 text-yellow-300" :
              "bg-white/10 text-white/50 font-mono"}`}>
            {item.badge}
          </span>
        )}
        {isActive && <ChevronRight className="w-3 h-3 text-red-400 flex-shrink-0" />}
      </motion.button>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh]"
          onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl mx-4 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #111111 100%)", border: "1px solid #1f1f1f" }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 0.6 }}
            />

            <div className="absolute inset-0 pointer-events-none" style={{
              background: "linear-gradient(180deg, rgba(226,18,39,0.06) 0%, transparent 40%)",
            }} />

            <div className="relative z-10">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
                <div className="flex items-center gap-2 text-red-500">
                  <Command className="w-4 h-4" />
                </div>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="ابحث عن أمر، نموذج، وحدة... / Search commands, models, modules..."
                  dir="auto"
                  className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm outline-none font-mono"
                  style={{ caretColor: "#e21227" }}
                />
                <div className="flex items-center gap-2">
                  {query && (
                    <button onClick={() => setQuery("")} className="text-white/30 hover:text-white/60 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <kbd className="text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5 font-mono">ESC</kbd>
                </div>
              </div>

              <div className="flex gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-hide">
                {GROUPS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroup(g.id)}
                    className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md transition-all tracking-wider
                      ${activeGroup === g.id
                        ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <div
                ref={listRef}
                className="overflow-y-auto"
                style={{ maxHeight: "min(55vh, 440px)" }}
              >
                {filtered.length === 0 ? (
                  <div className="py-12 text-center">
                    <Search className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <div className="text-white/30 text-sm">لا توجد نتائج</div>
                    <div className="text-white/20 text-xs mt-1">No results for "{query}"</div>
                  </div>
                ) : activeGroup !== "all" ? (
                  <div className="py-1">
                    {filtered.map((item, i) => renderItem(item, i))}
                  </div>
                ) : (
                  <div className="py-1">
                    {grouped && Array.from(grouped.entries()).map(([group, { groupAr, items }]) => {
                      const groupStart = flatIndex;
                      void groupStart;
                      return (
                        <div key={group}>
                          <div className="px-4 py-1.5 flex items-center gap-2">
                            <span className="text-[9px] font-bold tracking-widest text-white/20 uppercase">{groupAr}</span>
                            <div className="flex-1 h-px bg-white/5" />
                          </div>
                          {items.map(item => {
                            const idx = ALL_ITEMS.findIndex(a => a.id === item.id);
                            const fi = filtered.indexOf(item);
                            return renderItem(item, fi);
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5">
                <div className="flex items-center gap-3 text-white/20 text-[10px] font-mono">
                  <span><kbd className="border border-white/10 rounded px-1">↑↓</kbd> تنقل</span>
                  <span><kbd className="border border-white/10 rounded px-1">↵</kbd> تنفيذ</span>
                  <span><kbd className="border border-white/10 rounded px-1">ESC</kbd> إغلاق</span>
                </div>
                <div className="text-[10px] text-white/15 font-mono">
                  {filtered.length} نتيجة
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
