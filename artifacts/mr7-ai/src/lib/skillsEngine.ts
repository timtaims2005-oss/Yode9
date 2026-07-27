// ─────────────────────────────────────────────────────────────────────────────
//  SKILLS ENGINE — محرك المهارات الديناميكي المتكامل مع نظام الأدوات
//  يربط المهارات بأدوات Arsenal Hub وعناصر الـ UI والأنظمة الداخلية
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة فقط.
// ─────────────────────────────────────────────────────────────────────────────

import type { ToolDefinition } from "./toolsRegistry";

// ── أنواع المهارات ────────────────────────────────────────────────────────────
export type SkillSource = "manual" | "ai-generated" | "uploaded" | "built-in";

export type SkillTrigger = {
  keywords: string[];      // كلمات مفتاحية تُفعّل المهارة تلقائياً
  patterns?: RegExp[];     // أنماط regex اختيارية
  contextTypes?: string[]; // أنواع السياق (code/security/osint/...)
};

export type SkillToolLink = {
  toolId: string;          // معرّف الأداة في toolsRegistry
  priority: number;        // أولوية التنفيذ (1=عالية)
  autoExecute?: boolean;   // تنفيذ تلقائي دون طلب صريح؟
  inputMapping?: Record<string, string>; // ربط مدخلات المهارة بمدخلات الأداة
};

export type SkillDefinition = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  source: SkillSource;
  systemPrompt: string;    // نص الـ system prompt المضاف عند تفعيل المهارة
  trigger: SkillTrigger;
  linkedTools: SkillToolLink[];   // أدوات Arsenal مرتبطة بهذه المهارة
  category: string;
  createdAt: number;
  active: boolean;
};

// ── سجل المهارات ─────────────────────────────────────────────────────────────
const _skillsRegistry = new Map<string, SkillDefinition>();
const SKILLS_STORAGE_KEY = "mr7-skills-registry";

function _loadPersistedSkills(): void {
  try {
    const raw = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (!raw) return;
    const skills = JSON.parse(raw) as SkillDefinition[];
    for (const skill of skills) {
      _skillsRegistry.set(skill.id, skill);
    }
  } catch { /* ignore */ }
}

function _persistSkills(): void {
  try {
    const skills = Array.from(_skillsRegistry.values()).filter((s) => s.source !== "built-in");
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(skills));
  } catch { /* quota exceeded */ }
}

// تحميل عند الاستيراد
if (typeof window !== "undefined") {
  _loadPersistedSkills();
}

// ── المهارات المدمجة (built-in) ───────────────────────────────────────────────
const BUILT_IN_SKILLS: SkillDefinition[] = [
  {
    id: "skill-security-recon",
    name: "Security Recon", nameAr: "استطلاع أمني",
    description: "تفعيل وضع الاستطلاع الأمني مع ربط أدوات OSINT وفحص الثغرات",
    source: "built-in",
    systemPrompt: "You are in SECURITY RECON mode. Use OSINT tools and vulnerability scanners to gather intelligence. Be systematic, precise, and document findings clearly.",
    trigger: { keywords: ["recon", "scan", "osint", "intel", "footprint", "reconnaissance", "استطلاع", "فحص"] },
    linkedTools: [
      { toolId: "launch_osintscanner", priority: 1, autoExecute: false },
      { toolId: "launch_kaliagent", priority: 2 },
      { toolId: "launch_threatintel", priority: 3 },
    ],
    category: "security",
    createdAt: Date.now(),
    active: true,
  },
  {
    id: "skill-code-generation",
    name: "Code Generation", nameAr: "توليد الكود",
    description: "وضع إنشاء الكود مع ربط أدوات IDE والمساعدين البرمجيين",
    source: "built-in",
    systemPrompt: "You are in CODE GENERATION mode. Write clean, documented, production-ready code. Use code tools and IDE integrations when needed.",
    trigger: { keywords: ["code", "write", "function", "implement", "build", "develop", "برمجة", "كود", "اكتب"] },
    linkedTools: [
      { toolId: "launch_opengravity", priority: 1 },
      { toolId: "launch_crush", priority: 2 },
      { toolId: "launch_claudecode", priority: 3 },
    ],
    category: "coding",
    createdAt: Date.now(),
    active: true,
  },
  {
    id: "skill-deep-research",
    name: "Deep Research", nameAr: "بحث عميق",
    description: "وضع البحث العميق مع ربط محركات البحث وأدوات التحليل",
    source: "built-in",
    systemPrompt: "You are in DEEP RESEARCH mode. Use research tools to gather comprehensive information from multiple sources. Synthesize findings and provide well-cited conclusions.",
    trigger: { keywords: ["research", "analyze", "study", "investigate", "find out", "بحث", "تحليل", "ابحث"] },
    linkedTools: [
      { toolId: "launch_hyperresearch", priority: 1 },
      { toolId: "launch_odysseusDeepResearch", priority: 2 },
      { toolId: "launch_ragflow", priority: 3 },
    ],
    category: "research",
    createdAt: Date.now(),
    active: true,
  },
  {
    id: "skill-multi-agent",
    name: "Multi-Agent Orchestration", nameAr: "تنسيق عدة وكلاء",
    description: "تفعيل وضع التنسيق بين وكلاء متعددين لتنفيذ المهام المعقدة",
    source: "built-in",
    systemPrompt: "You are in MULTI-AGENT mode. Decompose complex tasks and delegate to specialized agents. Coordinate their outputs for optimal results.",
    trigger: { keywords: ["agents", "orchestrate", "parallel", "multi", "team", "وكلاء", "تعاون", "متعدد"] },
    linkedTools: [
      { toolId: "launch_omegaAgent", priority: 1 },
      { toolId: "launch_teamagent", priority: 2 },
      { toolId: "launch_agentswarm", priority: 3 },
      { toolId: "launch_nexus", priority: 4 },
    ],
    category: "orchestration",
    createdAt: Date.now(),
    active: true,
  },
  {
    id: "skill-ui-design",
    name: "UI/UX Design", nameAr: "تصميم الواجهات",
    description: "وضع تصميم الواجهات مع ربط أدوات التصميم والنماذج الأولية",
    source: "built-in",
    systemPrompt: "You are in UI/UX DESIGN mode. Create beautiful, accessible, and user-friendly interfaces. Consider design systems, accessibility, and modern patterns.",
    trigger: { keywords: ["design", "ui", "ux", "interface", "wireframe", "mockup", "تصميم", "واجهة"] },
    linkedTools: [
      { toolId: "launch_uiuxpro", priority: 1 },
      { toolId: "launch_graphify", priority: 2 },
    ],
    category: "design",
    createdAt: Date.now(),
    active: true,
  },
];

// تسجيل المهارات المدمجة عند الاستيراد
for (const skill of BUILT_IN_SKILLS) {
  _skillsRegistry.set(skill.id, skill);
}

// ── دوال إدارة المهارات ───────────────────────────────────────────────────────

export function registerSkill(def: SkillDefinition): void {
  _skillsRegistry.set(def.id, def);
  if (def.source !== "built-in") _persistSkills();
}

export function getSkill(id: string): SkillDefinition | undefined {
  return _skillsRegistry.get(id);
}

export function listSkills(category?: string): SkillDefinition[] {
  const skills = Array.from(_skillsRegistry.values()).filter((s) => s.active);
  if (!category) return skills;
  return skills.filter((s) => s.category === category);
}

export function deleteSkill(id: string): boolean {
  const skill = _skillsRegistry.get(id);
  if (!skill || skill.source === "built-in") return false;
  _skillsRegistry.delete(id);
  _persistSkills();
  return true;
}

export function createAiGeneratedSkill(
  name: string,
  description: string,
  systemPrompt: string,
  keywords: string[],
  toolIds: string[],
): SkillDefinition {
  const skill: SkillDefinition = {
    id: `skill-ai-${Date.now()}`,
    name,
    nameAr: name,
    description,
    source: "ai-generated",
    systemPrompt,
    trigger: { keywords },
    linkedTools: toolIds.map((toolId, i) => ({ toolId, priority: i + 1 })),
    category: "ai-generated",
    createdAt: Date.now(),
    active: true,
  };
  registerSkill(skill);
  return skill;
}

// ── مطابقة المهارات لسياق المحادثة ───────────────────────────────────────────

export function matchSkills(userMessage: string, maxResults = 3): SkillDefinition[] {
  const msg = userMessage.toLowerCase();
  const matched: Array<{ skill: SkillDefinition; score: number }> = [];

  for (const skill of listSkills()) {
    let score = 0;
    for (const kw of skill.trigger.keywords) {
      if (msg.includes(kw.toLowerCase())) score += 2;
    }
    if (skill.trigger.patterns) {
      for (const pattern of skill.trigger.patterns) {
        if (pattern.test(msg)) score += 3;
      }
    }
    if (score > 0) matched.push({ skill, score });
  }

  return matched
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((m) => m.skill);
}

// ── بناء System Prompt مُعزَّز بالمهارات والأدوات ────────────────────────────

export function buildSkillsAddendum(
  matchedSkills: SkillDefinition[],
  toolCount: number,
): string {
  if (matchedSkills.length === 0 && toolCount === 0) return "";

  const parts: string[] = [];

  if (matchedSkills.length > 0) {
    parts.push(`\n[ACTIVE SKILLS — ${matchedSkills.length} matched]`);
    for (const skill of matchedSkills) {
      parts.push(`\n• **${skill.name}**: ${skill.systemPrompt}`);
      if (skill.linkedTools.length > 0) {
        const toolList = skill.linkedTools.map((t) => t.toolId).join(", ");
        parts.push(`  → Recommended tools: ${toolList}`);
      }
    }
  }

  if (toolCount > 0) {
    parts.push(`\n[TOOL REGISTRY: ${toolCount} tools available — use <tool_call> blocks to invoke them]`);
  }

  return parts.join("\n");
}

// ── إنشاء مهارة تستخدم أدوات متعددة لسير عمل مركّب ────────────────────────────

export function buildToolAwareSkill(
  baseSystemPrompt: string,
  linkedTools: ToolDefinition[],
): string {
  if (linkedTools.length === 0) return baseSystemPrompt;

  const toolsContext = linkedTools
    .map((t) => `• ${t.moduleId}: ${t.description.slice(0, 100)}`)
    .join("\n");

  return `${baseSystemPrompt}\n\nYou have access to these specialized tools for this task:\n${toolsContext}\nUse them via <tool_call> blocks when they would help complete the task.`;
}

// ── بناء Manifest للمهارات (للسياق في المحادثة) ─────────────────────────────

export function buildSkillsManifest(): string {
  const skills = listSkills();
  if (skills.length === 0) return "";

  const lines = skills.map(
    (s) => `• **${s.name}** [${s.category}]: ${s.description.slice(0, 80)}`,
  );

  return `\n[SKILLS MANIFEST — ${skills.length} skills registered]\n${lines.join("\n")}`;
}

// ════════════════════════════════════════════════════════════════════════════
// USER-FACING SKILLS SYSTEM — يشبه نظام Skills في Claude
// ════════════════════════════════════════════════════════════════════════════

export type UserSkillSource = "browse" | "created-with-ai" | "manual" | "uploaded";

export type UserSkill = {
  id: string;
  name: string;
  description: string;
  triggers: string[];          // كلمات مفتاحية للتفعيل التلقائي
  instructions: string;        // نص الـ system prompt الخاص بهذه المهارة
  source: UserSkillSource;
  isCustom: boolean;
  linkedFileIds?: string[];
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
};

const CUSTOM_SKILLS_KEY = "mr7-ai-custom-skills";

// السكيلز الجاهزة المعرّفة في ClaudeSkillsModal — تُدمج مع السكيلز المخصصة
const STATIC_BROWSE_SKILLS: UserSkill[] = [
  { id: "artifacts-builder", name: "Artifacts Builder", description: "Create elaborate, multi-component HTML artifacts using React, Tailwind CSS, and shadcn/ui.", triggers: ["react", "tailwind", "artifact", "shadcn", "html", "build"], instructions: "You are an Artifacts Builder expert. When asked to create an artifact, initialize a React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui project, develop the component, bundle it into a single HTML file, and output the complete, self-contained artifact.", source: "browse", isCustom: false, createdAt: 0, updatedAt: 0 },
  { id: "brand-guidelines", name: "Brand Guidelines", description: "Apply brand colors and typography to any artifact.", triggers: ["brand", "color", "typography", "design", "logo", "palette"], instructions: "You are a Brand Guidelines specialist. Apply professional brand identity standards: choose a cohesive color palette, establish typography hierarchy, define spacing systems, and document all brand decisions.", source: "browse", isCustom: false, createdAt: 0, updatedAt: 0 },
  { id: "canvas-design", name: "Canvas Design", description: "Create beautiful visual art in PNG/PDF documents.", triggers: ["canvas", "design", "art", "poster", "visual", "رسم", "صورة"], instructions: "You are a Canvas Design master. First, develop a VISUAL PHILOSOPHY — an aesthetic movement manifesto. Then EXPRESS IT VISUALLY through design. Create original artwork that is 90% visual design, 10% essential text.", source: "browse", isCustom: false, createdAt: 0, updatedAt: 0 },
  { id: "changelog-generator", name: "Changelog Generator", description: "Transform technical git commits into user-facing changelogs.", triggers: ["changelog", "git", "release", "commit", "version", "deploy"], instructions: "You are a Changelog Generator. When given git commit history, categorize changes into (Features, Improvements, Bug Fixes, Breaking Changes, Security), translate technical commits into customer-friendly language.", source: "browse", isCustom: false, createdAt: 0, updatedAt: 0 },
  { id: "security-recon", name: "Security Recon", description: "Advanced penetration testing and security reconnaissance.", triggers: ["pentest", "recon", "nmap", "exploit", "vulnerability", "hack", "osint", "اختبار", "اختراق"], instructions: "You are a Security Reconnaissance expert. Perform thorough security assessments: enumerate targets, identify attack surfaces, analyze vulnerabilities, suggest exploitation paths, and generate detailed security reports.", source: "browse", isCustom: false, createdAt: 0, updatedAt: 0 },
  { id: "code-generation", name: "Code Generation", description: "Generate production-ready code in any language.", triggers: ["code", "function", "class", "script", "كود", "برمجة", "python", "typescript", "javascript"], instructions: "You are a Code Generation expert. Write clean, production-ready, well-documented code. Follow best practices, include error handling, write tests when appropriate, and explain key decisions.", source: "browse", isCustom: false, createdAt: 0, updatedAt: 0 },
  { id: "deep-research", name: "Deep Research", description: "Thorough multi-source research with citations.", triggers: ["research", "analyze", "study", "investigate", "compare", "بحث", "تحليل", "دراسة"], instructions: "You are a Deep Research specialist. Conduct thorough research: gather information from multiple angles, cross-reference sources, identify patterns, highlight contradictions, and present findings with clear citations and structured analysis.", source: "browse", isCustom: false, createdAt: 0, updatedAt: 0 },
  { id: "ui-ux-design", name: "UI/UX Design", description: "Design beautiful, accessible user interfaces.", triggers: ["ui", "ux", "interface", "design", "wireframe", "component", "واجهة", "تصميم"], instructions: "You are a UI/UX Design expert. Create beautiful, accessible interfaces: establish visual hierarchy, choose harmonious color systems, design intuitive interactions, and provide implementation-ready specifications.", source: "browse", isCustom: false, createdAt: 0, updatedAt: 0 },
];

function loadCustomSkills(): UserSkill[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_SKILLS_KEY) || "[]");
  } catch { return []; }
}

function saveCustomSkillsToStorage(skills: UserSkill[]): void {
  localStorage.setItem(CUSTOM_SKILLS_KEY, JSON.stringify(skills));
}

/** دمج السكيلز الجاهزة + المخصصة */
export function getAllSkills(): UserSkill[] {
  return [...STATIC_BROWSE_SKILLS, ...loadCustomSkills()];
}

export function getUserSkill(id: string): UserSkill | undefined {
  return getAllSkills().find((s) => s.id === id);
}

export function saveSkill(skill: Omit<UserSkill, "id" | "createdAt" | "updatedAt"> & Partial<Pick<UserSkill, "id">>): UserSkill {
  const custom = loadCustomSkills();
  const now = Date.now();
  const saved: UserSkill = {
    ...skill,
    id: skill.id ?? `skill-${now}`,
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
  const existing = custom.findIndex((s) => s.id === saved.id);
  if (existing !== -1) {
    custom[existing] = { ...custom[existing], ...saved, updatedAt: now };
  } else {
    custom.push(saved);
  }
  saveCustomSkillsToStorage(custom);
  return saved;
}

export function updateSkill(id: string, patch: Partial<UserSkill>): UserSkill | null {
  const custom = loadCustomSkills();
  const idx = custom.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  custom[idx] = { ...custom[idx], ...patch, updatedAt: Date.now() };
  saveCustomSkillsToStorage(custom);
  return custom[idx];
}

export function deleteUserSkill(id: string): boolean {
  const custom = loadCustomSkills();
  const filtered = custom.filter((s) => s.id !== id);
  if (filtered.length === custom.length) return false;
  saveCustomSkillsToStorage(filtered);
  return true;
}

/** يطابق رسالة المستخدم مع triggers[] و description ويُعيد أفضل 1-3 تطابقات */
export function matchUserSkills(userMessage: string, maxResults = 3): UserSkill[] {
  const lower = userMessage.toLowerCase();
  const words = lower.split(/\s+/);
  const all = getAllSkills();
  const scored = all
    .map((skill) => {
      let score = 0;
      // كلمة مفتاحية في triggers: +2
      for (const trigger of skill.triggers) {
        if (lower.includes(trigger.toLowerCase())) score += 2;
      }
      // كلمة من description: +1
      const descWords = skill.description.toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && descWords.some((d) => d.startsWith(w))) score += 1;
      }
      return { skill, score };
    })
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  const matched = scored.map(({ skill }) => skill);
  // تحديث lastUsedAt
  const now = Date.now();
  const custom = loadCustomSkills();
  let changed = false;
  for (const s of matched) {
    const idx = custom.findIndex((c) => c.id === s.id);
    if (idx !== -1) { custom[idx].lastUsedAt = now; changed = true; }
  }
  if (changed) saveCustomSkillsToStorage(custom);
  return matched;
}

/** يُنتج نص يُضاف لنهاية الـ system prompt بصيغة "SKILL ACTIVATED: [name] — [instructions]" */
export function buildUserSkillsAddendum(activeSkills: UserSkill[]): string {
  if (activeSkills.length === 0) return "";
  const lines = activeSkills.map(
    (s) => `\n\n[SKILL ACTIVATED: ${s.name}]\n${s.instructions}`,
  );
  return lines.join("");
}

/** يستخرج YAML frontmatter من ملف .md بصيغة ---\nkey: value\n--- */
export function parseSkillMarkdown(content: string): Partial<UserSkill> {
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!yamlMatch) {
    return { name: "Uploaded Skill", description: "", instructions: content.trim(), triggers: [] };
  }
  const yaml = yamlMatch[1];
  const rest = content.slice(yamlMatch[0].length).trim();
  const getName = yaml.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? "Uploaded Skill";
  const getDesc = yaml.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const getTriggers = yaml.match(/^triggers:\s*(.+)$/m)?.[1]?.trim() ?? "";
  return {
    name: getName,
    description: getDesc,
    triggers: getTriggers ? getTriggers.split(",").map((t) => t.trim()).filter(Boolean) : [],
    instructions: rest || getDesc,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADDITIONS — Memory-Aware Skill Matching (System 4 bridge)
//  إضافة خالصة — لا تعديل للكود القائم.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Memory-aware version of matchUserSkills.
 * Boosts skills that the user has triggered frequently in long-term memory.
 */
export async function matchSkillsWithMemory(
  userMessage: string,
  userSkills: UserSkill[],
  boostLTM = true,
): Promise<ReturnType<typeof matchUserSkills>> {
  const base = matchUserSkills(userMessage); // signature: (msg, maxResults=3) — userSkills param removed
  if (!boostLTM || typeof window === "undefined") return base;

  try {
    const { LTM } = await import("./agentMemory");
    const topTools = LTM.getMostUsedTools(5);
    const topToolIds = new Set(topTools.map((t) => t.toolId));

    // Boost skills if they match recently used tools
    return base.map((skill) => {
      const boosted = skill.triggers?.some((t) => topToolIds.has(t));
      return boosted ? { ...skill, score: (skill as { score?: number }).score ?? 1 + 0.2 } : skill;
    });
  } catch {
    return base;
  }
}

/**
 * Build system addendum enriched with LTM user facts.
 */
export async function buildMemoryAwareSkillsAddendum(
  userMessage: string,
  userSkills: UserSkill[],
): Promise<string> {
  const base = buildUserSkillsAddendum(userSkills); // signature: (activeSkills: UserSkill[]) — single arg
  if (typeof window === "undefined") return base;
  try {
    const { LTM } = await import("./agentMemory");
    const facts = LTM.getUserFacts(0.7).slice(0, 5);
    if (facts.length === 0) return base;
    const factsBlock = `\n\n[USER CONTEXT — Long-Term Memory]\n${facts.map((f) => `• ${f.fact}`).join("\n")}`;
    return base + factsBlock;
  } catch {
    return base;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADDITIONS v2 — Corrected Memory-Aware Functions (fix existing signature bugs)
//  إضافة خالصة — لا تعديل للكود القائم. الدوال السابقة تحمل أخطاء توقيع؛
//  هذه الدوال تُصحّح الاستخدام بتوقيعات صحيحة.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * matchSkillsWithMemoryFixed — نسخة مُصحَّحة بتوقيع صحيح.
 * توقيع matchUserSkills الأصلي: (userMessage: string, maxResults = 3): UserSkill[]
 */
export async function matchSkillsWithMemoryFixed(
  userMessage: string,
  maxResults = 3,
  boostLTM = true,
): Promise<UserSkill[]> {
  // نستخدم الدالة الأصلية بالتوقيع الصحيح
  const base = matchUserSkills(userMessage, maxResults);
  if (!boostLTM || typeof window === "undefined") return base;

  try {
    const { LTM } = await import("./agentMemory");
    const topTools = LTM.getMostUsedTools(5);
    const topToolIds = new Set(topTools.map((t) => t.toolId));

    return base.map((skill) => {
      const boosted = skill.triggers?.some((t) => topToolIds.has(t));
      return boosted ? { ...skill, _memoryBoosted: true } as unknown as UserSkill : skill;
    });
  } catch {
    return base;
  }
}

/**
 * buildMemoryAwareSkillsAddendumFixed — نسخة مُصحَّحة.
 * توقيع buildUserSkillsAddendum الأصلي: (activeSkills: UserSkill[]): string
 */
export async function buildMemoryAwareSkillsAddendumFixed(
  userMessage: string,
  maxResults = 3,
): Promise<string> {
  // استخراج المهارات أولاً ثم بناء الملحق
  const activeSkills = await matchSkillsWithMemoryFixed(userMessage, maxResults, true);
  const base = buildUserSkillsAddendum(activeSkills);
  if (typeof window === "undefined") return base;

  try {
    const { LTM } = await import("./agentMemory");
    const facts = LTM.getUserFacts(0.7).slice(0, 5);
    if (facts.length === 0) return base;
    const factsBlock = `\n\n[USER CONTEXT — Long-Term Memory]\n${facts.map((f) => `• ${f.fact}`).join("\n")}`;
    return base + factsBlock;
  } catch {
    return base;
  }
}

/**
 * getSkillSystemBlock — دالة مساعدة شاملة للـ Pipeline:
 * تُعيد System Block جاهز للإضافة إلى customSystemPrompt يشمل:
 * المهارات المتطابقة + حقائق LTM ذات الصلة
 */
export async function getSkillSystemBlock(
  userMessage: string,
  maxSkills = 3,
): Promise<{ block: string; matchedSkillNames: string[] }> {
  const skills = await matchSkillsWithMemoryFixed(userMessage, maxSkills, true);
  if (skills.length === 0) return { block: "", matchedSkillNames: [] };

  const block = await buildMemoryAwareSkillsAddendumFixed(userMessage, maxSkills);
  const matchedSkillNames = skills.map((s) => s.name);

  return { block, matchedSkillNames };
}
