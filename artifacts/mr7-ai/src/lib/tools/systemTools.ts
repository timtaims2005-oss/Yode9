// ─────────────────────────────────────────────────────────────────────────────
//  SYSTEM TOOLS — أدوات الأنظمة الداخلية: الملفات، الذاكرة، OSINT، الـ AI
//  ترتبط بـ filesEngine.ts، skillsEngine.ts والأنظمة الداخلية الأخرى
// ─────────────────────────────────────────────────────────────────────────────

import { registerTool } from "../toolsRegistry";
import {
  listFiles, readFile, createFile, updateFile, deleteFile, searchInFiles, getFileStats,
} from "../filesEngine";
import {
  listSkills, createAiGeneratedSkill, deleteSkill, matchSkills,
} from "../skillsEngine";

export function registerSystemTools(): void {

  // ── أدوات الملفات ─────────────────────────────────────────────────────────

  registerTool({
    moduleId: "list_workspace_files",
    name: "List Workspace Files",
    description: "عرض قائمة بجميع الملفات المحفوظة في مساحة العمل الافتراضية",
    category: "files",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "string", description: "فلتر للبحث باسم الملف أو المسار" },
      },
    },
    execute: async (input) => {
      const files = listFiles(input.filter as string | undefined);
      if (files.length === 0) return "📁 No files in workspace yet.";
      const stats = getFileStats();
      const list = files.map((f) => `• ${f.path} [${f.language}] (${(f.size / 1024).toFixed(1)} KB)`).join("\n");
      return `📁 Workspace Files (${stats.total} total, ${(stats.totalSize / 1024).toFixed(1)} KB):\n${list}`;
    },
  });

  registerTool({
    moduleId: "read_workspace_file",
    name: "Read Workspace File",
    description: "قراءة محتوى ملف محدد من مساحة العمل",
    category: "files",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "مسار الملف أو معرّفه" },
        startLine: { type: "string", description: "رقم السطر الأول (اختياري)" },
        endLine: { type: "string", description: "رقم السطر الأخير (اختياري)" },
      },
      required: ["path"],
    },
    execute: async (input) => {
      const file = readFile(input.path as string);
      if (!file) return `❌ File not found: ${input.path}`;
      let content = file.content;
      if (input.startLine || input.endLine) {
        const lines = content.split("\n");
        const start = input.startLine ? Math.max(0, Number(input.startLine) - 1) : 0;
        const end = input.endLine ? Number(input.endLine) : lines.length;
        content = lines.slice(start, end).join("\n");
      }
      return `📄 **${file.name}** [${file.language}]\n\n\`\`\`${file.language}\n${content}\n\`\`\``;
    },
  });

  registerTool({
    moduleId: "create_workspace_file",
    name: "Create Workspace File",
    description: "إنشاء ملف جديد في مساحة العمل بمحتوى محدد",
    category: "files",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "اسم الملف مع الامتداد (مثال: script.py)" },
        content: { type: "string", description: "محتوى الملف" },
        path: { type: "string", description: "المسار الكامل (اختياري، يُشتق من الاسم)" },
        tags: { type: "string", description: "وسوم مفصولة بفواصل" },
      },
      required: ["name", "content"],
    },
    execute: async (input) => {
      const tags = input.tags ? String(input.tags).split(",").map((t: string) => t.trim()) : [];
      const file = createFile(
        input.name as string,
        input.content as string,
        input.path as string | undefined,
        tags,
      );
      return `✅ File created: **${file.name}** (${(file.size / 1024).toFixed(1)} KB) at \`${file.path}\``;
    },
  });

  registerTool({
    moduleId: "update_workspace_file",
    name: "Update Workspace File",
    description: "تحديث محتوى أو اسم ملف موجود في مساحة العمل",
    category: "files",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "مسار الملف أو معرّفه" },
        content: { type: "string", description: "المحتوى الجديد (يستبدل القديم كاملاً)" },
        newName: { type: "string", description: "الاسم الجديد للملف (اختياري)" },
      },
      required: ["path"],
    },
    execute: async (input) => {
      const updates: Record<string, string> = {};
      if (input.content) updates.content = input.content as string;
      if (input.newName) updates.name = input.newName as string;
      const file = updateFile(input.path as string, updates);
      if (!file) return `❌ File not found: ${input.path}`;
      return `✅ File updated: **${file.name}** (${(file.size / 1024).toFixed(1)} KB)`;
    },
  });

  registerTool({
    moduleId: "delete_workspace_file",
    name: "Delete Workspace File",
    description: "حذف ملف من مساحة العمل نهائياً",
    category: "files",
    confirmRequired: true,
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "مسار الملف أو معرّفه" },
      },
      required: ["path"],
    },
    execute: async (input) => {
      const ok = deleteFile(input.path as string);
      return ok ? `✅ File deleted: ${input.path}` : `❌ File not found: ${input.path}`;
    },
  });

  registerTool({
    moduleId: "search_workspace_files",
    name: "Search in Workspace Files",
    description: "البحث عن نص معين داخل محتوى ملفات مساحة العمل",
    category: "files",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "النص المراد البحث عنه" },
      },
      required: ["query"],
    },
    execute: async (input) => {
      const results = searchInFiles(input.query as string);
      if (results.length === 0) return `🔍 No matches found for "${input.query}".`;
      const list = results
        .slice(0, 10)
        .map((r) => `• **${r.file.name}** (${r.matchCount} matches): "...${r.preview}..."`)
        .join("\n");
      return `🔍 Found "${input.query}" in ${results.length} file(s):\n${list}`;
    },
  });

  // ── أدوات الذاكرة ─────────────────────────────────────────────────────────

  registerTool({
    moduleId: "save_to_memory",
    name: "Save to Memory",
    description: "حفظ معلومة مهمة في ذاكرة النظام الدائمة لاسترجاعها لاحقاً",
    category: "memory",
    inputSchema: {
      type: "object",
      properties: {
        entry: { type: "string", description: "المعلومة المراد حفظها" },
        category: { type: "string", description: "تصنيف المعلومة (fact/preference/instruction/context)" },
      },
      required: ["entry"],
    },
    execute: async (input) => {
      const entry = `[${input.category ?? "general"}] ${input.entry}`;
      window.dispatchEvent(new CustomEvent("kali:add-memory", { detail: { entry } }));
      return `✅ Saved to memory: "${String(input.entry).slice(0, 80)}"`;
    },
  });

  registerTool({
    moduleId: "read_from_memory",
    name: "Read from Memory",
    description: "قراءة المعلومات المحفوظة في ذاكرة النظام",
    category: "memory",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "string", description: "فلتر للبحث في الذاكرة (اختياري)" },
      },
    },
    execute: async (input) => {
      try {
        const raw = localStorage.getItem("mr7-memory");
        const memory: string[] = raw ? JSON.parse(raw) : [];
        if (memory.length === 0) return "🧠 Memory is empty.";
        const filtered = input.filter
          ? memory.filter((m) => m.toLowerCase().includes(String(input.filter).toLowerCase()))
          : memory;
        return `🧠 Memory (${filtered.length} entries):\n${filtered.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
      } catch {
        return "❌ Failed to read memory.";
      }
    },
  });

  // ── أدوات المهارات ────────────────────────────────────────────────────────

  registerTool({
    moduleId: "list_skills",
    name: "List Skills",
    description: "عرض قائمة المهارات المسجلة في محرك المهارات",
    category: "system",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "فلتر حسب التصنيف" },
      },
    },
    execute: async (input) => {
      const skills = listSkills(input.category as string | undefined);
      if (skills.length === 0) return "📚 No skills found.";
      const list = skills.map((s) => `• **${s.name}** [${s.category}]: ${s.description.slice(0, 80)}`).join("\n");
      return `📚 Skills (${skills.length} total):\n${list}`;
    },
  });

  registerTool({
    moduleId: "match_skills",
    name: "Match Skills",
    description: "إيجاد المهارات الأنسب لرسالة أو سياق معين",
    category: "system",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "الرسالة أو السياق المراد المطابقة معه" },
      },
      required: ["message"],
    },
    execute: async (input) => {
      const matched = matchSkills(input.message as string);
      if (matched.length === 0) return "No matching skills found.";
      return `Matched skills:\n${matched.map((s) => `• ${s.name}: ${s.description}`).join("\n")}`;
    },
  });

  registerTool({
    moduleId: "create_skill",
    name: "Create Skill",
    description: "إنشاء مهارة جديدة بمساعدة الذكاء الاصطناعي وربطها بأدوات Arsenal",
    category: "system",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "اسم المهارة" },
        description: { type: "string", description: "وصف ما تفعله المهارة" },
        systemPrompt: { type: "string", description: "نص System Prompt المستخدم عند تفعيل المهارة" },
        keywords: { type: "string", description: "كلمات مفتاحية مفصولة بفواصل" },
        toolIds: { type: "string", description: "معرّفات أدوات Arsenal مرتبطة، مفصولة بفواصل" },
      },
      required: ["name", "systemPrompt"],
    },
    execute: async (input) => {
      const keywords = input.keywords ? String(input.keywords).split(",").map((k: string) => k.trim()) : [];
      const toolIds = input.toolIds ? String(input.toolIds).split(",").map((t: string) => t.trim()) : [];
      const skill = createAiGeneratedSkill(
        input.name as string,
        (input.description as string) ?? "",
        input.systemPrompt as string,
        keywords,
        toolIds,
      );
      return `✅ Skill created: **${skill.name}** (ID: ${skill.id})`;
    },
  });

  registerTool({
    moduleId: "delete_skill",
    name: "Delete Skill",
    description: "حذف مهارة مُنشأة بالذكاء الاصطناعي من السجل",
    category: "system",
    confirmRequired: true,
    inputSchema: {
      type: "object",
      properties: {
        skillId: { type: "string", description: "معرّف المهارة" },
      },
      required: ["skillId"],
    },
    execute: async (input) => {
      const ok = deleteSkill(input.skillId as string);
      return ok ? `✅ Skill deleted: ${input.skillId}` : `❌ Skill not found or built-in: ${input.skillId}`;
    },
  });

  // ── أدوات الذكاء الاصطناعي ────────────────────────────────────────────────

  registerTool({
    moduleId: "get_system_status",
    name: "Get System Status",
    description: "الحصول على حالة النظام الكاملة: النموذج، المزوّد، الإعدادات، الإحصائيات",
    category: "ai",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      const { getFileStats } = await import("../filesEngine");
      const { listSkills } = await import("../skillsEngine");
      const { getToolCount } = await import("../toolsRegistry");
      const fileStats = getFileStats();
      const skillCount = listSkills().length;
      const toolCount = getToolCount();
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        toolsRegistry: { totalTools: toolCount },
        filesEngine: fileStats,
        skillsEngine: { totalSkills: skillCount },
        localStorage: {
          enableTools: localStorage.getItem("mr7-enable-tools"),
          language: localStorage.getItem("mr7-language") ?? "ar",
          hasMemory: !!localStorage.getItem("mr7-memory"),
        },
      }, null, 2);
    },
  });

  registerTool({
    moduleId: "get_available_tools",
    name: "Get Available Tools",
    description: "عرض قائمة بجميع الأدوات المتاحة في السجل مع أوصافها",
    category: "ai",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "فلتر حسب التصنيف (arsenal/navigation/system/files/memory/ai)" },
      },
    },
    execute: async (input) => {
      const { getRegisteredTools } = await import("../toolsRegistry");
      let tools = getRegisteredTools();
      if (input.category) {
        tools = tools.filter((t) => t.category === input.category);
      }
      const grouped: Record<string, string[]> = {};
      for (const t of tools) {
        const cat = t.category ?? "other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(`  • ${t.moduleId}: ${t.description.slice(0, 80)}`);
      }
      const output = Object.entries(grouped)
        .map(([cat, list]) => `**${cat.toUpperCase()}** (${list.length}):\n${list.join("\n")}`)
        .join("\n\n");
      return `🛠️ Available Tools (${tools.length} total):\n\n${output}`;
    },
  });

  registerTool({
    moduleId: "osint_analyze_url",
    name: "OSINT Analyze URL",
    description: "تحليل URL باستخدام استخبارات مفتوحة المصدر (تُطلق OSINT Scanner)",
    category: "system",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "الرابط المراد تحليله" },
        depth: { type: "string", description: "عمق التحليل: basic/deep/full" },
      },
      required: ["url"],
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:launch-arsenal", {
        detail: { moduleId: "osintscanner", query: input.url, analysisDepth: input.depth ?? "basic" },
      }));
      return `✅ OSINT analysis launched for: ${input.url}`;
    },
  });

  registerTool({
    moduleId: "deep_search",
    name: "Deep Search",
    description: "بحث عميق على الإنترنت باستخدام HyperResearch",
    category: "ai",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "استعلام البحث" },
        maxResults: { type: "string", description: "الحد الأقصى للنتائج" },
      },
      required: ["query"],
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:launch-arsenal", {
        detail: { moduleId: "hyperresearch", query: input.query },
      }));
      return `✅ Deep search initiated for: "${input.query}"`;
    },
  });

  registerTool({
    moduleId: "generate_code",
    name: "Generate Code",
    description: "توليد كود برمجي بلغة محددة وحفظه في مساحة العمل تلقائياً",
    category: "ai",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "وصف الكود المطلوب" },
        language: { type: "string", description: "لغة البرمجة" },
        filename: { type: "string", description: "اسم الملف للحفظ (اختياري)" },
      },
      required: ["description", "language"],
    },
    execute: async (input) => {
      const filename = (input.filename as string) ?? `generated.${input.language}`;
      // إطلاق OpenGravity IDE مع الاستعلام
      window.dispatchEvent(new CustomEvent("kali:launch-arsenal", {
        detail: { moduleId: "opengravity", query: `${input.description} in ${input.language}` },
      }));
      return `✅ Code generation launched for "${input.description}" in ${input.language}. Saving to: ${filename}`;
    },
  });

  console.log("[systemTools] ✅ Registered System & Files tools.");
}
