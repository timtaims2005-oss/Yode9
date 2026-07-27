import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Zap, BookOpen, Loader2, Star, Package,
  ChevronDown, MessageSquare, ClipboardList, Upload,
  Pencil, Trash2, Plus, PuzzleIcon, Clock, Check,
  AlertCircle, FolderOpen,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useToast } from "@/hooks/use-toast";
import {
  getAllSkills, saveSkill, updateSkill, deleteUserSkill,
  type UserSkill, type UserSkillSource,
} from "@/lib/skillsEngine";
import { UploadSkillModal } from "./UploadSkillModal";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

// ── السكيلز الجاهزة (Browse) — نفس البيانات الأصلية محفوظة بالكامل ──────────
interface BrowseSkill {
  id: string; name: string; category: string;
  description: string; tags: string[]; prompt: string; source: string;
}
const SKILLS: BrowseSkill[] = [
  { id: "artifacts-builder", name: "Artifacts Builder", category: "Development", description: "Create elaborate, multi-component HTML artifacts using React, Tailwind CSS, and shadcn/ui. Full-stack artifact scaffolding with Vite + Parcel bundling.", tags: ["react", "tailwind", "shadcn", "artifacts"], prompt: "You are an Artifacts Builder expert. When asked to create an artifact, initialize a React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui project, develop the component, bundle it into a single HTML file, and output the complete, self-contained artifact. Avoid excessive centered layouts, purple gradients, uniform rounded corners, and Inter font.", source: "awesome-claude-skills" },
  { id: "brand-guidelines", name: "Brand Guidelines", category: "Design", description: "Apply Anthropic's official brand colors and typography to any artifact. Dark: #141413, Light: #faf9f5, Orange accent: #d97757.", tags: ["branding", "design", "colors", "typography"], prompt: "You are a Brand Guidelines specialist. Apply professional brand identity standards: choose a cohesive color palette, establish typography hierarchy, define spacing systems, and document all brand decisions. Create brand guidelines documents with primary/secondary/accent colors, font stacks, logo usage rules, and visual examples.", source: "awesome-claude-skills" },
  { id: "canvas-design", name: "Canvas Design", category: "Design", description: "Create beautiful visual art in PNG/PDF documents. Design posters, art pieces, and visual content using philosophy-driven aesthetics.", tags: ["design", "visual", "art", "poster"], prompt: "You are a Canvas Design master. First, develop a VISUAL PHILOSOPHY — an aesthetic movement manifesto focusing on form, space, color, composition. Then EXPRESS IT VISUALLY through design. Create original artwork that is 90% visual design, 10% essential text. Never copy existing artists.", source: "awesome-claude-skills" },
  { id: "changelog-generator", name: "Changelog Generator", category: "Development", description: "Automatically transform technical git commits into user-facing changelogs. Categorize, translate dev-speak, and format professionally.", tags: ["git", "changelog", "release", "automation"], prompt: "You are a Changelog Generator. When given git commit history, categorize changes into (Features, Improvements, Bug Fixes, Breaking Changes, Security), translate technical commits into customer-friendly language, filter internal commits (refactoring, tests), and format as a professional changelog with version, date, and categorized entries.", source: "awesome-claude-skills" },
  { id: "competitive-ads", name: "Competitive Ads Extractor", category: "Marketing", description: "Extract and analyze competitor advertising strategies. Identify ad copy patterns, targeting approaches, and creative angles.", tags: ["ads", "marketing", "competitive", "analysis"], prompt: "You are a Competitive Ads Intelligence analyst. Analyze competitor advertisements to extract: ad copy patterns, emotional hooks, calls-to-action, value propositions, target audience signals, creative formats, and pricing strategies. Provide actionable insights and counter-strategies.", source: "awesome-claude-skills" },
  { id: "cursor-rules", name: "Cursor Rules Generator", category: "Development", description: "Generate comprehensive .cursorrules files for any project. Define coding standards, patterns, and AI guidance.", tags: ["cursor", "rules", "coding-standards", "ai-guidance"], prompt: "You are a Cursor Rules Generator. When given a project description or codebase context, generate a comprehensive .cursorrules file that defines: coding style preferences, naming conventions, preferred patterns/anti-patterns, file structure rules, testing requirements, and specific AI guidance for this project.", source: "awesome-claude-skills" },
  { id: "data-analysis", name: "Data Analysis", category: "Analytics", description: "Perform statistical analysis, create visualizations, and extract insights from datasets. Statistical modeling and pattern recognition.", tags: ["data", "statistics", "visualization", "ml", "insights"], prompt: "You are a Data Analysis expert. Analyze datasets to extract meaningful insights: perform statistical analysis, identify trends and patterns, create clear visualizations, apply appropriate ML techniques, and present findings with actionable recommendations backed by data.", source: "awesome-claude-skills" },
  { id: "email-writer", name: "Email Writer", category: "Communication", description: "Craft professional, persuasive emails. Cold outreach, follow-ups, and internal communications with high response rates.", tags: ["email", "communication", "copywriting", "outreach"], prompt: "You are an Email Writer specialist. Craft compelling emails with strong subject lines, personalized openings, clear value propositions, and effective CTAs. Match tone to context (formal/casual), optimize for readability, and follow best practices for deliverability and response rates.", source: "awesome-claude-skills" },
  { id: "github-expert", name: "GitHub Expert", category: "Development", description: "Master GitHub workflows, Actions, and repository management. CI/CD pipelines, branch strategies, and code review practices.", tags: ["github", "git", "cicd", "actions", "devops"], prompt: "You are a GitHub Expert. Guide through GitHub workflows: design branching strategies (GitFlow, trunk-based), set up GitHub Actions CI/CD, write effective PR templates, configure branch protection rules, manage releases with semantic versioning, and implement security best practices.", source: "awesome-claude-skills" },
  { id: "legal-analyst", name: "Legal Analyst", category: "Legal", description: "Analyze contracts, identify risks, and explain legal concepts. Contract review and compliance guidance.", tags: ["legal", "contracts", "compliance", "risk"], prompt: "You are a Legal Analyst assistant. Review and analyze legal documents to identify key clauses, potential risks, and compliance requirements. Explain legal concepts in plain language, flag concerning provisions, and provide structured summaries. Note: this is for informational purposes only, not legal advice.", source: "awesome-claude-skills" },
  { id: "market-research", name: "Market Research", category: "Marketing", description: "Conduct comprehensive market research, competitive analysis, and customer persona development.", tags: ["market", "research", "competitive", "personas", "gtm"], prompt: "You are a Market Research analyst. Conduct thorough market analysis: map the competitive landscape, define target customer segments with detailed personas, analyze market size and growth, identify trends and opportunities, assess barriers to entry, and develop actionable go-to-market recommendations.", source: "awesome-claude-skills" },
  { id: "nextjs-developer", name: "Next.js Developer", category: "Development", description: "Build production Next.js 14 applications with App Router, Server Components, and modern patterns.", tags: ["nextjs", "react", "typescript", "fullstack", "app-router"], prompt: "You are a Next.js 14 expert. Build modern Next.js applications using App Router, React Server Components, Server Actions, streaming, and parallel routes. Apply performance optimizations (image optimization, lazy loading, ISR/SSG/SSR), implement proper metadata, and follow production-ready patterns.", source: "awesome-claude-skills" },
  { id: "pitch-deck", name: "Pitch Deck Creator", category: "Business", description: "Create compelling investor pitch decks with proven narrative structures. Series A/B/C and seed stage frameworks.", tags: ["pitch", "startup", "investor", "presentation", "fundraising"], prompt: "You are a Pitch Deck Creator. Structure compelling investor presentations: problem/solution narrative, market size (TAM/SAM/SOM), business model, traction metrics, competitive moat, team highlights, and funding ask. Follow YC/a16z proven frameworks and tailor to specific investor profiles.", source: "awesome-claude-skills" },
  { id: "security-expert", name: "Security Expert", category: "Security", description: "Comprehensive cybersecurity guidance: threat modeling, vulnerability assessment, and security architecture.", tags: ["security", "cybersec", "pentest", "vulnerabilities", "architecture"], prompt: "You are a Cybersecurity Expert. Provide comprehensive security guidance: conduct threat modeling (STRIDE/MITRE ATT&CK), perform security architecture reviews, explain vulnerability classes and remediation, guide security hardening, and interpret security findings. Prioritize practical, actionable security improvements.", source: "awesome-claude-skills" },
  { id: "sql-expert", name: "SQL Expert", category: "Analytics", description: "Write optimized SQL queries, design schemas, and troubleshoot database performance.", tags: ["sql", "database", "postgres", "mysql", "optimization"], prompt: "You are a SQL Expert. Write optimized, readable SQL queries using CTEs, window functions, and proper indexing strategies. Design normalized schemas, troubleshoot query performance with EXPLAIN/ANALYZE, optimize joins and aggregations, and apply database-specific features for PostgreSQL, MySQL, and SQLite.", source: "awesome-claude-skills" },
  { id: "ux-researcher", name: "UX Researcher", category: "Design", description: "Design user research studies, analyze findings, and translate insights into product improvements.", tags: ["ux", "research", "usability", "user-testing", "personas"], prompt: "You are a UX Researcher. Design and conduct user research: create research plans, write interview guides and survey instruments, facilitate usability tests, analyze qualitative and quantitative data, synthesize findings into actionable insights, and create research reports that drive product decisions.", source: "awesome-claude-skills" },
];

const CATEGORIES = ["All", ...Array.from(new Set(SKILLS.map((s) => s.category))).sort()];
const COL = "#e21227";

function formatDate(ts: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}

export function ClaudeSkillsModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  // ── Browse tab state ───────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<BrowseSkill | null>(null);
  const [preview, setPreview] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [injected, setInjected] = useState<Set<string>>(new Set());

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"browse" | "my-skills">("browse");
  const [addOpen, setAddOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<"none" | "create-ai" | "write-manual">("none");

  // ── My Skills state ────────────────────────────────────────────────────────
  const [mySkills, setMySkills] = useState<UserSkill[]>([]);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);

  // ── Create with AI ─────────────────────────────────────────────────────────
  const [aiDesc, setAiDesc] = useState("");
  const [aiResult, setAiResult] = useState<{ name: string; description: string; triggers: string; instructions: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreviewText, setAiPreviewText] = useState("");

  // ── Write manually ─────────────────────────────────────────────────────────
  const [manName, setManName] = useState("");
  const [manDesc, setManDesc] = useState("");
  const [manTriggers, setManTriggers] = useState("");
  const [manInst, setManInst] = useState("");

  // ── Upload ─────────────────────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false);

  function refreshMySkills() {
    setMySkills(getAllSkills().filter((s) => s.isCustom));
  }

  useEffect(() => {
    if (open) { refreshMySkills(); }
    return () => { abortRef.current?.abort(); };
  }, [open]);

  // ── Browse logic (original, unchanged) ────────────────────────────────────
  const filtered = SKILLS.filter((s) => {
    const q = search.toLowerCase();
    return (
      (category === "All" || s.category === category) &&
      (!q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q)))
    );
  });

  function previewSkill(skill: BrowseSkill) {
    setSelected(skill);
    setPreview("");
    setPreviewing(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    let acc = "";
    streamChat(
      { model: "claude-3-haiku-20240307", persona: "assistant", messages: [{ role: "user", content: "Give me a very brief example of what you can do (2-3 sentences max)." }], customSystemPrompt: skill.prompt },
      (chunk) => { acc += chunk; setPreview(acc); },
      abortRef.current.signal,
    ).catch(() => {}).finally(() => setPreviewing(false));
  }

  function injectSkill(skill: BrowseSkill) {
    try {
      const raw = localStorage.getItem("mr7-ai-state-v2");
      if (!raw) { toast({ description: "لا يوجد جلسة نشطة." }); return; }
      const state = JSON.parse(raw);
      if (!state.settings) state.settings = {};
      const prev: string = state.settings.customSystemPrompt || "";
      state.settings.customSystemPrompt = prev
        ? `${prev}\n\n---\n${skill.prompt}`
        : skill.prompt;
      localStorage.setItem("mr7-ai-state-v2", JSON.stringify(state));
      setInjected((s) => new Set([...s, skill.id]));
      toast({ description: `✅ تم حقن Skill: ${skill.name}` });
    } catch { toast({ description: "فشل حقن الـ Skill." }); }
  }

  // ── Create with AI ─────────────────────────────────────────────────────────
  async function generateSkillWithAI() {
    if (!aiDesc.trim()) return;
    setAiLoading(true);
    setAiPreviewText("");
    setAiResult(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const sysPrompt = `You are a Skill Generator. The user will describe what they want an AI assistant skill to do.
Generate a complete skill definition in EXACTLY this JSON format (no markdown, no explanation — only the JSON object):
{
  "name": "Short Skill Name",
  "description": "One sentence description of what this skill does.",
  "triggers": "keyword1, keyword2, keyword3",
  "instructions": "Full system prompt for this skill (2-5 sentences, professional, imperative)"
}`;
    let acc = "";
    try {
      await streamChat(
        { model: "claude-3-haiku-20240307", persona: "assistant", messages: [{ role: "user", content: aiDesc }], customSystemPrompt: sysPrompt },
        (chunk) => { acc += chunk; setAiPreviewText(acc); },
        abortRef.current.signal,
      );
      const cleaned = acc.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
      const parsed = JSON.parse(cleaned);
      setAiResult(parsed);
    } catch {
      toast({ description: "لم يمكن توليد الـ Skill. حاول مجدداً." });
    } finally {
      setAiLoading(false);
    }
  }

  function saveAiSkill() {
    if (!aiResult) return;
    saveSkill({
      name: aiResult.name,
      description: aiResult.description,
      triggers: aiResult.triggers.split(",").map((t) => t.trim()).filter(Boolean),
      instructions: aiResult.instructions,
      source: "created-with-ai" as UserSkillSource,
      isCustom: true,
    });
    toast({ description: `✅ تم حفظ Skill: ${aiResult.name}` });
    setAiDesc(""); setAiResult(null); setAiPreviewText("");
    setSubPanel("none"); refreshMySkills();
    if (tab !== "my-skills") setTab("my-skills");
  }

  // ── Write manually ─────────────────────────────────────────────────────────
  function saveManualSkill() {
    if (!manName.trim() || !manInst.trim()) return;
    const base = editingSkill ? { id: editingSkill.id, source: editingSkill.source as UserSkillSource } : { source: "manual" as UserSkillSource };
    saveSkill({
      ...base,
      name: manName.trim(),
      description: manDesc.trim(),
      triggers: manTriggers.split(",").map((t) => t.trim()).filter(Boolean),
      instructions: manInst.trim(),
      isCustom: true,
    });
    toast({ description: `✅ تم حفظ: ${manName}` });
    setManName(""); setManDesc(""); setManTriggers(""); setManInst("");
    setEditingSkill(null); setSubPanel("none");
    refreshMySkills();
    if (tab !== "my-skills") setTab("my-skills");
  }

  function startEdit(skill: UserSkill) {
    setEditingSkill(skill);
    setManName(skill.name);
    setManDesc(skill.description);
    setManTriggers(skill.triggers.join(", "));
    setManInst(skill.instructions);
    setSubPanel("write-manual");
    setTab("my-skills");
  }

  function handleDelete(id: string) {
    deleteUserSkill(id);
    refreshMySkills();
    toast({ description: "تم حذف الـ Skill." });
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="relative flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
          style={{ width: 860, maxWidth: "96vw", height: 600, maxHeight: "92vh", background: "#0a0a0a", borderColor: "#1f1f1f" }}
        >
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0" style={{ borderColor: "#1f1f1f" }}>
            <PuzzleIcon className="w-4 h-4" style={{ color: COL }} />
            <span className="text-[13px] font-bold text-white">Skills</span>

            {/* Tabs */}
            <div className="flex items-center gap-0.5 ml-2 rounded-lg p-0.5" style={{ background: "#111" }}>
              {(["browse", "my-skills"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setSubPanel("none"); }}
                  className="px-3 py-1 rounded-md text-[10px] font-semibold transition-all"
                  style={{
                    background: tab === t ? "#1a1a1a" : "transparent",
                    color: tab === t ? "white" : "#555",
                    border: tab === t ? `1px solid #2a2a2a` : "1px solid transparent",
                  }}
                >
                  {t === "browse" ? "Browse" : `My Skills${mySkills.length > 0 ? ` (${mySkills.length})` : ""}`}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Search (browse tab only) */}
            {tab === "browse" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "#111", border: "1px solid #1f1f1f" }}>
                <Search className="w-3 h-3 text-[#444]" />
                <input
                  className="bg-transparent text-[10px] text-white outline-none placeholder:text-[#333] w-32"
                  placeholder="Search skills…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}

            {/* Add dropdown */}
            <div className="relative">
              <button
                onClick={() => setAddOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{ background: `${COL}15`, border: `1px solid ${COL}30`, color: COL }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
                <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {addOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full right-0 mt-1 w-52 rounded-xl border shadow-2xl z-50 overflow-hidden"
                    style={{ background: "#111", borderColor: "#2a2a2a" }}
                  >
                    {[
                      { key: "create-ai", icon: MessageSquare, label: "Create with Claude", desc: "Describe what you want" },
                      { key: "write-manual", icon: ClipboardList, label: "Write skill instructions", desc: "Fill in the form manually" },
                      { key: "upload", icon: Upload, label: "Upload a skill", desc: ".md · .zip · .skill" },
                    ].map(({ key, icon: Icon, label, desc }) => (
                      <button
                        key={key}
                        onClick={() => {
                          setAddOpen(false);
                          if (key === "upload") { setUploadOpen(true); }
                          else { setSubPanel(key as "create-ai" | "write-manual"); setTab("my-skills"); }
                        }}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b last:border-0"
                        style={{ borderColor: "#1a1a1a" }}
                      >
                        <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: COL }} />
                        <div>
                          <div className="text-[11px] font-semibold text-white">{label}</div>
                          <div className="text-[9px] mt-0.5" style={{ color: "#555" }}>{desc}</div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => { onOpenChange(false); window.dispatchEvent(new CustomEvent("kali:open-file-manager")); }}
              title="Workspace Files"
              className="text-[#444] hover:text-white transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button onClick={() => { abortRef.current?.abort(); onOpenChange(false); }} className="text-[#444] hover:text-white transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body ──────────────────────────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">

            {/* ════ BROWSE TAB ════════════════════════════════════════════ */}
            {tab === "browse" && (
              <>
                {/* Category filter + list */}
                <div className="w-52 shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: "#1a1a1a" }}>
                  <div className="p-2 border-b shrink-0" style={{ borderColor: "#1a1a1a" }}>
                    <div className="flex flex-wrap gap-1">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className="px-2 py-0.5 rounded text-[8px] font-medium transition-all"
                          style={{
                            background: category === cat ? `${COL}20` : "transparent",
                            color: category === cat ? COL : "#555",
                            border: `1px solid ${category === cat ? COL + "40" : "#1f1f1f"}`,
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {filtered.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => previewSkill(skill)}
                        className="w-full text-left px-3 py-2.5 border-b flex items-start gap-2 transition-colors hover:bg-white/3"
                        style={{ borderColor: "#1f1f1f", background: selected?.id === skill.id ? `${COL}08` : "transparent" }}
                      >
                        <Package className="w-3 h-3 mt-0.5 shrink-0" style={{ color: selected?.id === skill.id ? COL : "#444" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold truncate" style={{ color: selected?.id === skill.id ? COL : "#ccc" }}>{skill.name}</div>
                          <div className="text-[8px] mt-0.5" style={{ color: "#555" }}>{skill.category}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {skill.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[7px] px-1 rounded" style={{ background: "#1f1f1f", color: "#555" }}>#{tag}</span>
                            ))}
                          </div>
                        </div>
                        {injected.has(skill.id) && <Star className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview panel */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {!selected ? (
                    <div className="flex-1 flex items-center justify-center flex-col gap-3" style={{ color: "#333" }}>
                      <BookOpen className="w-10 h-10" />
                      <div className="text-[11px]">Select a skill to preview</div>
                    </div>
                  ) : (
                    <>
                      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "#1f1f1f" }}>
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-[13px] font-bold" style={{ color: COL }}>{selected.name}</div>
                            <div className="text-[9px] mt-0.5" style={{ color: "#666" }}>{selected.description}</div>
                          </div>
                          <button
                            onClick={() => injectSkill(selected)}
                            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                            style={{
                              background: injected.has(selected.id) ? "#fbbf2415" : `${COL}15`,
                              border: `1px solid ${injected.has(selected.id) ? "#fbbf2440" : COL + "30"}`,
                              color: injected.has(selected.id) ? "#fbbf24" : COL,
                            }}
                          >
                            {injected.has(selected.id) ? <><Star className="w-3 h-3" /> INJECTED</> : <><Zap className="w-3 h-3" /> INJECT INTO AI</>}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selected.tags.map((tag) => (
                            <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{ background: "#1f1f1f", color: "#666" }}>#{tag}</span>
                          ))}
                        </div>
                        <div className="mt-2 p-2 rounded text-[9px] font-mono" style={{ background: "#0d0d0d", color: "#888", border: "1px solid #1f1f1f" }}>
                          <div className="text-[8px] mb-1" style={{ color: "#444" }}>SYSTEM PROMPT PREVIEW:</div>
                          {selected.prompt.slice(0, 200)}…
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        <div className="text-[9px] font-mono mb-2" style={{ color: "#444" }}>LIVE DEMO:</div>
                        {previewing && !preview && (
                          <div className="flex items-center gap-2 text-[10px]" style={{ color: COL }}>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running skill demo…
                          </div>
                        )}
                        {preview && (
                          <div className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: "#aaa" }}>
                            {preview}
                            {previewing && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: COL }} />}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ════ MY SKILLS TAB ════════════════════════════════════════ */}
            {tab === "my-skills" && subPanel === "none" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {mySkills.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: "#2a2a2a" }}>
                    <PuzzleIcon className="w-12 h-12" />
                    <div className="text-center">
                      <div className="text-[12px] text-white/30 mb-1">لا توجد مهارات مخصصة بعد</div>
                      <div className="text-[10px]" style={{ color: "#333" }}>استخدم زر "Add" لإنشاء مهارتك الأولى</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_120px_80px] px-5 py-2 border-b text-[9px] font-semibold uppercase tracking-widest" style={{ borderColor: "#1a1a1a", color: "#444" }}>
                      <span>Skill</span>
                      <span>Last used</span>
                      <span></span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {mySkills.map((skill) => (
                        <div
                          key={skill.id}
                          className="grid grid-cols-[1fr_120px_80px] items-center px-5 py-3 border-b hover:bg-white/3 transition-colors cursor-pointer group"
                          style={{ borderColor: "#111" }}
                          onClick={() => startEdit(skill)}
                        >
                          <div>
                            <div className="text-[11px] font-semibold text-white">{skill.name}</div>
                            <div className="text-[9px] mt-0.5 truncate max-w-sm" style={{ color: "#555" }}>{skill.description || skill.instructions.slice(0, 80)}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className="text-[7px] px-1.5 py-0.5 rounded-full font-mono capitalize"
                                style={{
                                  background: skill.source === "created-with-ai" ? "#7c3aed15" : skill.source === "uploaded" ? "#059c6a15" : "#1a1a1a",
                                  color: skill.source === "created-with-ai" ? "#a78bfa" : skill.source === "uploaded" ? "#34d399" : "#555",
                                  border: `1px solid ${skill.source === "created-with-ai" ? "#7c3aed40" : skill.source === "uploaded" ? "#059c6a40" : "#2a2a2a"}`,
                                }}
                              >
                                {skill.source}
                              </span>
                              {skill.triggers.length > 0 && skill.triggers.slice(0, 3).map((t) => (
                                <span key={t} className="text-[7px] px-1 rounded font-mono" style={{ background: "#111", color: "#444" }}>#{t}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1" style={{ color: "#444" }}>
                            <Clock className="w-3 h-3" />
                            <span className="text-[9px]">{skill.lastUsedAt ? formatDate(skill.lastUsedAt) : "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(skill); }}
                              className="p-1 rounded hover:text-white transition-colors"
                              style={{ color: "#555" }}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(skill.id); }}
                              className="p-1 rounded hover:text-red-400 transition-colors"
                              style={{ color: "#555" }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ════ CREATE WITH AI ════════════════════════════════════════ */}
            {subPanel === "create-ai" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-5 py-3 border-b shrink-0 flex items-center gap-2" style={{ borderColor: "#1a1a1a" }}>
                  <button onClick={() => setSubPanel("none")} className="text-[#444] hover:text-white transition-colors text-[10px]">← رجوع</button>
                  <span className="text-[11px] font-bold text-white ml-1">Create with Claude</span>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div>
                    <div className="text-[10px] text-white/60 mb-2">اشرح ما الذي تريد أن يفعله هذا الـ Skill:</div>
                    <textarea
                      className="w-full rounded-xl px-3 py-3 text-[11px] text-white outline-none resize-none font-sans"
                      style={{ background: "#111", border: "1px solid #222", minHeight: 100 }}
                      placeholder="مثال: أريد skill يجعل الذكاء الاصطناعي خبيراً في تحليل ثغرات الأمن السيبراني وكتابة تقارير احترافية بالعربي…"
                      value={aiDesc}
                      onChange={(e) => setAiDesc(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={generateSkillWithAI}
                    disabled={!aiDesc.trim() || aiLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40"
                    style={{ background: COL, color: "white" }}
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    {aiLoading ? "جارٍ التوليد…" : "Generate Skill"}
                  </button>

                  {aiPreviewText && !aiResult && (
                    <div className="rounded-xl p-3 text-[10px] font-mono whitespace-pre-wrap" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", color: "#888" }}>
                      {aiPreviewText}
                      {aiLoading && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: COL }} />}
                    </div>
                  )}

                  {aiResult && (
                    <div className="space-y-3">
                      <div className="text-[10px] font-semibold text-white/70">معاينة Skill المُولَّد:</div>
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2a2a2a" }}>
                        {[
                          { label: "Name", value: aiResult.name },
                          { label: "Description", value: aiResult.description },
                          { label: "Triggers", value: aiResult.triggers },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex gap-3 px-4 py-2.5 border-b text-[10px]" style={{ borderColor: "#1a1a1a" }}>
                            <span className="shrink-0 w-20" style={{ color: "#555" }}>{label}</span>
                            <span className="text-white/80">{value}</span>
                          </div>
                        ))}
                        <div className="px-4 py-2.5 text-[10px]">
                          <div className="mb-1" style={{ color: "#555" }}>Instructions</div>
                          <div className="text-white/70 leading-relaxed">{aiResult.instructions}</div>
                        </div>
                      </div>
                      <button
                        onClick={saveAiSkill}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all"
                        style={{ background: "#22c55e15", border: "1px solid #22c55e40", color: "#22c55e" }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        حفظ هذا الـ Skill
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════ WRITE MANUALLY ════════════════════════════════════════ */}
            {subPanel === "write-manual" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-5 py-3 border-b shrink-0 flex items-center gap-2" style={{ borderColor: "#1a1a1a" }}>
                  <button onClick={() => { setSubPanel("none"); setEditingSkill(null); }} className="text-[#444] hover:text-white transition-colors text-[10px]">← رجوع</button>
                  <span className="text-[11px] font-bold text-white ml-1">
                    {editingSkill ? `تعديل: ${editingSkill.name}` : "Write skill instructions"}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] text-[#555] mb-1.5">الاسم *</div>
                      <input
                        className="w-full rounded-lg px-3 py-2 text-[11px] text-white outline-none"
                        style={{ background: "#111", border: "1px solid #222" }}
                        placeholder="Security Expert"
                        value={manName}
                        onChange={(e) => setManName(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-[9px] text-[#555] mb-1.5">الكلمات المفتاحية (triggers) — مفصولة بفواصل</div>
                      <input
                        className="w-full rounded-lg px-3 py-2 text-[11px] text-white outline-none"
                        style={{ background: "#111", border: "1px solid #222" }}
                        placeholder="security, hack, exploit, pentest"
                        value={manTriggers}
                        onChange={(e) => setManTriggers(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#555] mb-1.5">الوصف (يُستخدم كـ trigger أيضاً)</div>
                    <input
                      className="w-full rounded-lg px-3 py-2 text-[11px] text-white outline-none"
                      style={{ background: "#111", border: "1px solid #222" }}
                      placeholder="جملة واحدة تصف ما يفعله هذا الـ Skill"
                      value={manDesc}
                      onChange={(e) => setManDesc(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="text-[9px] text-[#555] mb-1.5">تعليمات الـ Skill (system prompt) *</div>
                    <textarea
                      className="w-full rounded-xl px-3 py-3 text-[11px] text-white outline-none resize-none font-sans"
                      style={{ background: "#111", border: "1px solid #222", minHeight: 160 }}
                      placeholder="You are a ... When asked about ..., you should ..."
                      value={manInst}
                      onChange={(e) => setManInst(e.target.value)}
                    />
                  </div>
                  {(!manName.trim() || !manInst.trim()) && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: "#555" }}>
                      <AlertCircle className="w-3 h-3" />
                      الاسم والتعليمات مطلوبان
                    </div>
                  )}
                  <button
                    onClick={saveManualSkill}
                    disabled={!manName.trim() || !manInst.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40"
                    style={{ background: COL, color: "white" }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {editingSkill ? "حفظ التعديلات" : "حفظ الـ Skill"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Backdrop close */}
        <div className="absolute inset-0 -z-10" onClick={() => { abortRef.current?.abort(); onOpenChange(false); }} />
      </div>

      {/* Upload modal */}
      <UploadSkillModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSaved={(name) => {
          setUploadOpen(false);
          refreshMySkills();
          setTab("my-skills");
          toast({ description: `✅ تم رفع Skill: ${name}` });
        }}
      />
    </>
  );
}
