import { useState, useRef, useEffect } from "react";
import { Plus, Search, TerminalSquare, Code, Globe, KeyRound, Network, FileCode, Bug, Gift, Clock, Coins, Pin, Pencil, Trash2, MessageSquare, Filter, Check, LayoutGrid, Hash, Binary, QrCode, Calculator, Regex, FileJson, Fingerprint, Terminal, ShieldAlert, Sparkles, Cookie, Lock as LockIcon, ScanLine, Server, Link as LinkIcon, Wand2, Image as ImageIcon, FileText, Languages, ShieldAlert as PhishIcon, BookOpenCheck, Activity, UserCog, TrendingUp, Mail, Brain, Bookmark, ArrowLeftRight, AtSign, Wallet, Eye, Send, Database as DbIcon, Container as ContainerIcon, FileSearch, Radar, Crosshair, ScrollText, FileCheck2, GitCommit, Music, Palette, ShieldCheck, FlaskConical } from "lucide-react";
import { AI_MODELS } from "@/lib/ai-config";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { UserMenu } from "./UserMenu";
import { TIER_TOKENS, TIER_LABELS } from "@/lib/subscription";
import { DarkWebMonitor } from "./DarkWebMonitor";

import type { UtilityTool } from "./modals/UtilityToolModal";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPricing: () => void;
  onOpenApi: () => void;
  onOpenTool: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenUtility: (name: UtilityTool) => void;
  onOpenToolsHub: () => void;
  onOpenMemory: () => void;
  onOpenBookmarks: () => void;
  onOpenSearch: () => void;
  onOpenCompare: () => void;
  onOpenQRSync?: () => void;
}

const ADDITIONAL_TOOLS: { icon: React.ElementType; label: UtilityTool; color?: string }[] = [
  { icon: KeyRound, label: "Password Generator", color: "text-emerald-400" },
  { icon: Search, label: "Email Lookup", color: "text-blue-400" },
  { icon: Server, label: "WHOIS Lookup", color: "text-blue-400" },
  { icon: Network, label: "DNS Lookup", color: "text-blue-400" },
  { icon: ScanLine, label: "Subdomain Finder", color: "text-blue-400" },
  { icon: Network, label: "IP/Domain Scanner", color: "text-amber-400" },
  { icon: LockIcon, label: "SSL Checker", color: "text-emerald-400" },
  { icon: Cookie, label: "HTTP Headers", color: "text-amber-400" },
  { icon: FileCode, label: "Hash Cracker", color: "text-purple-400" },
  { icon: Bug, label: "Vulnerability Scanner", color: "text-primary" },
  { icon: Terminal, label: "Reverse Shell Builder", color: "text-primary" },
  { icon: ShieldAlert, label: "Payload Library", color: "text-primary" },
  { icon: Hash, label: "Hash Generator", color: "text-emerald-400" },
  { icon: Binary, label: "Base64 Tool", color: "text-emerald-400" },
  { icon: LinkIcon, label: "URL Encoder", color: "text-emerald-400" },
  { icon: Fingerprint, label: "JWT Decoder", color: "text-emerald-400" },
  { icon: KeyRound, label: "Cipher Tools", color: "text-emerald-400" },
  { icon: Sparkles, label: "UUID Generator", color: "text-emerald-400" },
  { icon: KeyRound, label: "SSH Key Generator", color: "text-emerald-400" },
  { icon: Globe, label: "User Agent Generator", color: "text-emerald-400" },
  { icon: QrCode, label: "QR Code Generator", color: "text-emerald-400" },
  { icon: Calculator, label: "CIDR Calculator", color: "text-blue-400" },
  { icon: Regex, label: "Regex Tester", color: "text-blue-400" },
  { icon: FileJson, label: "JSON Formatter", color: "text-blue-400" },
  { icon: Wand2, label: "AI Prompt Enhancer", color: "text-fuchsia-400" },
  { icon: ImageIcon, label: "AI Image Prompt", color: "text-fuchsia-400" },
  { icon: FileText, label: "AI Code Explainer", color: "text-fuchsia-400" },
  { icon: BookOpenCheck, label: "AI Summarizer", color: "text-fuchsia-400" },
  { icon: Languages, label: "AI Translator", color: "text-fuchsia-400" },
  { icon: PhishIcon, label: "AI Phishing Detector", color: "text-fuchsia-400" },
  { icon: ShieldAlert, label: "AI CVE Explainer", color: "text-fuchsia-400" },
  { icon: Activity, label: "AI Log Analyzer", color: "text-fuchsia-400" },
  { icon: UserCog, label: "AI Persona Generator", color: "text-fuchsia-400" },
  { icon: TrendingUp, label: "AI SEO Writer", color: "text-fuchsia-400" },
  { icon: Mail, label: "AI Email Composer", color: "text-fuchsia-400" },
  { icon: AtSign, label: "OSINT Username Search", color: "text-blue-400" },
  { icon: DbIcon, label: "GraphQL Introspection", color: "text-blue-400" },
  { icon: FileSearch, label: "AI YARA Rule Builder", color: "text-primary" },
  { icon: Radar, label: "AI Sigma Rule Builder", color: "text-primary" },
  { icon: FileCheck2, label: "AI Smart Contract Auditor", color: "text-primary" },
  { icon: ShieldCheck, label: "AI Password Auditor", color: "text-primary" },
  { icon: ImageIcon, label: "AI Image Generator", color: "text-pink-400" },
  { icon: Wallet, label: "Wallet Validator", color: "text-emerald-400" },
  { icon: Eye, label: "Steganography", color: "text-emerald-400" },
  { icon: ContainerIcon, label: "Dockerfile Generator", color: "text-emerald-400" },
  { icon: Palette, label: "Color Palette Generator", color: "text-emerald-400" },
  { icon: Send, label: "HTTP Request Builder", color: "text-blue-400" },
  { icon: Crosshair, label: "AI MITRE ATT&CK Mapper", color: "text-fuchsia-400" },
  { icon: ScrollText, label: "AI Bug Bounty Report", color: "text-fuchsia-400" },
  { icon: GitCommit, label: "AI Git Commit Generator", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Threat Modeler", color: "text-fuchsia-400" },
  { icon: Music, label: "AI Lyrics Composer", color: "text-fuchsia-400" },
  { icon: Sparkles, label: "Parseltongue", color: "text-emerald-400" },
  { icon: Globe, label: "Dark Web Search", color: "text-purple-400" },
  { icon: Code, label: "Agent IDE", color: "text-blue-400" },
  // ── 48 AI add-on tools ──
  { icon: ScrollText, label: "AI Resume Builder", color: "text-fuchsia-400" },
  { icon: Mail, label: "AI Cover Letter", color: "text-fuchsia-400" },
  { icon: BookOpenCheck, label: "AI Interview Prep", color: "text-fuchsia-400" },
  { icon: Sparkles, label: "AI Slogan Generator", color: "text-fuchsia-400" },
  { icon: Send, label: "AI Tweet Composer", color: "text-fuchsia-400" },
  { icon: FileText, label: "AI Reddit Reply", color: "text-fuchsia-400" },
  { icon: Mail, label: "AI Email Replier", color: "text-fuchsia-400" },
  { icon: BookOpenCheck, label: "AI Meeting Summarizer", color: "text-fuchsia-400" },
  { icon: ScrollText, label: "AI Standup Note", color: "text-fuchsia-400" },
  { icon: GitCommit, label: "AI PR Description", color: "text-fuchsia-400" },
  { icon: Bug, label: "AI Bug Triage", color: "text-fuchsia-400" },
  { icon: FileCheck2, label: "AI Test Case Writer", color: "text-fuchsia-400" },
  { icon: FileCode, label: "AI Unit Test Generator", color: "text-fuchsia-400" },
  { icon: Code, label: "AI Code Refactor", color: "text-fuchsia-400" },
  { icon: FileCheck2, label: "AI Code Review", color: "text-fuchsia-400" },
  { icon: DbIcon, label: "AI SQL Generator", color: "text-fuchsia-400" },
  { icon: DbIcon, label: "AI SQL Optimizer", color: "text-fuchsia-400" },
  { icon: DbIcon, label: "AI Schema Designer", color: "text-fuchsia-400" },
  { icon: Clock, label: "AI Cron Builder", color: "text-fuchsia-400" },
  { icon: FileText, label: "AI Markdown Cheatsheet", color: "text-fuchsia-400" },
  { icon: Sparkles, label: "AI ASCII Art", color: "text-fuchsia-400" },
  { icon: Globe, label: "AI Domain Name Ideas", color: "text-fuchsia-400" },
  { icon: TrendingUp, label: "AI Startup Pitch", color: "text-fuchsia-400" },
  { icon: ScrollText, label: "AI Pitch Deck Outline", color: "text-fuchsia-400" },
  { icon: UserCog, label: "AI User Persona", color: "text-fuchsia-400" },
  { icon: Activity, label: "AI A/B Test Idea", color: "text-fuchsia-400" },
  { icon: BookOpenCheck, label: "AI Lecture Notes", color: "text-fuchsia-400" },
  { icon: ScrollText, label: "AI Flashcard Generator", color: "text-fuchsia-400" },
  { icon: Calculator, label: "AI Math Tutor", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Recipe Generator", color: "text-fuchsia-400" },
  { icon: Activity, label: "AI Workout Plan", color: "text-fuchsia-400" },
  { icon: Globe, label: "AI Trip Itinerary", color: "text-fuchsia-400" },
  { icon: FileText, label: "AI Story Plot", color: "text-fuchsia-400" },
  { icon: Sparkles, label: "AI Joke Generator", color: "text-fuchsia-400" },
  { icon: TrendingUp, label: "AI Movie Recommender", color: "text-fuchsia-400" },
  { icon: BookOpenCheck, label: "AI Book Recommender", color: "text-fuchsia-400" },
  { icon: TrendingUp, label: "AI Investment Thesis", color: "text-fuchsia-400" },
  { icon: TrendingUp, label: "AI Stock Snapshot", color: "text-fuchsia-400" },
  { icon: ShieldAlert, label: "AI Crypto Project Audit", color: "text-fuchsia-400" },
  { icon: Calculator, label: "AI Real Estate Analyzer", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Negotiation Coach", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Mediator", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Therapy Companion", color: "text-fuchsia-400" },
  { icon: ScrollText, label: "AI Lawyer (Educational)", color: "text-fuchsia-400" },
  { icon: Calculator, label: "AI Tax Reviewer", color: "text-fuchsia-400" },
  { icon: ShieldCheck, label: "AI Insurance Optimizer", color: "text-fuchsia-400" },
  { icon: Globe, label: "AI Travel Visa Help", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Chess Coach", color: "text-fuchsia-400" },
  // ── Cybersecurity Educational Tools ──
  { icon: ShieldAlert, label: "Zero-Day Exploits", color: "text-red-400" },
  { icon: Brain, label: "RaaS Architecture", color: "text-red-400" },
  { icon: ShieldAlert, label: "Supply Chain Attacks", color: "text-orange-400" },
  { icon: FileSearch, label: "Fileless Malware", color: "text-orange-400" },
  { icon: Brain, label: "Autonomous Offensive AI", color: "text-red-500" },
  { icon: Sparkles, label: "Quantum Attacks", color: "text-violet-400" },
  { icon: FlaskConical, label: "Bio-Digital Threats", color: "text-emerald-400" },
  { icon: Brain, label: "AI Model Poisoning", color: "text-pink-400" },
  { icon: Radar, label: "Kali WiFi Hacking", color: "text-cyan-400" },
  { icon: ArrowLeftRight, label: "Kali MITM Attack", color: "text-amber-400" },
  { icon: Terminal, label: "Kali Metasploit", color: "text-red-400" },
  { icon: DbIcon, label: "Kali SQLi Guide", color: "text-blue-400" },
];

export function Sidebar({ isOpen, onClose, onOpenPricing, onOpenApi, onOpenTool, onOpenSettings, onOpenAccount, onOpenUtility, onOpenToolsHub, onOpenMemory, onOpenBookmarks, onOpenSearch, onOpenCompare, onOpenQRSync }: SidebarProps) {
  const { toast } = useToast();
  const { state, dispatch } = useStore();
  const { t } = useT();

  const sessionStartRef = useRef<number>(-1);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionMessages, setSessionMessages] = useState(0);

  useEffect(() => {
    if (sessionStartRef.current === -1) {
      sessionStartRef.current = state.subscription.tokensUsed;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionStartRef.current >= 0) {
      setSessionTokens(Math.max(0, state.subscription.tokensUsed - sessionStartRef.current));
    }
  }, [state.subscription.tokensUsed]);

  useEffect(() => {
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat) setSessionMessages(activeChat.messages.filter(m => m.role === "user").length);
  }, [state.chats, state.activeChatId]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned">("all");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const filteredChats = state.chats
    .filter((c) => (filter === "pinned" ? c.pinned : true))
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  const pinned = filteredChats.filter((c) => c.pinned);
  const others = filteredChats.filter((c) => !c.pinned);

  const handleSelectChat = (id: string) => {
    dispatch({ type: "SELECT_CHAT", id });
    onClose();
  };

  const handleNewChat = () => {
    dispatch({ type: "NEW_CHAT" });
    onClose();
    toast({ description: t("toast.newChat") });
  };

  const handleSelectModel = (id: string) => {
    dispatch({ type: "SET_MODEL", model: id });
    toast({ description: t("toast.switchedModel", { model: id }) });
  };

  const handleSocial = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyPromo = () => {
    navigator.clipboard.writeText("SAVE20");
    toast({ description: "Promo code SAVE20 copied." });
  };

  const submitRename = (id: string) => {
    if (renameVal.trim()) dispatch({ type: "RENAME_CHAT", id, title: renameVal.trim() });
    setRenameId(null);
    setRenameVal("");
  };

  const content = (
    <div className="CHAT-GPT-sidebar flex flex-col h-full w-[280px] bg-sidebar border-r border-sidebar-border text-sm overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => { dispatch({ type: "SELECT_CHAT", id: state.chats[0]?.id ?? "" }); onClose(); }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">CHAT-GPT.ai</span>
        </button>
        <button onClick={onClose} className="md:hidden p-2 text-muted-foreground hover:text-foreground" aria-label="Close menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {/* Actions */}
        <div className="space-y-2">
          <button onClick={handleNewChat} className="w-full flex items-center gap-2 bg-card hover:bg-accent border border-card-border rounded-xl px-4 py-2.5 transition-colors">
            <Plus className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">{t("side.newChat")}</span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("side.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-card-border rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-primary/50 transition-colors text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Quick panels */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => { onOpenSearch(); onClose(); }}
            className="flex items-center gap-1.5 bg-card hover:bg-accent border border-card-border rounded-xl px-2.5 py-2 transition-colors text-[12px] font-semibold"
            aria-label={t("side.search")}
          >
            <Search className="w-3.5 h-3.5 text-primary" /> {t("side.search")}
          </button>
          <button
            onClick={() => { onOpenMemory(); onClose(); }}
            className="flex items-center gap-1.5 bg-card hover:bg-accent border border-card-border rounded-xl px-2.5 py-2 transition-colors text-[12px] font-semibold"
            aria-label={t("side.memory")}
          >
            <Brain className="w-3.5 h-3.5 text-emerald-400" /> {t("side.memory")}
            {state.memory.length > 0 && <span className="ml-auto text-[9px] text-emerald-400 font-mono">{state.memory.length}</span>}
          </button>
          <button
            onClick={() => { onOpenBookmarks(); onClose(); }}
            className="flex items-center gap-1.5 bg-card hover:bg-accent border border-card-border rounded-xl px-2.5 py-2 transition-colors text-[12px] font-semibold"
            aria-label={t("side.bookmarks")}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" /> {t("side.bookmarks")}
          </button>
          <button
            onClick={() => { onOpenCompare(); onClose(); }}
            className="flex items-center gap-1.5 bg-card hover:bg-accent border border-card-border rounded-xl px-2.5 py-2 transition-colors text-[12px] font-semibold"
            aria-label={t("side.compare")}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-violet-400" /> {t("side.compare")}
          </button>
        </div>

        {/* Tools Hub */}
        <button
          onClick={() => { onOpenToolsHub(); onClose(); }}
          className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 hover:from-emerald-500/20 hover:to-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2.5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-foreground text-[13px]">Tools Hub</span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded">{ADDITIONAL_TOOLS.length}</span>
        </button>

        {/* Featured Tools */}
        <div className="space-y-2">
          <h3 className="px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Featured Tools</h3>
          <button onClick={onOpenTool} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TerminalSquare className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground text-[13px]">CHAT-GPT Agent CLI</div>
                <div className="text-[11px] text-muted-foreground">AI Pentest Automation</div>
              </div>
            </div>
            <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">HOT</span>
          </button>

          <button onClick={() => onOpenUtility("Agent IDE")} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Code className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground text-[13px]">Agent IDE</div>
                <div className="text-[11px] text-muted-foreground">AI Code Generation</div>
              </div>
            </div>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">Free</span>
          </button>

          <button onClick={() => onOpenUtility("Dark Web Search")} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Globe className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground text-[13px]">Dark Web Search</div>
                <div className="text-[11px] text-muted-foreground">Leaked Data & .onion</div>
              </div>
            </div>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">Free</span>
          </button>
        </div>

        {/* AI Models */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">AI Models</h3>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{AI_MODELS.length}</span>
          </div>
          <div className="max-h-[min(60vh,560px)] overflow-y-auto pr-1 space-y-1">
            {AI_MODELS.map((m) => {
              const active = state.activeModel === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectModel(m.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors ${active ? "bg-accent" : "hover:bg-accent"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0 ${m.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-foreground text-[13px] truncate">{m.id}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {m.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">{m.badge}</span>}
                    {active && <span className="w-2 h-2 rounded-full bg-primary mr-1" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* API & Automation */}
        <div className="space-y-1.5">
          <button onClick={onOpenApi} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-emerald-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <span className="font-medium text-foreground text-[13px]">API Access</span>
            </div>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">New</span>
          </button>

          <button onClick={onOpenTool} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-blue-400">
                <TerminalSquare className="w-4 h-4" />
              </div>
              <span className="font-medium text-foreground text-[13px]">CHAT-GPT Agent</span>
            </div>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">New</span>
          </button>
        </div>

        {/* Pinned Tools */}
        {state.pinnedTools.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Pin className="w-3 h-3 text-primary" /> Pinned Tools
              </h3>
            </div>
            {state.pinnedTools.map((label) => {
              const tool = ADDITIONAL_TOOLS.find((t) => t.label === label);
              if (!tool) return null;
              return (
                <button
                  key={label}
                  onClick={() => { onOpenUtility(label as UtilityTool); onClose(); }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center ${tool.color ?? "text-foreground/80"}`}>
                    <tool.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-foreground text-[13px]">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Additional Tools */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">All Tools</h3>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{ADDITIONAL_TOOLS.length} Free</span>
          </div>

          {ADDITIONAL_TOOLS.map((tool) => (
            <button
              key={tool.label}
              onClick={() => { onOpenUtility(tool.label as UtilityTool); onClose(); }}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center ${tool.color ?? "text-foreground/80"}`}>
                  <tool.icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-foreground text-[13px]">{tool.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Snippets */}
        {state.snippets.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Snippets</h3>
            {state.snippets.slice(0, 3).map((s) => (
              <div key={s.id} className="px-2 py-1.5 rounded-lg hover:bg-accent text-[12px]">
                <div className="font-semibold text-foreground/90 truncate">{s.label}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">{s.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* Your Chats */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Chats</h3>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent" aria-label="Filter">
                  <Filter className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-40 p-1 bg-card border-border">
                {(["all", "pinned"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent text-sm capitalize"
                  >
                    {f === "all" ? "All chats" : "Pinned only"}
                    {filter === f && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {pinned.length > 0 && (
            <div className="px-2 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">Pinned</div>
          )}
          {pinned.map((c) => (
            <ChatRow
              key={c.id}
              id={c.id}
              title={c.title}
              active={state.activeChatId === c.id}
              pinned
              renameId={renameId}
              renameVal={renameVal}
              onRename={(id) => { setRenameId(id); setRenameVal(c.title); }}
              onRenameChange={setRenameVal}
              onRenameSubmit={submitRename}
              onSelect={handleSelectChat}
              onPin={(id) => dispatch({ type: "PIN_CHAT", id })}
              onDelete={(id) => { dispatch({ type: "DELETE_CHAT", id }); toast({ description: "Chat deleted." }); }}
            />
          ))}
          {others.length === 0 && pinned.length === 0 && (
            <div className="px-2 py-3 text-[12px] text-muted-foreground italic">No chats match.</div>
          )}
          {others.map((c) => (
            <ChatRow
              key={c.id}
              id={c.id}
              title={c.title}
              active={state.activeChatId === c.id}
              renameId={renameId}
              renameVal={renameVal}
              onRename={(id) => { setRenameId(id); setRenameVal(c.title); }}
              onRenameChange={setRenameVal}
              onRenameSubmit={submitRename}
              onSelect={handleSelectChat}
              onPin={(id) => dispatch({ type: "PIN_CHAT", id })}
              onDelete={(id) => { dispatch({ type: "DELETE_CHAT", id }); toast({ description: "Chat deleted." }); }}
            />
          ))}
        </div>

        <div className="h-2"></div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar space-y-3">
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Community</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleSocial("https://t.me/mr7ai")}
              className="flex-1 py-1.5 rounded-xl bg-[#1c2a3a] text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
              Telegram
            </button>
            <button
              onClick={() => handleSocial("https://instagram.com/mr7ai")}
              className="flex-1 py-1.5 rounded-xl bg-[#3a1c2a] text-pink-400 hover:bg-pink-500/20 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              Instagram
            </button>
            <button
              onClick={() => handleSocial("https://wa.me/mr7ai")}
              className="flex-1 py-1.5 rounded-xl bg-[#1c3a26] text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.88 11.89L4 20l4.22-1.11a7.93 7.93 0 0 0 3.83.98h.01a7.94 7.94 0 0 0 5.54-13.55zM12.06 18.5a6.59 6.59 0 0 1-3.36-.92l-.24-.14-2.5.66.67-2.44-.16-.25a6.6 6.6 0 1 1 12.24-3.5 6.6 6.6 0 0 1-6.65 6.59z"/></svg>
              WhatsApp
            </button>
          </div>
        </div>

        <button
          onClick={handleCopyPromo}
          className="w-full text-left bg-purple-950/40 border border-purple-800/40 rounded-xl p-3 hover:bg-purple-950/55 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Gift className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-sm text-purple-100">Special Offer!</span>
          </div>
          <p className="text-xs text-purple-200/80 mb-2">
            Use <span className="font-mono text-primary font-bold px-1 rounded bg-black/40">SAVE20</span> for 20% off
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-purple-300 font-mono">
            <Clock className="w-3.5 h-3.5" />
            2d 15h 31m
          </div>
        </button>

        {/* Subscription Status + 7-day Token Chart */}
        {(() => {
          const sub = state.subscription;
          const tokenLimit = TIER_TOKENS[sub.tier];
          const usedPct = Math.min(100, (sub.tokensUsed / tokenLimit) * 100);
          const remaining = Math.max(0, tokenLimit - sub.tokensUsed);
          const isExpired = sub.expiresAt !== null && Date.now() > sub.expiresAt;

          // Build last 7 days sparkline data
          const today = new Date();
          const days7 = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().slice(0, 10);
          });
          const tokenHistory: Record<string, number> = (state as Record<string, unknown>).tokenHistory as Record<string, number> ?? {};
          const vals = days7.map((d) => tokenHistory[d] ?? 0);
          const maxVal = Math.max(...vals, 1);

          return (
            <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-[13px] font-medium">Tokens</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {(remaining / 1000).toFixed(1)}K / {(tokenLimit / 1000).toFixed(0)}K
                </span>
              </div>

              {/* 7-day sparkline chart */}
              <div className="flex items-end gap-[3px] h-8" title="استخدام التوكن — 7 أيام">
                {vals.map((v, i) => {
                  const heightPct = maxVal > 0 ? (v / maxVal) * 100 : 0;
                  const isToday = i === 6;
                  return (
                    <div key={days7[i]} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div
                        className={`w-full rounded-sm transition-all ${isToday ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/60"}`}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                      {v > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#2a2a2a] text-[9px] text-foreground px-1 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                          {v >= 1000 ? `${(v/1000).toFixed(1)}K` : v}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Session Stats */}
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 flex flex-col items-center bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-2 py-1.5">
                  <span className="text-[9px] text-muted-foreground/60 font-mono uppercase">جلسة</span>
                  <span className="text-[11px] font-black text-violet-400 font-mono">
                    {sessionTokens >= 1000 ? `${(sessionTokens / 1000).toFixed(1)}K` : sessionTokens}
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-2 py-1.5">
                  <span className="text-[9px] text-muted-foreground/60 font-mono uppercase">رسائل</span>
                  <span className="text-[11px] font-black text-cyan-400 font-mono">{sessionMessages}</span>
                </div>
                <div className="flex-1 flex flex-col items-center bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-2 py-1.5">
                  <span className="text-[9px] text-muted-foreground/60 font-mono uppercase">تكلفة</span>
                  <span className="text-[11px] font-black text-amber-400 font-mono">
                    ${(sessionTokens * 0.000002).toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Main progress bar */}
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usedPct > 80 ? "bg-red-500" : usedPct > 50 ? "bg-amber-500" : "bg-primary"}`}
                  style={{ width: `${Math.max(2, 100 - usedPct)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className={isExpired ? "text-red-400" : ""}>
                  Plan: <span className="font-semibold text-foreground">{TIER_LABELS[sub.tier]}</span>
                  {isExpired && " (expired)"}
                </span>
                <button onClick={onOpenPricing} className="text-primary hover:underline font-semibold">
                  {sub.tier === "free" ? "Upgrade" : "Manage"}
                </button>
              </div>
            </div>
          );
        })()}

        <DarkWebMonitor />

        <div className="flex items-center justify-between pt-1">
          <UserMenu onAccount={onOpenAccount} onSettings={onOpenSettings} onTheme={onOpenSettings} />
          <div className="flex items-center gap-1">
            {onOpenQRSync && (
              <button
                onClick={onOpenQRSync}
                title="مزامنة QR عبر الأجهزة"
                className="p-1.5 rounded text-[#555] hover:text-[#aaa] hover:bg-[#1a1a1a] transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            )}
            <UserMenu trigger="dots" onAccount={onOpenAccount} onSettings={onOpenSettings} onTheme={onOpenSettings} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block h-full relative z-20">{content}</div>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="md:hidden fixed inset-0 bg-black/85 backdrop-blur-md z-40"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 flex"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatRow({
  id,
  title,
  active,
  pinned,
  renameId,
  renameVal,
  onRename,
  onRenameChange,
  onRenameSubmit,
  onSelect,
  onPin,
  onDelete,
}: {
  id: string;
  title: string;
  active: boolean;
  pinned?: boolean;
  renameId: string | null;
  renameVal: string;
  onRename: (id: string) => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: (id: string) => void;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isRenaming = renameId === id;
  return (
    <div
      className={`group flex items-center gap-2 p-2 rounded-xl transition-colors ${
        active ? "bg-accent" : "hover:bg-accent/60"
      }`}
    >
      {isRenaming ? (
        <input
          autoFocus
          value={renameVal}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={() => onRenameSubmit(id)}
          onKeyDown={(e) => { if (e.key === "Enter") onRenameSubmit(id); if (e.key === "Escape") onRenameSubmit(id); }}
          className="flex-1 bg-background border border-border rounded-md px-2 py-1 text-[13px] outline-none focus:border-primary"
        />
      ) : (
        <button onClick={() => onSelect(id)} className="flex-1 flex items-center gap-2 min-w-0 text-left">
          {pinned ? (
            <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          )}
          <span className={`truncate text-[13px] ${active ? "font-semibold text-foreground" : "text-foreground/85"}`}>{title}</span>
        </button>
      )}
      {!isRenaming && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1 rounded" aria-label="Chat menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-card border-border">
            <DropdownMenuItem onSelect={() => onPin(id)}>
              <Pin className="w-4 h-4" /> {pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRename(id)}>
              <Pencil className="w-4 h-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(id)} className="text-primary">
              <Trash2 className="w-4 h-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
