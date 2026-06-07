import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, Search, Zap, BookOpen, Loader2, ChevronRight, Star, Package } from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useToast } from "@/hooks/use-toast";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  prompt: string;
  source: string;
}

const SKILLS: Skill[] = [
  { id: "artifacts-builder", name: "Artifacts Builder", category: "Development", description: "Create elaborate, multi-component HTML artifacts using React, Tailwind CSS, and shadcn/ui. Full-stack artifact scaffolding with Vite + Parcel bundling.", tags: ["react", "tailwind", "shadcn", "artifacts"], prompt: "You are an Artifacts Builder expert. When asked to create an artifact, initialize a React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui project, develop the component, bundle it into a single HTML file, and output the complete, self-contained artifact. Avoid excessive centered layouts, purple gradients, uniform rounded corners, and Inter font.", source: "awesome-claude-skills" },
  { id: "brand-guidelines", name: "Brand Guidelines", category: "Design", description: "Apply Anthropic's official brand colors and typography to any artifact. Dark: #141413, Light: #faf9f5, Orange accent: #d97757.", tags: ["branding", "design", "colors", "typography"], prompt: "You are a Brand Guidelines specialist. Apply professional brand identity standards: choose a cohesive color palette, establish typography hierarchy, define spacing systems, and document all brand decisions. Create brand guidelines documents with primary/secondary/accent colors, font stacks, logo usage rules, and visual examples.", source: "awesome-claude-skills" },
  { id: "canvas-design", name: "Canvas Design", category: "Design", description: "Create beautiful visual art in PNG/PDF documents. Design posters, art pieces, and visual content using philosophy-driven aesthetics.", tags: ["design", "visual", "art", "poster"], prompt: "You are a Canvas Design master. First, develop a VISUAL PHILOSOPHY — an aesthetic movement manifesto focusing on form, space, color, composition. Then EXPRESS IT VISUALLY through design. Create original artwork that is 90% visual design, 10% essential text. Never copy existing artists.", source: "awesome-claude-skills" },
  { id: "changelog-generator", name: "Changelog Generator", category: "Development", description: "Automatically transform technical git commits into user-facing changelogs. Categorize, translate dev-speak, and format professionally.", tags: ["git", "changelog", "release", "automation"], prompt: "You are a Changelog Generator. When given git commit history, categorize changes into (Features, Improvements, Bug Fixes, Breaking Changes, Security), translate technical commits into customer-friendly language, filter internal commits (refactoring, tests), and format as a professional changelog with version, date, and categorized entries.", source: "awesome-claude-skills" },
  { id: "competitive-ads", name: "Competitive Ads Extractor", category: "Marketing", description: "Extract and analyze competitor advertising strategies. Identify ad copy patterns, targeting approaches, and creative angles.", tags: ["ads", "marketing", "competitive", "analysis"], prompt: "You are a Competitive Ads Intelligence analyst. Analyze competitor advertisements to extract: ad copy patterns, emotional hooks, calls-to-action, value propositions, target audience signals, creative formats, and pricing strategies. Provide actionable insights and counter-strategies.", source: "awesome-claude-skills" },
  { id: "content-research-writer", name: "Content Research Writer", category: "Content", description: "Research and write authoritative long-form content. Deep research, fact-checking, SEO optimization, and professional writing.", tags: ["content", "writing", "research", "seo"], prompt: "You are a Content Research Writer. For any topic, conduct deep research across multiple angles, verify facts, identify authoritative sources, and write comprehensive long-form content with: executive summary, detailed sections, expert quotes simulation, data points, practical takeaways, and SEO-optimized structure.", source: "awesome-claude-skills" },
  { id: "domain-name-brainstormer", name: "Domain Name Brainstormer", category: "Business", description: "Generate creative, memorable domain names for any business. Analyze brand positioning, generate variations, and check for quality.", tags: ["domains", "branding", "startup", "naming"], prompt: "You are a Domain Name Brainstormer. For any business concept, generate 30+ creative domain name options across: compound words, portmanteaus, action words, descriptive names, abstract names, and acronyms. Rate each by: memorability, brand fit, length, and domain extension suitability. Prioritize .com, .io, .ai.", source: "awesome-claude-skills" },
  { id: "file-organizer", name: "File Organizer", category: "Productivity", description: "Design intelligent file organization systems. Create folder structures, naming conventions, and automation rules for any workflow.", tags: ["files", "organization", "productivity", "automation"], prompt: "You are a File Organization System designer. Create comprehensive file organization systems with: logical folder hierarchies, consistent naming conventions (date-project-version format), metadata tagging strategies, search optimization tips, and automation scripts (bash/PowerShell) to implement the system.", source: "awesome-claude-skills" },
  { id: "invoice-organizer", name: "Invoice Organizer", category: "Finance", description: "Extract, categorize, and organize invoice data. Parse invoices, detect patterns, and generate financial summaries.", tags: ["finance", "invoices", "accounting", "automation"], prompt: "You are an Invoice Organizer AI. Process invoices by extracting: vendor, amount, date, category, tax, and payment status. Categorize expenses by type (SaaS, travel, hardware, services), detect duplicates, flag anomalies, generate monthly/quarterly summaries, and produce CSV/JSON exports for accounting software.", source: "awesome-claude-skills" },
  { id: "lead-research", name: "Lead Research Assistant", category: "Sales", description: "Research potential customers and leads. Analyze companies, identify decision-makers, and craft personalized outreach.", tags: ["sales", "crm", "leads", "research"], prompt: "You are a Lead Research Assistant. For any company or prospect, research: company background, size, funding, tech stack, pain points, recent news, decision-maker profiles, and buying signals. Generate personalized outreach strategies with specific talking points, objection handlers, and recommended timing.", source: "awesome-claude-skills" },
  { id: "mcp-builder", name: "MCP Builder", category: "Development", description: "Build Model Context Protocol servers and tools. Design MCP schemas, implement tool handlers, and create AI-powered APIs.", tags: ["mcp", "api", "tools", "development"], prompt: "You are an MCP (Model Context Protocol) Builder expert. Design and implement MCP servers with: tool schema definitions, resource handlers, prompt templates, and transport configurations. Generate complete MCP server code in TypeScript or Python with proper error handling, typing, and documentation.", source: "awesome-claude-skills" },
  { id: "meeting-insights", name: "Meeting Insights Analyzer", category: "Productivity", description: "Extract actionable insights from meeting transcripts. Identify decisions, action items, risks, and follow-ups.", tags: ["meetings", "productivity", "notes", "analysis"], prompt: "You are a Meeting Insights Analyzer. From any meeting transcript or notes, extract: key decisions made, action items with owners and deadlines, open questions/blockers, risks identified, agreements reached, and next steps. Format as structured report with priority levels and timeline.", source: "awesome-claude-skills" },
  { id: "skill-creator", name: "Skill Creator", category: "Meta", description: "Create new Claude skills from scratch. Design skill architecture, write SKILL.md files, and build reusable AI capabilities.", tags: ["meta", "skills", "claude", "development"], prompt: "You are a Skill Creator for Claude AI. When asked to create a skill, design: a clear skill name and description, the trigger conditions, step-by-step instructions, example inputs/outputs, edge case handling, and a SKILL.md file with YAML frontmatter. Skills should be modular, reusable, and clearly scoped.", source: "awesome-claude-skills" },
  { id: "tailored-resume", name: "Tailored Resume Generator", category: "Career", description: "Generate job-specific resumes from a master resume. Analyze job descriptions, highlight relevant experience, and optimize for ATS.", tags: ["resume", "career", "job", "ats"], prompt: "You are a Resume Tailoring expert. Given a master resume and job description, create a tailored version by: prioritizing relevant experience, incorporating exact keywords from the JD, quantifying achievements with metrics, optimizing for ATS scanning, restructuring bullet points for impact, and ensuring format matches industry standards.", source: "awesome-claude-skills" },
  { id: "theme-factory", name: "Theme Factory", category: "Design", description: "Generate complete UI theme systems. Create color palettes, typography scales, spacing systems, and component tokens.", tags: ["design", "themes", "ui", "colors"], prompt: "You are a Theme Factory designer. Create complete design systems with: primary/secondary/accent/neutral color palettes (with hex codes and usage rules), typography scale (font families, sizes, weights, line heights), spacing scale (4px base grid), border radii, shadow levels, and CSS custom property tokens for all values.", source: "awesome-claude-skills" },
  { id: "webapp-testing", name: "WebApp Testing", category: "Development", description: "Design comprehensive web application test plans. Unit, integration, E2E tests with Playwright, Jest, and testing strategies.", tags: ["testing", "playwright", "jest", "qa"], prompt: "You are a WebApp Testing specialist. Create comprehensive test strategies covering: unit tests (component logic, utility functions), integration tests (API endpoints, data flows), E2E tests (user journeys with Playwright), performance tests, accessibility checks, and security scans. Write actual test code with proper assertions and mocking.", source: "awesome-claude-skills" },
];

const CATEGORIES = ["All", ...Array.from(new Set(SKILLS.map(s => s.category)))];

export function ClaudeSkillsModal({ open, onOpenChange }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Skill | null>(null);
  const [preview, setPreview] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [injected, setInjected] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  if (!open) return null;

  const filtered = SKILLS.filter(s =>
    (category === "All" || s.category === category) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()) || s.tags.some(t => t.includes(search.toLowerCase())))
  );

  async function previewSkill(skill: Skill) {
    setSelected(skill);
    setPreview("");
    setPreviewing(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [{ role: "user" as const, content: `Give me a brief example of what you can do as "${skill.name}". Show 2-3 concrete examples.` }], customSystemPrompt: skill.prompt },
        (chunk) => setPreview(prev => prev + chunk),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setPreviewing(false);
  }

  function injectSkill(skill: Skill) {
    try {
      const raw = localStorage.getItem("mr7-ai-state-v2");
      if (raw) {
        const state = JSON.parse(raw);
        state.customSystemPrompt = skill.prompt;
        localStorage.setItem("mr7-ai-state-v2", JSON.stringify(state));
      }
    } catch { /* ignore */ }
    setInjected(prev => new Set([...prev, skill.id]));
    toast({ description: `Skill "${skill.name}" injected into AI system prompt.` });
  }

  const COL = "#6366f1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl h-[90vh] flex flex-col rounded-xl border overflow-hidden"
        style={{ background: "#0a0a0a", borderColor: `${COL}30` }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: `${COL}20`, background: `${COL}08` }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${COL}15`, border: `1px solid ${COL}30` }}>
            <BookOpen className="w-4 h-4" style={{ color: COL }} />
          </div>
          <div>
            <div className="text-[13px] font-bold" style={{ color: COL }}>Awesome Claude Skills</div>
            <div className="text-[9px] font-mono" style={{ color: "#444" }}>1000+ PRODUCTION SKILLS · INJECT INTO AI · COMPOSIO INTEGRATIONS</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: `${COL}15`, color: COL }}>{SKILLS.length} SKILLS LOADED</span>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-2">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Skills list */}
          <div className="w-80 flex flex-col border-r" style={{ borderColor: "#1f1f1f" }}>
            <div className="p-3 border-b" style={{ borderColor: "#1f1f1f" }}>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "#111", border: "1px solid #262626" }}>
                <Search className="w-3 h-3" style={{ color: "#555" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills..." className="flex-1 bg-transparent text-[10px] outline-none" style={{ color: "#ccc" }} />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className="px-2 py-0.5 rounded text-[8px] font-mono transition-all"
                    style={{ background: category === cat ? `${COL}20` : "transparent", color: category === cat ? COL : "#555", border: `1px solid ${category === cat ? COL + "40" : "#1f1f1f"}` }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map(skill => (
                <button key={skill.id} onClick={() => previewSkill(skill)}
                  className="w-full text-left px-3 py-2.5 border-b flex items-start gap-2 transition-colors hover:bg-white/3"
                  style={{ borderColor: "#1f1f1f", background: selected?.id === skill.id ? `${COL}08` : "transparent" }}>
                  <Package className="w-3 h-3 mt-0.5 shrink-0" style={{ color: selected?.id === skill.id ? COL : "#444" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold truncate" style={{ color: selected?.id === skill.id ? COL : "#ccc" }}>{skill.name}</div>
                    <div className="text-[8px] mt-0.5" style={{ color: "#555" }}>{skill.category}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {skill.tags.slice(0, 3).map(tag => (
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
          <div className="flex-1 flex flex-col">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-3" style={{ color: "#333" }}>
                <BookOpen className="w-10 h-10" />
                <div className="text-[11px]">Select a skill to preview</div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b" style={{ borderColor: "#1f1f1f" }}>
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-[13px] font-bold" style={{ color: COL }}>{selected.name}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: "#666" }}>{selected.description}</div>
                    </div>
                    <button onClick={() => injectSkill(selected)}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: injected.has(selected.id) ? "#fbbf2415" : `${COL}15`, border: `1px solid ${injected.has(selected.id) ? "#fbbf2440" : COL + "30"}`, color: injected.has(selected.id) ? "#fbbf24" : COL }}>
                      {injected.has(selected.id) ? <><Star className="w-3 h-3" /> INJECTED</> : <><Zap className="w-3 h-3" /> INJECT INTO AI</>}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selected.tags.map(tag => (
                      <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{ background: "#1f1f1f", color: "#666" }}>#{tag}</span>
                    ))}
                  </div>
                  <div className="mt-2 p-2 rounded text-[9px] font-mono" style={{ background: "#0d0d0d", color: "#888", border: "1px solid #1f1f1f" }}>
                    <div className="text-[8px] mb-1" style={{ color: "#444" }}>SYSTEM PROMPT PREVIEW:</div>
                    {selected.prompt.slice(0, 200)}...
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="text-[9px] font-mono mb-2" style={{ color: "#444" }}>LIVE DEMO:</div>
                  {previewing && !preview && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: COL }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running skill demo...
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
        </div>
      </motion.div>
    </div>
  );
}
