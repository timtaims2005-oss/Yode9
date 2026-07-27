/**
 * /api/orchestrate — Central AI Function Calling Orchestration
 * =============================================================
 * Every user message is processed here by default. The AI model decides
 * which tools to call (if any) based on natural language understanding.
 * Returns SSE events in the same format as /api/agent so the frontend
 * can reuse the existing agent UI seamlessly.
 *
 * Supported providers (function calling):
 *   - OpenAI: gpt-4o, gpt-4o-mini, gpt-3.5-turbo
 *   - Groq:   llama-3.3-70b-instruct, llama-3.1-70b-versatile
 *   - Personal: any OpenAI-compatible model
 */

import { Router, type Request, type Response } from "express";
import { createWriteStream } from "fs";
import { promises as fsAsync } from "fs";
import path from "path";
import crypto from "crypto";
import {
  getOpenAICompatibleClient,
  listProviders,
  type ProviderName,
} from "../lib/ai-providers.js";
import { ltmStore, ltmRecall } from "../lib/agent-memory.js";
import { pool } from "../db.js";
import { checkGuardrail } from "../lib/guardrails.js";
import { saveVersion } from "../lib/version-history.js";

// ── Semantic memory helpers ────────────────────────────────────────────────────
// Uses Google/Gemini embedding API (gemini-embedding-001, 3072-dim) to produce
// real vector embeddings for pgvector cosine-similarity search.

const GEMINI_EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIM = 3072;
const EMBED_SIMILARITY_THRESHOLD = 0.7;

async function generateGeminiEmbedding(text: string): Promise<number[] | null> {
  const apiKey = (process.env.GOOGLE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim());
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embedding?: { values?: number[] } };
    const values = data?.embedding?.values;
    if (!values || values.length !== EMBED_DIM) return null;
    return values;
  } catch {
    return null;
  }
}

// ── Virtual project file store (in-memory, per-session) ───────────────────────
// Maps projectId → Map<filename, content>
// Kept in process memory; survives server restarts only if the build artifact is hot.
const virtualProjects = new Map<string, Map<string, string>>();

/**
 * Update the in-memory "current" content for a virtual project file without
 * creating a new version row (used by the version-history restore endpoint,
 * which already manages versioning itself). Exported so REST routes outside
 * this module can keep the live/session view of a file in sync with the
 * durable version history in `project_file_versions`.
 */
export function setVirtualProjectFile(
  projectId: string,
  filename: string,
  content: string,
): void {
  if (!virtualProjects.has(projectId)) {
    virtualProjects.set(projectId, new Map());
  }
  virtualProjects.get(projectId)!.set(filename, content);
}
const SESSION_PROJECT_ID = "default"; // single shared project for now

const router = Router();

// ── Upload dir for generated files ────────────────────────────────────────────
const UPLOAD_DIR = path.resolve(
  process.env.LOCAL_UPLOAD_DIR ?? "./uploads",
  "tool-output",
);
const PUBLIC_BASE = "/api/uploads/tool-output";

async function ensureUploadDir() {
  await fsAsync.mkdir(UPLOAD_DIR, { recursive: true });
}

async function saveBuffer(
  buffer: Buffer,
  ext: string,
): Promise<string> {
  await ensureUploadDir();
  const id = crypto.randomBytes(8).toString("hex");
  const filename = `${id}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  await fsAsync.writeFile(filepath, buffer);
  return `${PUBLIC_BASE}/${filename}`;
}

// ── Serve the tool-output directory ──────────────────────────────────────────
// (already handled by: app.use("/uploads", express.static(UPLOAD_DIR_ROOT)))
// We just need to make sure our subdir exists.

// ── Models that reliably support function calling ─────────────────────────────
export const TOOL_CAPABLE_MODELS = new Set([
  // OpenAI
  "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
  "o3-mini", "o4-mini",
  // Groq (Llama 3.1/3.3 support tool use)
  "llama-3.3-70b-instruct", "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.1-70b-versatile",
  "llama3-70b-8192", "llama3-8b-8192",
  // Mistral
  "mistral-large-latest", "mistral-small-latest", "codestral-latest",
  // DeepSeek
  "deepseek-v3", "deepseek-chat",
  // Cloudflare Workers AI (via v1 OpenAI-compatible endpoint)
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
]);

// ── All orchestration tools ───────────────────────────────────────────────────
export const ORCHESTRATE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "generate_image",
      description:
        "توليد صورة من وصف نصي. استخدمها عندما يطلب المستخدم صورة أو رسماً. تعيد رابط URL للصورة.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "وصف تفصيلي للصورة المطلوبة بالإنجليزية",
          },
          model: {
            type: "string",
            enum: ["flux-1-schnell", "dall-e-3"],
            description: "نموذج التوليد (الافتراضي: flux-1-schnell)",
          },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_image",
      description:
        "تحليل أو وصف صورة. استخدمها عندما يرفق المستخدم صورة أو يريد تحليل صورة من URL.",
      parameters: {
        type: "object",
        properties: {
          image_url: {
            type: "string",
            description: "رابط URL للصورة المراد تحليلها",
          },
          question: {
            type: "string",
            description: "السؤال أو طلب التحليل (اختياري)",
          },
        },
        required: ["image_url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "execute_code",
      description:
        "تنفيذ كود Python أو JavaScript في بيئة معزولة وإرجاع الناتج. استخدمها لأي حسابات، معالجة بيانات، أو تحقق من كود.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "الكود المراد تنفيذه" },
          language: {
            type: "string",
            enum: ["python", "javascript"],
            description: "لغة البرمجة (الافتراضي: python)",
          },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_pdf",
      description:
        "تحويل نص أو ماركداون إلى ملف PDF جاهز للتنزيل. يعيد رابط تنزيل.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "عنوان المستند" },
          content: {
            type: "string",
            description: "محتوى المستند (نص عادي أو ماركداون)",
          },
          language: {
            type: "string",
            enum: ["ar", "en"],
            description: "لغة المستند للتنسيق الصحيح",
          },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "extract_pdf_text",
      description: "استخراج النص من ملف PDF مرفوع. يعيد النص المستخرج.",
      parameters: {
        type: "object",
        properties: {
          pdf_url: {
            type: "string",
            description: "رابط URL لملف PDF المراد استخراج نصه",
          },
        },
        required: ["pdf_url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_docx",
      description:
        "إنشاء ملف Word (.docx) من محتوى مهيكل. يعيد رابط تنزيل الملف.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "عنوان المستند" },
          content: {
            type: "string",
            description:
              "محتوى المستند — يمكن استخدام ## للعناوين و**نص** للخط العريض",
          },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_xlsx",
      description:
        "إنشاء ملف Excel (.xlsx) مع بيانات منظمة في جداول. يعيد رابط تنزيل الملف.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "اسم الملف بدون امتداد" },
          sheets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "اسم الورقة" },
                headers: {
                  type: "array",
                  items: { type: "string" },
                  description: "أسماء الأعمدة",
                },
                rows: {
                  type: "array",
                  items: {
                    type: "array",
                    items: {},
                  },
                  description: "الصفوف — كل صف مصفوفة من القيم",
                },
              },
              required: ["name", "headers", "rows"],
            },
            description: "أوراق العمل",
          },
        },
        required: ["filename", "sheets"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_pptx",
      description:
        "إنشاء ملف PowerPoint (.pptx) مع شرائح. يعيد رابط تنزيل الملف.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "عنوان العرض التقديمي",
          },
          slides: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "عنوان الشريحة" },
                bullets: {
                  type: "array",
                  items: { type: "string" },
                  description: "نقاط الشريحة",
                },
                content: {
                  type: "string",
                  description: "نص الشريحة (بديل عن bullets)",
                },
              },
            },
            description: "قائمة الشرائح",
          },
        },
        required: ["title", "slides"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "البحث في الويب عن معلومات حديثة مع إرجاع المصادر. استخدمها للأخبار والمعلومات الراهنة.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "عبارة البحث" },
          limit: {
            type: "number",
            description: "عدد النتائج (1-8، الافتراضي: 5)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_artifact",
      description:
        "عرض كود أو تطبيق تفاعلي في لوحة Artifacts الجانبية. يفتح تلقائياً لعرض HTML/React/Python بشكل مرئي.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "عنوان التطبيق أو الكود" },
          language: {
            type: "string",
            enum: [
              "html",
              "react",
              "javascript",
              "python",
              "typescript",
              "css",
              "sql",
            ],
            description: "لغة البرمجة أو نوع المحتوى",
          },
          code: { type: "string", description: "الكود المراد عرضه" },
        },
        required: ["title", "language", "code"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "manage_project",
      description:
        "إنشاء أو جلب أو حذف مشاريع (مساحات عمل). كل مشروع له محادثاته المستقلة.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "create", "delete"],
            description: "الإجراء المطلوب",
          },
          name: {
            type: "string",
            description: "اسم المشروع (مطلوب للإنشاء)",
          },
          project_id: {
            type: "string",
            description: "معرف المشروع (مطلوب للحذف)",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_project_file",
      description:
        "كتابة أو تحديث ملف داخل المشروع الافتراضي متعدد الملفات. استخدمها لبناء تطبيقات متعددة المكونات (مثلاً: App.jsx + utils.js + style.css). يمكن للمستخدم معاينة جميع الملفات معاً في ArtifactPanel.",
      parameters: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "اسم الملف (مثلاً: App.jsx, utils.js, style.css)",
          },
          content: {
            type: "string",
            description: "محتوى الملف كاملاً",
          },
          project_id: {
            type: "string",
            description: "معرف المشروع (اختياري، افتراضي: default)",
          },
        },
        required: ["filename", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_project_files",
      description:
        "عرض قائمة بجميع الملفات الموجودة في المشروع الافتراضي متعدد الملفات.",
      parameters: {
        type: "object",
        properties: {
          project_id: {
            type: "string",
            description: "معرف المشروع (اختياري، افتراضي: default)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_project_file",
      description:
        "قراءة محتوى ملف محدد من المشروع الافتراضي.",
      parameters: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "اسم الملف المراد قراءته",
          },
          project_id: {
            type: "string",
            description: "معرف المشروع (اختياري، افتراضي: default)",
          },
        },
        required: ["filename"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_memory",
      description:
        "حفظ معلومة أو ملاحظة في الذاكرة الدائمة للمستخدم لاسترجاعها لاحقاً.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "المحتوى المراد حفظه",
          },
          title: { type: "string", description: "عنوان قصير للذاكرة" },
          tags: {
            type: "string",
            description: "وسوم مفصولة بفواصل (اختياري)",
          },
        },
        required: ["content", "title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "recall_memory",
      description:
        "البحث في الذاكرة الدائمة للمستخدم لاسترجاع معلومات سابقة.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "عبارة البحث في الذاكرة",
          },
          limit: {
            type: "number",
            description: "عدد النتائج (افتراضي: 5)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "github_repos",
      description:
        "جلب مستودعات GitHub لمستخدم أو منظمة. يعيد قائمة المستودعات مع التفاصيل.",
      parameters: {
        type: "object",
        properties: {
          username: {
            type: "string",
            description: "اسم مستخدم أو منظمة GitHub",
          },
          sort: {
            type: "string",
            enum: ["updated", "stars", "name"],
            description: "ترتيب النتائج",
          },
          limit: { type: "number", description: "عدد المستودعات (افتراضي: 10)" },
        },
        required: ["username"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "github_issues",
      description:
        "جلب قضايا (Issues) أو طلبات السحب (PRs) من مستودع GitHub.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "مالك المستودع" },
          repo: { type: "string", description: "اسم المستودع" },
          state: {
            type: "string",
            enum: ["open", "closed", "all"],
            description: "حالة القضايا",
          },
          limit: { type: "number", description: "عدد النتائج (افتراضي: 10)" },
        },
        required: ["owner", "repo"],
      },
    },
  },
  // ── Security / Pentest Tools ──────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "port_scan",
      description:
        "فحص المنافذ المفتوحة والخدمات على هدف محدد. استخدمها عندما يطلب المستخدم فحص منافذ، اكتشاف خدمات، أو أي مسح شبكي أولي. تعمل على الشبكة الداخلية أو عناوين IP/نطاقات مصرَّح بها فقط.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", description: "عنوان IP أو نطاق الهدف" },
          ports: {
            type: "string",
            description: "المنافذ المراد فحصها — أرقام مفصولة بفاصلة أو نطاق مثل '80,443,8080' أو '1-1000'. افتراضي: المنافذ الأكثر شيوعاً.",
          },
          timeout_ms: {
            type: "number",
            description: "مهلة الاتصال لكل منفذ بالملي-ثانية (افتراضي: 1000)",
          },
        },
        required: ["target"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "vuln_scan",
      description:
        "البحث عن ثغرات CVE لمنتج أو خدمة محددة عبر قاعدة بيانات NIST NVD الرسمية. استخدمها بعد اكتشاف الخدمات لمعرفة الثغرات المعروفة. لا تستهدف أنظمة حقيقية مباشرة — تبحث في قواعد البيانات العامة.",
      parameters: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description: "اسم المنتج أو الخدمة (مثال: apache, openssh, nginx, wordpress)",
          },
          version: {
            type: "string",
            description: "رقم الإصدار (اختياري، يضيق النتائج)",
          },
          severity: {
            type: "string",
            enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "all"],
            description: "تصفية حسب مستوى الخطورة (افتراضي: all)",
          },
          limit: {
            type: "number",
            description: "عدد الثغرات المُرجَعة (افتراضي: 10)",
          },
        },
        required: ["product"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "dns_recon",
      description:
        "استطلاع DNS الشامل للنطاق — سجلات A, AAAA, MX, NS, TXT, CNAME, SOA. استخدمها عند طلب معلومات DNS أو بنية النطاق أو قبل أي فحص أمني.",
      parameters: {
        type: "object",
        properties: {
          domain: { type: "string", description: "النطاق المستهدف (مثال: example.com)" },
          record_types: {
            type: "array",
            items: { type: "string", enum: ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"] },
            description: "أنواع السجلات المطلوبة (افتراضي: جميع الأنواع)",
          },
        },
        required: ["domain"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "osint_gather",
      description:
        "جمع معلومات استخباراتية مفتوحة (OSINT) عن نطاق — WHOIS، سجلات DNS، IP، ASN، ونتائج بحث عامة. استخدمها لبناء صورة أولية عن هدف قبل الفحص الأعمق.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", description: "النطاق أو عنوان IP المستهدف" },
          sources: {
            type: "array",
            items: { type: "string", enum: ["whois", "dns", "ip_info", "web_search"] },
            description: "مصادر OSINT (افتراضي: جميعها)",
          },
        },
        required: ["target"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_scan",
      description:
        "فحص أمني لتطبيق ويب — يتحقق من رؤوس HTTP الأمنية، شهادة SSL، إعادة التوجيه، وإفصاح المعلومات. استخدمها لتقييم أمان موقع ويب أو API.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "رابط الموقع أو الـ API (يجب أن يبدأ بـ http:// أو https://)" },
          checks: {
            type: "array",
            items: { type: "string", enum: ["headers", "ssl", "redirects", "info_disclosure", "cors"] },
            description: "أنواع الفحص المطلوبة (افتراضي: جميعها)",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "exploit_search",
      description:
        "البحث عن استغلالات (exploits) معروفة لثغرة أو CVE أو خدمة محددة في ExploitDB وGitHub والمصادر العامة. استخدمها بعد اكتشاف الثغرات لفهم طرق الاستغلال المعروفة.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "رقم CVE أو اسم الثغرة أو الخدمة (مثال: 'CVE-2021-44228' أو 'apache log4j rce')",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_pentest_report",
      description:
        "توليد تقرير اختبار اختراق احترافي منظم بالنتائج والتوصيات. استخدمها بعد اكتمال مراحل الفحص أو عندما يطلب المستخدم تقريراً أو ملخصاً للنتائج.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", description: "الهدف الرئيسي لاختبار الاختراق" },
          findings: {
            type: "array",
            description: "قائمة النتائج والثغرات المكتشفة",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                severity: { type: "string", enum: ["Critical", "High", "Medium", "Low", "Info"] },
                description: { type: "string" },
                evidence: { type: "string" },
                remediation: { type: "string" },
              },
            },
          },
          format: {
            type: "string",
            enum: ["markdown", "pdf"],
            description: "صيغة التقرير (افتراضي: markdown)",
          },
          tester: { type: "string", description: "اسم المختبر أو الفريق (اختياري)" },
        },
        required: ["target", "findings"],
      },
    },
  },
];

// ── Tool executors ─────────────────────────────────────────────────────────────

async function toolGenerateImage(
  prompt: string,
  model = "flux-1-schnell",
): Promise<string> {
  try {
    // Try Cloudflare Workers AI first (free)
    const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
    const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    if (cfToken && cfAccount) {
      const cfModel =
        model === "flux-1-schnell"
          ? "@cf/black-forest-labs/flux-1-schnell"
          : "@cf/black-forest-labs/flux-1-schnell";
      const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/${cfModel}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prompt.slice(0, 2048) }),
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 401) {
        return "⚠️ خطأ في المصادقة (401) مع Cloudflare: يرجى التحقق من صحة مفاتيح البيئة CLOUDFLARE_API_TOKEN و CLOUDFLARE_ACCOUNT_ID في الـ Secrets.";
      }
      if (res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("image")) {
          const buf = Buffer.from(await res.arrayBuffer());
          const fileUrl = await saveBuffer(buf, "png");
          return `تم توليد الصورة بنجاح!\n\nرابط الصورة: ${fileUrl}\n\n![الصورة المولّدة](${fileUrl})`;
        }
        const data = (await res.json()) as {
          result?: { image?: string };
          errors?: unknown[];
        };
        if (data.result?.image) {
          const buf = Buffer.from(data.result.image, "base64");
          const fileUrl = await saveBuffer(buf, "png");
          return `تم توليد الصورة!\n\n![الصورة المولّدة](${fileUrl})\n\n[تنزيل الصورة](${fileUrl})`;
        }
        return `فشل توليد الصورة عبر Cloudflare: ${JSON.stringify(data.errors ?? "unknown")}`;
      }
    }

    // Fallback: OpenAI DALL-E
    const res = await fetch("http://localhost:8080/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, size: "1024x1024" }),
      signal: AbortSignal.timeout(90_000),
    });
    const data = (await res.json()) as {
      url?: string;
      b64?: string;
      error?: string;
    };
    if (data.error) return `فشل توليد الصورة: ${data.error}`;
    if (data.url) return `تم توليد الصورة!\n\n![الصورة المولّدة](${data.url})\n\n[تنزيل الصورة](${data.url})`;
    if (data.b64) {
      const buf = Buffer.from(data.b64, "base64");
      const fileUrl = await saveBuffer(buf, "png");
      return `تم توليد الصورة!\n\n![الصورة المولّدة](${fileUrl})\n\n[تنزيل الصورة](${fileUrl})`;
    }
    return "فشل توليد الصورة — لم يُعيد الخادم بيانات صالحة.";
  } catch (e) {
    return `خطأ في توليد الصورة: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function toolAnalyzeImage(
  imageUrl: string,
  question = "صف هذه الصورة بالتفصيل",
): Promise<string> {
  try {
    const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
    const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    if (cfToken && cfAccount) {
      // Fetch image as base64
      const imgRes = await fetch(imageUrl, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!imgRes.ok) return `فشل جلب الصورة من: ${imageUrl}`;
      const imgBuf = Buffer.from(await imgRes.arrayBuffer());
      const b64 = imgBuf.toString("base64");
      const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                { type: "image", image: b64 },
                { type: "text", text: question },
              ],
            },
          ],
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 401) {
        return "⚠️ خطأ في المصادقة (401) مع Cloudflare: يرجى التحقق من صحة مفاتيح البيئة CLOUDFLARE_API_TOKEN و CLOUDFLARE_ACCOUNT_ID في الـ Secrets.";
      }
      if (res.ok) {
        const data = (await res.json()) as { result?: { response?: string } };
        return data.result?.response ?? "لم أتمكن من تحليل الصورة.";
      }
    }

    // Fallback: OpenAI vision
    const res = await fetch("http://localhost:8080/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageUrl, prompt: question }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json()) as { text?: string; error?: string };
    return data.text ?? data.error ?? "فشل تحليل الصورة.";
  } catch (e) {
    return `خطأ في تحليل الصورة: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function toolExecuteCode(
  code: string,
  language = "python",
): Promise<string> {
  try {
    const res = await fetch("http://localhost:8080/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json()) as {
      stdout?: string;
      stderr?: string;
      error?: string;
    };
    if (data.error) return `خطأ التنفيذ: ${data.error}`;
    const parts: string[] = [];
    if (data.stdout?.trim()) parts.push(`**الناتج:**\n\`\`\`\n${data.stdout.slice(0, 4000)}\n\`\`\``);
    if (data.stderr?.trim()) parts.push(`**الأخطاء:**\n\`\`\`\n${data.stderr.slice(0, 1000)}\n\`\`\``);
    return parts.length > 0 ? parts.join("\n\n") : "(لا يوجد ناتج)";
  } catch (e) {
    // Fallback: simple eval for JS
    if (language === "javascript") {
      try {
        const fn = new Function(
          `"use strict"; ${code}`,
        );
        const result = fn();
        return `**الناتج:** ${String(result ?? "(لا شيء)")}`;
      } catch (evalErr) {
        return `خطأ: ${evalErr instanceof Error ? evalErr.message : String(evalErr)}`;
      }
    }
    return `خدمة تنفيذ الكود غير متاحة: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function toolCreatePdf(
  title: string,
  content: string,
  language = "ar",
): Promise<string> {
  try {
    // Dynamic import pdfkit
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: { Title: title, Author: "KaliGPT / mr7.ai" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    await new Promise<void>((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);
      // Title
      doc.fontSize(20).font("Helvetica-Bold").text(title, { align: "center" });
      doc.moveDown(1.5);
      // Content — split by lines
      doc.fontSize(12).font("Helvetica");
      const lines = content.split("\n");
      for (const line of lines) {
        if (line.startsWith("## ")) {
          doc.moveDown(0.5);
          doc.fontSize(15).font("Helvetica-Bold").text(line.slice(3).trim());
          doc.fontSize(12).font("Helvetica");
        } else if (line.startsWith("# ")) {
          doc.moveDown(0.5);
          doc.fontSize(17).font("Helvetica-Bold").text(line.slice(2).trim());
          doc.fontSize(12).font("Helvetica");
        } else if (line.trim().startsWith("- ")) {
          doc.text(`• ${line.trim().slice(2)}`, { indent: 20 });
        } else {
          doc.text(line || " ", { lineBreak: true });
        }
      }
      doc.end();
    });
    const buffer = Buffer.concat(chunks);
    const fileUrl = await saveBuffer(buffer, "pdf");
    return `تم إنشاء ملف PDF بنجاح!\n\n**[📄 تنزيل ${title}.pdf](${fileUrl})**`;
  } catch (e) {
    return `خطأ في إنشاء PDF: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function toolExtractPdfText(pdfUrl: string): Promise<string> {
  try {
    const res = await fetch(pdfUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return `فشل جلب الملف من: ${pdfUrl}`;
    // Basic text extraction (pdfparse is optional)
    return `تم جلب الملف (${Math.round((await res.clone().arrayBuffer()).byteLength / 1024)} KB). ملاحظة: استخراج النص من PDF يتطلب معالجة متقدمة. يُنصح برفع الملف كنص مباشرة.`;
  } catch (e) {
    return `خطأ: ${e instanceof Error ? e.message : String(e)}`;
  }
}

function markdownToDocxContent(
  content: string,
): Array<{ type: string; text?: string; rows?: string[][] }> {
  const blocks: Array<{ type: string; text?: string; rows?: string[][] }> = [];
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.startsWith("# "))
      blocks.push({ type: "heading1", text: line.slice(2).trim() });
    else if (line.startsWith("## "))
      blocks.push({ type: "heading2", text: line.slice(3).trim() });
    else if (line.startsWith("### "))
      blocks.push({ type: "heading3", text: line.slice(4).trim() });
    else if (line.trim())
      blocks.push({ type: "paragraph", text: line.trim() });
  }
  return blocks;
}

async function toolCreateDocx(title: string, content: string): Promise<string> {
  try {
    const blocks = markdownToDocxContent(content);
    const res = await fetch("http://localhost:8080/api/files/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: blocks }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      return `فشل إنشاء DOCX: ${err.error ?? res.statusText}`;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const fileUrl = await saveBuffer(buffer, "docx");
    return `تم إنشاء ملف Word بنجاح!\n\n**[📝 تنزيل ${title}.docx](${fileUrl})**`;
  } catch (e) {
    return `خطأ في إنشاء DOCX: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function toolCreateXlsx(
  filename: string,
  sheets: Array<{
    name: string;
    headers: string[];
    rows: (string | number)[][];
  }>,
): Promise<string> {
  try {
    const res = await fetch("http://localhost:8080/api/files/xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, sheets }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      return `فشل إنشاء XLSX: ${err.error ?? res.statusText}`;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const fileUrl = await saveBuffer(buffer, "xlsx");
    return `تم إنشاء جدول Excel بنجاح!\n\n**[📊 تنزيل ${filename}.xlsx](${fileUrl})**`;
  } catch (e) {
    return `خطأ في إنشاء XLSX: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function toolCreatePptx(
  title: string,
  slides: Array<{ title?: string; bullets?: string[]; content?: string }>,
): Promise<string> {
  try {
    const res = await fetch("http://localhost:8080/api/files/pptx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slides }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      return `فشل إنشاء PPTX: ${err.error ?? res.statusText}`;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const fileUrl = await saveBuffer(buffer, "pptx");
    return `تم إنشاء العرض التقديمي بنجاح!\n\n**[🎯 تنزيل ${title}.pptx](${fileUrl})**`;
  } catch (e) {
    return `خطأ في إنشاء PPTX: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function toolWebSearch(query: string, limit = 5): Promise<string> {
  try {
    // Try DuckDuckGo structured search
    const res = await fetch("http://localhost:8080/api/browser/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: Math.min(limit, 8) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        ok?: boolean;
        results?: { title: string; url: string; snippet: string }[];
      };
      if (data.ok && data.results?.length) {
        const formatted = data.results
          .map(
            (r, i) =>
              `**${i + 1}. ${r.title}**\n${r.url}\n${r.snippet}`,
          )
          .join("\n\n");
        return `نتائج البحث عن: "${query}"\n\n${formatted}`;
      }
    }
  } catch {
    /* fallthrough */
  }

  // Fallback: DuckDuckGo HTML
  try {
    const resp = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; mr7agent/1.0; +https://mr7.ai)",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    const html = await resp.text();
    const results: string[] = [];
    const snippetRe =
      /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const titleRe = /class="result__a"[^>]*>([\s\S]*?)<\/a>/g;
    const titles: string[] = [];
    let m;
    while ((m = titleRe.exec(html)) !== null && titles.length < 8)
      titles.push(m[1]!.replace(/<[^>]+>/g, "").trim());
    let si = 0;
    while ((m = snippetRe.exec(html)) !== null && si < limit) {
      const snippet = m[1]!.replace(/<[^>]+>/g, "").trim();
      results.push(`**${si + 1}. ${titles[si] ?? ""}**\n${snippet}`);
      si++;
    }
    return results.length > 0
      ? `نتائج البحث عن: "${query}"\n\n${results.join("\n\n")}`
      : `لم أجد نتائج لـ: "${query}"`;
  } catch (e) {
    return `خطأ في البحث: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function toolCreateArtifact(
  title: string,
  language: string,
  code: string,
): Promise<string> {
  // Wrap the code in a machine-readable marker block. The frontend strips this
  // marker out of the rendered chat text and shows a clickable Artifact card
  // instead — clicking it opens a live, interactive preview (like Claude Artifacts).
  const lang = language.toLowerCase();
  const meta = JSON.stringify({ title, lang });
  return `تم إنشاء "${title}" ✅ اضغط على البطاقة أدناه لمعاينته وتشغيله مباشرة.\n\n::ARTIFACT_CARD::${meta}::\n\`\`\`${lang}\n${code}\n\`\`\`\n::/ARTIFACT_CARD::`;
}

async function toolManageProject(
  action: string,
  name?: string,
  projectId?: string,
): Promise<string> {
  try {
    if (action === "list") {
      const res = await fetch("http://localhost:8080/api/projects", {
        signal: AbortSignal.timeout(8_000),
      });
      const data = (await res.json()) as {
        projects?: { id: string; name: string; createdAt: string }[];
      };
      if (!data.projects?.length) return "لا توجد مشاريع حالياً.";
      return (
        "**المشاريع الحالية:**\n\n" +
        data.projects
          .map((p) => `• **${p.name}** (${p.id}) — ${new Date(p.createdAt).toLocaleDateString("ar")}`)
          .join("\n")
      );
    }
    if (action === "create" && name) {
      const res = await fetch("http://localhost:8080/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        signal: AbortSignal.timeout(8_000),
      });
      const data = (await res.json()) as { id?: string; name?: string };
      return `تم إنشاء المشروع "${data.name}" بمعرف: ${data.id}`;
    }
    if (action === "delete" && projectId) {
      await fetch(`http://localhost:8080/api/projects/${projectId}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(8_000),
      });
      return `تم حذف المشروع ${projectId}`;
    }
    return `إجراء غير معروف أو بيانات ناقصة.`;
  } catch (e) {
    return `خطأ في إدارة المشاريع: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function toolSaveMemory(
  content: string,
  title: string,
  tags = "",
): Promise<string> {
  try {
    // ── Primary path: pgvector semantic storage ────────────────────────────
    const embedding = await generateGeminiEmbedding(`${title}\n${content}`);
    if (embedding) {
      const vectorLiteral = `[${embedding.join(",")}]`;
      await pool.query(
        `INSERT INTO ai_user_memories (user_id, fact, embedding)
         VALUES ($1, $2, $3::vector)`,
        [
          "orchestrator",
          `${title}: ${content.slice(0, 4000)}`,
          vectorLiteral,
        ],
      );
      return `✅ تم حفظ الذاكرة الدلالية: "${title}" (embedding ${EMBED_DIM}-dim)`;
    }

    // ── Fallback: keyword-based agent-memory table ─────────────────────────
    const res = await fetch("http://localhost:8080/api/agent-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.slice(0, 4000),
        summary: title,
        context: tags || "orchestrator",
        importance: 0.8,
        session_id: "orchestrator-session",
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) return `✅ تم حفظ الذاكرة (نصي): "${title}" (embedding غير متاح — لا يوجد GOOGLE_AI_API_KEY)`;

    await ltmStore(title, content, tags ? tags.split(",").map((t) => t.trim()) : []);
    return `✅ تم حفظ الذاكرة: "${title}"`;
  } catch (e) {
    try {
      await ltmStore(title, content);
      return `✅ تم حفظ الذاكرة: "${title}"`;
    } catch (e2) {
      return `خطأ في حفظ الذاكرة: ${e2 instanceof Error ? e2.message : String(e2)}`;
    }
  }
}

async function toolRecallMemory(query: string, limit = 5): Promise<string> {
  try {
    // ── Primary path: pgvector cosine similarity search ────────────────────
    const queryEmbedding = await generateGeminiEmbedding(query);
    if (queryEmbedding) {
      const queryVector = `[${queryEmbedding.join(",")}]`;
      const { rows } = await pool.query<{ fact: string; similarity: number }>(
        `SELECT fact, 1 - (embedding <=> $1::vector) AS similarity
         FROM ai_user_memories
         WHERE user_id = $2
           AND embedding IS NOT NULL
           AND 1 - (embedding <=> $1::vector) >= $3
         ORDER BY similarity DESC
         LIMIT $4`,
        [queryVector, "orchestrator", EMBED_SIMILARITY_THRESHOLD, Math.min(limit, 10)],
      );
      if (rows.length) {
        return (
          `ذكريات دلالية متعلقة بـ "${query}":\n\n` +
          rows
            .map((r, i) =>
              `**${i + 1}.** (${(r.similarity * 100).toFixed(1)}% تشابه)\n${r.fact.slice(0, 500)}`,
            )
            .join("\n\n")
        );
      }
      return `لا توجد ذكريات دلالية متعلقة بـ "${query}" (فوق عتبة ${EMBED_SIMILARITY_THRESHOLD * 100}%)`;
    }

    // ── Fallback: keyword search ───────────────────────────────────────────
    const res = await fetch("http://localhost:8080/api/agent-memory/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        limit: Math.min(limit, 10),
        session_id: "orchestrator-session",
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        memories?: { summary: string; content: string; created_at: string }[];
      };
      if (data.memories?.length) {
        return (
          `ذكريات متعلقة بـ "${query}":\n\n` +
          data.memories
            .map(
              (m, i) =>
                `**${i + 1}. ${m.summary}**\n${m.content.slice(0, 500)}`,
            )
            .join("\n\n")
        );
      }
    }
    const entries = await ltmRecall(query, limit);
    if (!entries.length) return `لا توجد ذكريات متعلقة بـ "${query}"`;
    return (
      `ذكريات متعلقة بـ "${query}":\n\n` +
      entries
        .map((e, i) => `**${i + 1}. ${e.key}**\n${e.content.slice(0, 500)}`)
        .join("\n\n")
    );
  } catch (e) {
    return `خطأ في استرجاع الذاكرة: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ── Virtual project file tools ─────────────────────────────────────────────────
async function toolWriteProjectFile(
  filename: string,
  content: string,
  projectId = SESSION_PROJECT_ID,
): Promise<string> {
  if (!filename || filename.includes("..") || filename.startsWith("/")) {
    return "اسم الملف غير صالح — لا يُسمح بمسارات نسبية أو مطلقة.";
  }
  if (!virtualProjects.has(projectId)) {
    virtualProjects.set(projectId, new Map());
  }
  virtualProjects.get(projectId)!.set(filename, content);

  // Task 2 — persist an immutable version row (capped at MAX_VERSIONS_PER_FILE).
  // Never blocks/breaks the write itself if the DB write fails.
  saveVersion(projectId, filename, content).catch((err) => {
    console.error("[version-history] failed to save version:", (err as Error).message);
  });

  // Infer language from extension
  const extToLang: Record<string, string> = {
    jsx: "react", tsx: "react", html: "html", js: "javascript", ts: "typescript",
    py: "python", css: "css", json: "json", sh: "bash", rs: "rust", go: "go",
    md: "markdown", sql: "sql",
  };
  const inferLang = (name: string) => {
    const e = name.split(".").pop()?.toLowerCase() ?? "text";
    return extToLang[e] ?? e;
  };

  const lang = inferLang(filename);

  // Build full project snapshot (all files with content) for the frontend.
  // This lets the ProjectPanel do bundled preview + ZIP download client-side
  // without any server roundtrip.
  const allProjectFiles = [...virtualProjects.get(projectId)!.entries()].map(
    ([name, c]) => ({ name, content: c, lang: inferLang(name) }),
  );

  const meta = JSON.stringify({
    title: `${projectId === SESSION_PROJECT_ID ? "المشروع" : projectId} (${allProjectFiles.length} ملفات)`,
    lang,
    projectId,
    isProject: true,
    projectFiles: allProjectFiles,
  });

  // Each write_project_file returns an ARTIFACT_CARD with the full project state.
  // The frontend groups cards by projectId and shows a single ProjectPanel.
  return (
    `✅ تم كتابة "${filename}" (${content.split("\n").length} سطر، ${content.length} حرف)\n\n` +
    `::ARTIFACT_CARD::${meta}::\n\`\`\`${lang}\n${content}\n\`\`\`\n::/ARTIFACT_CARD::\n\n` +
    `📁 **المشروع (${allProjectFiles.length} ملف):** ${allProjectFiles.map(f => f.name).join(" · ")}`
  );
}

async function toolListProjectFiles(projectId = SESSION_PROJECT_ID): Promise<string> {
  const files = virtualProjects.get(projectId);
  if (!files || files.size === 0) return "لا توجد ملفات في المشروع بعد. استخدم write_project_file لإنشاء ملفات.";
  const list = [...files.entries()].map(
    ([name, content]) => `• **${name}** (${content.length} حرف)`,
  );
  return `**ملفات المشروع (${files.size}):**\n\n${list.join("\n")}`;
}

async function toolReadProjectFile(
  filename: string,
  projectId = SESSION_PROJECT_ID,
): Promise<string> {
  const files = virtualProjects.get(projectId);
  if (!files) return `المشروع "${projectId}" غير موجود.`;
  const content = files.get(filename);
  if (content === undefined) return `الملف "${filename}" غير موجود في المشروع.`;
  return `**محتوى "${filename}":**\n\n\`\`\`\n${content}\n\`\`\``;
}

async function toolGithubRepos(
  username: string,
  sort = "updated",
  limit = 10,
): Promise<string> {
  try {
    const token = process.env.GITHUB_TOKEN?.trim();
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "mr7.ai/1.0",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=${sort}&per_page=${Math.min(limit, 30)}`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return `خطأ GitHub API: ${res.status} ${res.statusText}`;
    const repos = (await res.json()) as {
      name: string;
      description: string | null;
      stargazers_count: number;
      language: string | null;
      html_url: string;
      updated_at: string;
    }[];
    if (!repos.length) return `لا توجد مستودعات لـ ${username}`;
    return (
      `**مستودعات GitHub لـ ${username}:**\n\n` +
      repos
        .map(
          (r) =>
            `• **[${r.name}](${r.html_url})** — ⭐${r.stargazers_count} | ${r.language ?? "—"}\n  ${r.description ?? "—"}`,
        )
        .join("\n\n")
    );
  } catch (e) {
    return `خطأ في جلب المستودعات: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function toolGithubIssues(
  owner: string,
  repo: string,
  state = "open",
  limit = 10,
): Promise<string> {
  try {
    const token = process.env.GITHUB_TOKEN?.trim();
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "mr7.ai/1.0",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=${Math.min(limit, 30)}`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return `خطأ GitHub API: ${res.status} ${res.statusText}`;
    const issues = (await res.json()) as {
      number: number;
      title: string;
      state: string;
      html_url: string;
      created_at: string;
      user: { login: string };
    }[];
    if (!issues.length) return `لا توجد قضايا ${state} في ${owner}/${repo}`;
    return (
      `**قضايا ${owner}/${repo} (${state}):**\n\n` +
      issues
        .map(
          (i) =>
            `• [#${i.number}] **${i.title}** — ${i.state}\n  ${i.html_url}`,
        )
        .join("\n\n")
    );
  } catch (e) {
    return `خطأ في جلب القضايا: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECURITY TOOL IMPLEMENTATIONS
// ══════════════════════════════════════════════════════════════════════════════

/** فحص منافذ TCP باستخدام Node.js net module */
async function toolPortScan(
  target: string,
  portsArg: string,
  timeoutMs: number,
): Promise<string> {
  const net = await import("net");

  // Parse ports list
  let ports: number[] = [];
  const COMMON_PORTS = [21,22,23,25,53,80,110,143,443,445,3306,3389,5432,6379,8080,8443,8888,9200,27017];
  if (!portsArg || portsArg === "common") {
    ports = COMMON_PORTS;
  } else if (portsArg.includes("-")) {
    const [start, end] = portsArg.split("-").map(Number);
    if (!isNaN(start) && !isNaN(end) && end - start <= 1000) {
      for (let p = start; p <= end; p++) ports.push(p);
    } else {
      return "خطأ: نطاق المنافذ كبير جداً (الحد الأقصى 1000 منفذ في المرة الواحدة)";
    }
  } else {
    ports = portsArg.split(",").map(s => parseInt(s.trim(), 10)).filter(p => !isNaN(p) && p > 0 && p < 65536);
  }
  if (ports.length === 0) return "خطأ: لم يتم تحديد منافذ صالحة";
  if (ports.length > 500) return "خطأ: عدد المنافذ يتجاوز الحد المسموح (500)";

  const timeout = Math.min(Math.max(timeoutMs || 1000, 200), 5000);

  const SERVICE_MAP: Record<number, string> = {
    21:"FTP",22:"SSH",23:"Telnet",25:"SMTP",53:"DNS",80:"HTTP",110:"POP3",
    143:"IMAP",443:"HTTPS",445:"SMB",3306:"MySQL",3389:"RDP",5432:"PostgreSQL",
    6379:"Redis",8080:"HTTP-Alt",8443:"HTTPS-Alt",8888:"HTTP-Alt",9200:"Elasticsearch",27017:"MongoDB",
  };

  const checkPort = (host: string, port: number): Promise<boolean> =>
    new Promise((resolve) => {
      const sock = new net.default.Socket();
      sock.setTimeout(timeout);
      sock.on("connect", () => { sock.destroy(); resolve(true); });
      sock.on("timeout", () => { sock.destroy(); resolve(false); });
      sock.on("error", () => { sock.destroy(); resolve(false); });
      sock.connect(port, host);
    });

  // Run in batches of 50 to avoid overwhelming
  const openPorts: { port: number; service: string }[] = [];
  const BATCH = 50;
  for (let i = 0; i < ports.length; i += BATCH) {
    const batch = ports.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (p) => ({ p, open: await checkPort(target, p) })));
    for (const { p, open } of results) {
      if (open) openPorts.push({ port: p, service: SERVICE_MAP[p] ?? "Unknown" });
    }
  }

  if (openPorts.length === 0) {
    return `**فحص المنافذ: ${target}**\n\n✅ لم يتم اكتشاف منافذ مفتوحة من بين ${ports.length} منفذ تم فحصه.\n\n_ملاحظة: قد يكون الهدف يستخدم جدار حماية أو النطاق غير قابل للوصول._`;
  }

  const table = openPorts.map(({ port, service }) => `| ${port} | ${service} | مفتوح |`).join("\n");
  return (
    `**🔍 نتائج فحص المنافذ: \`${target}\`**\n\n` +
    `تم فحص **${ports.length}** منفذ — اكتشاف **${openPorts.length}** منفذ مفتوح\n\n` +
    `| المنفذ | الخدمة | الحالة |\n|--------|--------|--------|\n${table}`
  );
}

/** البحث عن CVEs في NIST NVD API (مجاني، بدون مصادقة) */
async function toolVulnScan(
  product: string,
  version: string,
  severity: string,
  limit: number,
): Promise<string> {
  const keyword = version ? `${product} ${version}` : product;
  const url = new URL("https://services.nvd.nist.gov/rest/json/cves/2.0");
  url.searchParams.set("keywordSearch", keyword);
  url.searchParams.set("resultsPerPage", String(Math.min(limit || 10, 20)));
  if (severity && severity !== "all") url.searchParams.set("cvssV3Severity", severity);

  try {
    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return `خطأ في الاتصال بـ NVD API: HTTP ${res.status}`;

    const data = await res.json() as {
      totalResults: number;
      vulnerabilities: Array<{
        cve: {
          id: string;
          descriptions: Array<{ lang: string; value: string }>;
          metrics?: { cvssMetricV31?: Array<{ cvssData: { baseScore: number; baseSeverity: string } }> };
          published: string;
        };
      }>;
    };

    if (!data.vulnerabilities?.length) {
      return `لم يتم العثور على ثغرات CVE لـ "${keyword}" في قاعدة بيانات NVD.`;
    }

    const rows = data.vulnerabilities.map(({ cve }) => {
      const desc = cve.descriptions.find(d => d.lang === "en")?.value ?? "لا يوجد وصف";
      const score = cve.metrics?.cvssMetricV31?.[0]?.cvssData;
      const severity_badge = score ? `${score.baseSeverity} (${score.baseScore})` : "N/A";
      return `### ${cve.id} — ${severity_badge}\n${desc.slice(0, 200)}${desc.length > 200 ? "..." : ""}\n_نُشرت: ${cve.published.slice(0, 10)}_`;
    });

    return (
      `**🛡️ ثغرات CVE لـ "${keyword}"**\n\nإجمالي النتائج: **${data.totalResults}** — يُعرض أول ${rows.length}\n\n---\n\n` +
      rows.join("\n\n---\n\n")
    );
  } catch (e) {
    return `خطأ في البحث عن الثغرات: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** استطلاع DNS باستخدام dns/promises */
async function toolDnsRecon(
  domain: string,
  recordTypes: string[],
): Promise<string> {
  const dns = await import("dns/promises");
  const types = (recordTypes?.length ? recordTypes : ["A", "AAAA", "MX", "NS", "TXT", "CNAME"]);
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  await Promise.all(
    types.map(async (type) => {
      try {
        switch (type) {
          case "A":    results.A    = await dns.resolve4(domain); break;
          case "AAAA": results.AAAA = await dns.resolve6(domain); break;
          case "MX":   results.MX   = await dns.resolveMx(domain); break;
          case "NS":   results.NS   = await dns.resolveNs(domain); break;
          case "TXT":  results.TXT  = (await dns.resolveTxt(domain)).map(a => a.join(" ")); break;
          case "CNAME":results.CNAME= await dns.resolveCname(domain).catch(() => []); break;
          case "SOA":  results.SOA  = await dns.resolveSoa(domain); break;
        }
      } catch (e) {
        errors.push(`${type}: ${e instanceof Error ? e.message : "لا يوجد سجل"}`);
      }
    }),
  );

  const lines: string[] = [`**🌐 استطلاع DNS: \`${domain}\`**\n`];
  for (const [type, val] of Object.entries(results)) {
    const formatted = Array.isArray(val)
      ? (val as unknown[]).map(v => `  • ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join("\n")
      : `  ${JSON.stringify(val)}`;
    lines.push(`**${type}:**\n${formatted}`);
  }
  if (errors.length) lines.push(`\n_لم يُحلَّ: ${errors.join(", ")}_`);
  return lines.join("\n\n");
}

/** جمع OSINT من مصادر متعددة */
async function toolOsintGather(
  target: string,
  sources: string[],
): Promise<string> {
  const requestedSources = sources?.length ? sources : ["whois", "dns", "ip_info", "web_search"];
  const results: string[] = [`**🔎 تقرير OSINT: \`${target}\`**\n`];

  await Promise.all(
    requestedSources.map(async (source) => {
      try {
        switch (source) {
          case "dns": {
            const dns = await import("dns/promises");
            const ips = await dns.resolve4(target).catch(() => []);
            const ns  = await dns.resolveNs(target).catch(() => []);
            results.push(`**DNS:**\n  • IPs: ${ips.join(", ") || "لا يوجد"}\n  • NS: ${ns.join(", ") || "لا يوجد"}`);
            break;
          }
          case "ip_info": {
            // Check if target is a domain — resolve to IP first
            const dns2 = await import("dns/promises");
            const ips = await dns2.resolve4(target).catch(() => [target]);
            const ip = ips[0];
            const infoRes = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(8_000) });
            if (infoRes.ok) {
              const info = await infoRes.json() as Record<string, unknown>;
              results.push(
                `**IP Info (${ip}):**\n  • المنظمة: ${info.org ?? "N/A"}\n  • ASN: ${info.asn ?? "N/A"}\n  • الدولة: ${info.country_name ?? "N/A"}\n  • المدينة: ${info.city ?? "N/A"}\n  • ISP: ${info.org ?? "N/A"}`
              );
            }
            break;
          }
          case "whois": {
            // Use RDAP (free, no install needed)
            const rdapRes = await fetch(`https://rdap.org/domain/${target}`, { signal: AbortSignal.timeout(8_000) });
            if (rdapRes.ok) {
              const rdap = await rdapRes.json() as Record<string, unknown>;
              const events = (rdap.events as Array<{ eventAction: string; eventDate: string }> | undefined) ?? [];
              const registered = events.find(e => e.eventAction === "registration")?.eventDate ?? "N/A";
              const expires    = events.find(e => e.eventAction === "expiration")?.eventDate ?? "N/A";
              const entities   = (rdap.entities as Array<{ roles: string[]; vcardArray?: unknown[] }> | undefined) ?? [];
              const registrar  = entities.find(e => e.roles?.includes("registrar"));
              results.push(
                `**WHOIS/RDAP:**\n  • تاريخ التسجيل: ${registered.slice(0, 10)}\n  • تاريخ الانتهاء: ${expires.slice(0, 10)}\n  • المسجِّل: ${registrar ? JSON.stringify(registrar.roles) : "N/A"}`
              );
            }
            break;
          }
          case "web_search": {
            const searchRes = await toolWebSearch(`${target} site information security`, 3);
            results.push(`**بحث عام:**\n${searchRes.slice(0, 500)}`);
            break;
          }
        }
      } catch (e) {
        results.push(`**${source}:** خطأ — ${e instanceof Error ? e.message : String(e)}`);
      }
    }),
  );

  return results.join("\n\n");
}

/** فحص أمني لتطبيق ويب عبر HTTP */
async function toolWebScan(
  url: string,
  checks: string[],
): Promise<string> {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `خطأ: الرابط يجب أن يبدأ بـ http:// أو https://`;
  }
  const requestedChecks = checks?.length ? checks : ["headers", "ssl", "redirects", "info_disclosure"];
  const results: string[] = [`**🔐 فحص أمان الويب: \`${url}\`**\n`];

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "SecurityScanner/1.0 (authorized-pentest)" },
    });

    const headers = Object.fromEntries(res.headers.entries());

    if (requestedChecks.includes("headers")) {
      const SECURITY_HEADERS = [
        { name: "strict-transport-security", label: "HSTS" },
        { name: "content-security-policy", label: "CSP" },
        { name: "x-frame-options", label: "X-Frame-Options" },
        { name: "x-content-type-options", label: "X-Content-Type-Options" },
        { name: "referrer-policy", label: "Referrer-Policy" },
        { name: "permissions-policy", label: "Permissions-Policy" },
      ];
      const headerRows = SECURITY_HEADERS.map(({ name, label }) => {
        const present = headers[name];
        return `| ${label} | ${present ? "✅ موجود" : "❌ مفقود"} | ${present ? `\`${String(present).slice(0, 60)}\`` : "—"} |`;
      }).join("\n");
      results.push(`**رؤوس HTTP الأمنية:**\n| الرأس | الحالة | القيمة |\n|-------|--------|--------|\n${headerRows}`);
    }

    if (requestedChecks.includes("ssl") && url.startsWith("https://")) {
      results.push(`**SSL/TLS:**\n  ✅ الاتصال HTTPS مفعّل\n  • الخادم: ${headers["server"] ?? "مخفي"}`);
    }

    if (requestedChecks.includes("redirects")) {
      const location = headers["location"];
      results.push(`**إعادة التوجيه:**\n  • الحالة: HTTP ${res.status}\n  • يوجه إلى: ${location ?? "لا يوجد"}`);
    }

    if (requestedChecks.includes("info_disclosure")) {
      const disclosures: string[] = [];
      if (headers["server"]) disclosures.push(`Server: \`${headers["server"]}\``);
      if (headers["x-powered-by"]) disclosures.push(`X-Powered-By: \`${headers["x-powered-by"]}\``);
      if (headers["x-aspnet-version"]) disclosures.push(`ASP.NET: \`${headers["x-aspnet-version"]}\``);
      results.push(
        disclosures.length
          ? `**إفصاح المعلومات:**\n  ⚠️ الخادم يكشف عن:\n${disclosures.map(d => `  • ${d}`).join("\n")}`
          : `**إفصاح المعلومات:**\n  ✅ لا يوجد إفصاح واضح`
      );
    }

    if (requestedChecks.includes("cors")) {
      const acao = headers["access-control-allow-origin"];
      results.push(
        `**CORS:**\n  ${acao === "*" ? "⚠️ مفتوح للجميع (Wildcard *)" : acao ? `• المسموح به: \`${acao}\`` : "✅ لا يوجد CORS header"}`
      );
    }

  } catch (e) {
    return `خطأ في الفحص: ${e instanceof Error ? e.message : String(e)}`;
  }

  return results.join("\n\n");
}

/** البحث عن exploits في المصادر العامة */
async function toolExploitSearch(query: string): Promise<string> {
  // Search via web_search across ExploitDB + GitHub + CVE databases
  const [exploitdb, github] = await Promise.all([
    toolWebSearch(`site:exploit-db.com ${query}`, 5),
    toolWebSearch(`site:github.com exploit ${query} poc`, 5),
  ]);

  return (
    `**💥 نتائج البحث عن Exploits: "${query}"**\n\n` +
    `**ExploitDB:**\n${exploitdb}\n\n---\n\n` +
    `**GitHub (PoC):**\n${github}`
  );
}

/** توليد تقرير اختبار اختراق منظم */
async function toolGeneratePentestReport(
  target: string,
  findings: Array<{ title: string; severity: string; description: string; evidence?: string; remediation?: string }>,
  format: string,
  tester: string,
): Promise<string> {
  const now = new Date().toISOString().slice(0, 10);
  const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
  const sorted = [...findings].sort((a, b) =>
    (severityOrder[a.severity as keyof typeof severityOrder] ?? 5) -
    (severityOrder[b.severity as keyof typeof severityOrder] ?? 5)
  );

  const severityEmoji: Record<string, string> = {
    Critical: "🔴", High: "🟠", Medium: "🟡", Low: "🟢", Info: "🔵",
  };

  const summary = sorted.reduce((acc: Record<string, number>, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  const summaryTable = Object.entries(summary)
    .map(([sev, count]) => `| ${severityEmoji[sev] ?? ""} ${sev} | ${count} |`)
    .join("\n");

  const findingsSections = sorted.map((f, i) => (
    `### ${i + 1}. ${severityEmoji[f.severity] ?? ""} ${f.title}\n` +
    `**الخطورة:** ${f.severity}\n\n` +
    `**الوصف:** ${f.description}\n\n` +
    (f.evidence ? `**الدليل:**\n\`\`\`\n${f.evidence}\n\`\`\`\n\n` : "") +
    (f.remediation ? `**التوصية:** ${f.remediation}` : "")
  )).join("\n\n---\n\n");

  const markdown = [
    `# تقرير اختبار الاختراق`,
    ``,
    `| المعلومة | القيمة |`,
    `|----------|--------|`,
    `| الهدف | \`${target}\` |`,
    `| التاريخ | ${now} |`,
    `| المختبر | ${tester || "غير محدد"} |`,
    `| إجمالي النتائج | ${findings.length} |`,
    ``,
    `## ملخص المخاطر`,
    ``,
    `| الخطورة | العدد |`,
    `|---------|-------|`,
    summaryTable,
    ``,
    `---`,
    ``,
    `## النتائج التفصيلية`,
    ``,
    findingsSections,
    ``,
    `---`,
    `*تقرير مولَّد تلقائياً بواسطة KaliGPT — للاستخدام الأخلاقي والقانوني فقط*`,
  ].join("\n");

  if (format === "pdf") {
    return toolCreatePdf(`تقرير اختبار اختراق — ${target}`, markdown, "ar");
  }
  return markdown;
}

// ── Guardrails-aware tool dispatcher wrapper ───────────────────────────────────
// Wraps executeTool with rate limiting + pattern checking + audit logging.
async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  ip: string,
  deviceId: string,
  userContext?: string,
): Promise<string> {
  if (SENSITIVE_TOOLS.has(name)) {
    // 1. Rate check
    if (!sensitiveRateCheck(ip)) {
      await auditSensitiveTool(name, args, "blocked", "rate_limit_exceeded", ip, deviceId);
      return `⛔ تم تجاوز الحد المسموح به لاستخدام الأدوات الحسّاسة (${SENSITIVE_RATE_LIMIT} طلب/دقيقة). انتظر قليلاً ثم أعد المحاولة.`;
    }
    // 2. Guardrails pattern check (fast, no AI key required)
    const blockReason = guardRailsCheck(name, args);
    if (blockReason) {
      await auditSensitiveTool(name, args, "blocked", blockReason, ip, deviceId);
      return `⛔ **طلب مرفوض — سياسة الاستخدام المقبول**\n\n${blockReason}\n\n_سُجّل هذا الطلب للمراجعة._`;
    }
    // 3. Secondary AI-based intent classifier — catches phrasing the regex rules miss
    // (e.g. English/Arabic paraphrases). Writes its own audit row; safe no-op if no
    // AI provider key is configured (fails open, logged as "unclear").
    const aiDecision = await checkGuardrail({
      toolName: name,
      args,
      userContext,
      actorId: deviceId,
      actorIp: ip,
    });
    if (!aiDecision.allowed) {
      return `⛔ **طلب مرفوض — سياسة الاستخدام المقبول**\n\n${aiDecision.reason}\n\n_سُجّل هذا الطلب للمراجعة._`;
    }
    // 4. Audit as allowed (pattern-rule layer)
    await auditSensitiveTool(name, args, "allowed", null, ip, deviceId);
  }
  return executeTool(name, args);
}

// ── Main tool dispatcher ───────────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "generate_image":
      return toolGenerateImage(
        String(args.prompt ?? ""),
        String(args.model ?? "flux-1-schnell"),
      );
    case "analyze_image":
      return toolAnalyzeImage(
        String(args.image_url ?? ""),
        String(args.question ?? "صف هذه الصورة"),
      );
    case "execute_code":
      return toolExecuteCode(
        String(args.code ?? ""),
        String(args.language ?? "python"),
      );
    case "create_pdf":
      return toolCreatePdf(
        String(args.title ?? "Document"),
        String(args.content ?? ""),
        String(args.language ?? "ar"),
      );
    case "extract_pdf_text":
      return toolExtractPdfText(String(args.pdf_url ?? ""));
    case "create_docx":
      return toolCreateDocx(
        String(args.title ?? "Document"),
        String(args.content ?? ""),
      );
    case "create_xlsx":
      return toolCreateXlsx(
        String(args.filename ?? "spreadsheet"),
        (args.sheets as Parameters<typeof toolCreateXlsx>[1]) ?? [],
      );
    case "create_pptx":
      return toolCreatePptx(
        String(args.title ?? "Presentation"),
        (args.slides as Parameters<typeof toolCreatePptx>[1]) ?? [],
      );
    case "web_search":
      return toolWebSearch(
        String(args.query ?? ""),
        Number(args.limit ?? 5),
      );
    case "create_artifact":
      return toolCreateArtifact(
        String(args.title ?? "Code"),
        String(args.language ?? "html"),
        String(args.code ?? ""),
      );
    case "manage_project":
      return toolManageProject(
        String(args.action ?? "list"),
        args.name ? String(args.name) : undefined,
        args.project_id ? String(args.project_id) : undefined,
      );
    case "write_project_file":
      return toolWriteProjectFile(
        String(args.filename ?? ""),
        String(args.content ?? ""),
        args.project_id ? String(args.project_id) : SESSION_PROJECT_ID,
      );
    case "list_project_files":
      return toolListProjectFiles(
        args.project_id ? String(args.project_id) : SESSION_PROJECT_ID,
      );
    case "read_project_file":
      return toolReadProjectFile(
        String(args.filename ?? ""),
        args.project_id ? String(args.project_id) : SESSION_PROJECT_ID,
      );
    case "save_memory":
      return toolSaveMemory(
        String(args.content ?? ""),
        String(args.title ?? "Note"),
        String(args.tags ?? ""),
      );
    case "recall_memory":
      return toolRecallMemory(
        String(args.query ?? ""),
        Number(args.limit ?? 5),
      );
    case "github_repos":
      return toolGithubRepos(
        String(args.username ?? ""),
        String(args.sort ?? "updated"),
        Number(args.limit ?? 10),
      );
    case "github_issues":
      return toolGithubIssues(
        String(args.owner ?? ""),
        String(args.repo ?? ""),
        String(args.state ?? "open"),
        Number(args.limit ?? 10),
      );
    // ── Security Tools ────────────────────────────────────────────────────
    case "port_scan":
      return toolPortScan(
        String(args.target ?? ""),
        String(args.ports ?? "common"),
        Number(args.timeout_ms ?? 1000),
      );
    case "vuln_scan":
      return toolVulnScan(
        String(args.product ?? ""),
        String(args.version ?? ""),
        String(args.severity ?? "all"),
        Number(args.limit ?? 10),
      );
    case "dns_recon":
      return toolDnsRecon(
        String(args.domain ?? ""),
        (args.record_types as string[] | undefined) ?? [],
      );
    case "osint_gather":
      return toolOsintGather(
        String(args.target ?? ""),
        (args.sources as string[] | undefined) ?? [],
      );
    case "web_scan":
      return toolWebScan(
        String(args.url ?? ""),
        (args.checks as string[] | undefined) ?? [],
      );
    case "exploit_search":
      return toolExploitSearch(String(args.query ?? ""));
    case "generate_pentest_report":
      return toolGeneratePentestReport(
        String(args.target ?? ""),
        (args.findings as Parameters<typeof toolGeneratePentestReport>[1]) ?? [],
        String(args.format ?? "markdown"),
        String(args.tester ?? ""),
      );
    default:
      return `أداة غير معروفة: ${name}`;
  }
}

// ── SSE helper ─────────────────────────────────────────────────────────────────
function sse(res: Response, data: object) {
  const expressRes = res as unknown as import("express").Response & { flush?: () => void };
  expressRes.write(`data: ${JSON.stringify(data)}\n\n`);
  // Must flush after each write so the SSE event is immediately delivered to the client.
  // The compression middleware buffers writes; flush() pushes the buffer out.
  expressRes.flush?.();
}

// ── Cloudflare Workers AI — streaming chat completion ─────────────────────────
// Uses stream:true so tokens are forwarded immediately as they arrive,
// avoiding any post-await Express buffering issues.
async function cloudflareChatStream(
  system: string,
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!cfToken || !cfAccount) {
    onChunk("⚠️ Cloudflare credentials missing.");
    return;
  }

  const MODEL = "@cf/meta/llama-3.1-8b-instruct";
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/${MODEL}`;

  const payload = {
    messages: [
      { role: "system", content: system },
      ...messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content })),
    ],
    max_tokens: 2048,
    stream: true, // Enable streaming — tokens arrive incrementally
  };

  const timeoutSignal = AbortSignal.timeout(30_000);
  const fetchSignal = signal
    ? ((AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any?.([signal, timeoutSignal]) ?? timeoutSignal)
    : timeoutSignal;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: fetchSignal,
  });

  if (!res.ok || !res.body) {
    onChunk(`⚠️ Cloudflare API error: ${res.status} ${res.statusText}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // Cloudflare streams SSE-style: "data: {...}\n\n" or "data: [DONE]\n\n"
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of block.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload2 = trimmed.slice(5).trim();
        if (payload2 === "[DONE]") return;
        try {
          const ev = JSON.parse(payload2) as {
            choices?: { delta?: { content?: string }; text?: string }[];
            result?: { response?: string; choices?: { message?: { content?: string } }[] };
          };
          const token =
            ev.choices?.[0]?.delta?.content ??
            ev.choices?.[0]?.text ??
            ev.result?.choices?.[0]?.message?.content ??
            ev.result?.response ??
            "";
          if (token) onChunk(token);
        } catch { /* ignore malformed SSE chunks */ }
      }
    }
  }
}

// ── Create OpenAI-compatible client for a provider ────────────────────────────
async function buildProviderClient(
  provider: string,
  model: string,
  userApiKey?: string,
  userApiBaseURL?: string,
): Promise<{ client: import("openai").default; model: string } | null> {
  const OpenAI = (await import("openai")).default;

  // User-supplied key takes highest priority
  if (userApiKey?.trim() && userApiKey.trim().length > 10) {
    return {
      client: new OpenAI({
        apiKey: userApiKey.trim(),
        timeout: 30_000,
        ...(userApiBaseURL?.trim() ? { baseURL: userApiBaseURL.trim() } : {}),
      }),
      model,
    };
  }

  // Cloudflare: use the OpenAI-compatible /ai/v1 endpoint for function calling
  if (provider === "cloudflare") {
    const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
    const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    if (!cfToken || !cfAccount) return null;
    return {
      client: new OpenAI({
        apiKey: cfToken,
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/v1`,
        timeout: 60_000,
      }),
      model,
    };
  }

  // OpenAI-compatible: openai, groq, personal, openrouter, etc.
  try {
    const c = getOpenAICompatibleClient(provider as ProviderName);
    return c ? { client: c, model } : null;
  } catch {
    return null;
  }
}

// ── Find best tool-capable provider ──────────────────────────────────────────
function findToolCapableProvider(
  preferredProvider?: string,
  preferredModel?: string,
): { provider: string; model: string; warning?: string } | null {
  const available = listProviders().filter((p) => p.available);

  // Check if preferred provider+model support tools
  if (preferredProvider && preferredModel) {
    const prov = available.find((p) => p.id === preferredProvider);
    if (prov) {
      if (TOOL_CAPABLE_MODELS.has(preferredModel)) {
        return { provider: preferredProvider, model: preferredModel };
      } else {
        return {
          provider: preferredProvider,
          model: preferredModel,
          warning: `⚠️ النموذج "${preferredModel}" قد لا يدعم Function Calling بشكل كامل.`,
        };
      }
    }
  }

  // Priority order for tool-capable providers
  // Cloudflare is placed BEFORE Gemini — it is free, reliable, and has no daily quota limits.
  const PRIORITY: { prov: string; model: string }[] = [
    { prov: "openai", model: "gpt-4o-mini" },
    { prov: "openai", model: "gpt-4o" },
    { prov: "groq", model: "llama-3.3-70b-versatile" },
    { prov: "groq", model: "llama-3.1-8b-instant" },
    // Cloudflare Workers AI — free, no daily quota, reliable function calling via /ai/v1
    { prov: "cloudflare", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" },
    // Gemini supports function calling via its OpenAI-compatible endpoint
    { prov: "gemini", model: "gemini-2.0-flash" },
    { prov: "gemini", model: "gemini-1.5-pro" },
    { prov: "personal", model: preferredModel ?? "gpt-4o-mini" },
    { prov: "anthropic", model: "claude-3-5-sonnet-20241022" },
  ];

  for (const { prov, model } of PRIORITY) {
    if (available.some((p) => p.id === prov)) {
      return { provider: prov, model };
    }
  }
  return null;
}

// ── ORCHESTRATION SYSTEM PROMPT ───────────────────────────────────────────────
const ORCHESTRATE_SYSTEM = `أنت KaliGPT — مساعد ذكاء اصطناعي متكامل متخصص في الأمن الهجومي والدفاعي. لديك مجموعة من الأدوات القوية التي تستخدمها تلقائياً بناءً على فهمك لطلب المستخدم — دون الحاجة لأي ضغط أزرار. أنت تقرر أي أداة تستخدم، ومتى، وبأي ترتيب.

**أدوات عامة:**
- صورة → generate_image | تنفيذ كود → execute_code | بحث ويب → web_search
- PDF/Word/Excel/PowerPoint → create_pdf / create_docx / create_xlsx / create_pptx
- تحليل صورة → analyze_image | ذاكرة → save_memory / recall_memory
- كود تفاعلي → create_artifact | مشروع متعدد ملفات → write_project_file → list_project_files
- GitHub → github_repos / github_issues

**أدوات الأمن والاختراق — تعمل تلقائياً من اللغة الطبيعية:**
- "افحص المنافذ / port scan / اكتشف الخدمات" → port_scan(target, ports?)
- "ابحث عن ثغرات / CVE / vulnerabilities لـ X" → vuln_scan(product, version?, severity?)
- "استطلاع DNS / سجلات DNS / نطاقات فرعية" → dns_recon(domain, record_types?)
- "OSINT / معلومات عن النطاق / whois / IP info" → osint_gather(target, sources?)
- "افحص أمان الموقع / فحص headers / SSL" → web_scan(url, checks?)
- "ابحث عن exploit / PoC / استغلال ثغرة" → exploit_search(query)
- "تقرير / ملخص النتائج / pentest report" → generate_pentest_report(target, findings, format?)

**استراتيجية استخدام أدوات الأمن (مهم):**
- اتخاذ القرار تلقائياً: اقرأ طلب المستخدم، قرر الأدوات المناسبة، نفّذها بالتسلسل الصحيح.
- التسلسل المنطقي النموذجي: dns_recon + osint_gather → port_scan → vuln_scan → exploit_search → generate_pentest_report
- لا تسأل المستخدم "هل تريد أن أفحص؟" — افحص مباشرة إذا كان الطلب واضحاً.
- استخدم نتائج كل أداة كمدخلات للأداة التالية (مثلاً: خدمات مكتشفة من port_scan تُمرَّر إلى vuln_scan).
- يمكن تشغيل dns_recon و osint_gather معاً بالتوازي لتوفير الوقت.

**حدود الاستخدام المقبول (مهم جداً):**
- هذا النظام مخصص للتعليم الأمني والأبحاث الدفاعية وبيئات الاختبار المصرَّح بها (labs/CTF/pentest بإذن صريح).
- يُرفض أي طلب يستهدف أنظمة حقيقية لأطراف ثالثة بدون إذن صريح مكتوب من مالكها.
- الاختبار على بيئتك الخاصة أو شبكة مختبر معزول أو بعد الحصول على إذن كتابي → مسموح تماماً.

**أسلوب الرد:**
- نفّذ الأداة أولاً ثم أضف تحليلاً وشرحاً طبيعياً للنتائج.
- إذا أرجعت الأداة رابط تنزيل، أدرجه بوضوح في ردك.
- إذا ولّدت صورة، أظهرها بصيغة markdown: ![وصف](url)
- اردّ بنفس لغة المستخدم (العربية أو الإنجليزية)
- كن دقيقاً، تقنياً، ومباشراً — أنت خبير أمني يعمل مع محترفين.`;

// ── Task 3 — Extended Thinking: lightweight complexity classifier ──────────────
// Decides, WITHOUT an extra AI call, whether a request is "complex" enough to
// warrant the model producing a visible <thinking> block before its answer.
// Kept intentionally cheap (regex/length heuristics only) so simple messages
// never pay the latency/token cost of an explicit reasoning step.
const THINKING_SYSTEM_BLOCK = `

**التفكير المعمّق (مفعّل لهذا الطلب لأنه معقد):**
- ضع تفكيرك التفصيلي (تحليل الخطوات، الخيارات، القرار بشأن الأداة المناسبة) داخل وسم \`<thinking>...</thinking>\` أولاً.
- بعد إغلاق وسم </thinking> مباشرة، أعطِ الجواب النهائي الواضح والمباشر (بدون تكرار ما ورد في التفكير).`;

function isComplexRequest(userMessage: string | undefined): boolean {
  if (!userMessage) return false;
  const text = userMessage.trim();
  if (text.length === 0) return false;

  // Long messages tend to carry more sub-requirements.
  if (text.length > 280) return true;

  // Multiple distinct questions/requirements in one message.
  const questionMarks = (text.match(/[؟?]/g) ?? []).length;
  if (questionMarks >= 2) return true;

  // Explicit request for deep analysis, comparison, planning, multi-step work.
  const complexSignals = /(حلّل|تحليل|قارن|مقارنة|خطة|خطوات|صمّم|صمم|اشرح بالتفصيل|بالتفصيل|استراتيجية|قيّم|قيم|اقترح حلولاً|analy[sz]e|compare|strategy|step[- ]by[- ]step|design a|architecture|trade-?off|pros and cons)/i;
  if (complexSignals.test(text)) return true;

  // Multi-part instructions joined by "و"/"ثم"/"and"/"then" (rough proxy for
  // multi-step tasks), counted rather than matched once to avoid false
  // positives on ordinary sentences that happen to contain "و".
  const stepConnectors = (text.match(/\bثم\b|\bبعد ذلك\b|\bthen\b/gi) ?? []).length;
  if (stepConnectors >= 2) return true;

  return false;
}

// ── Guardrails — sensitive tool definitions + rate limiter + audit ─────────────
// Tools that warrant extra scrutiny before execution.
const SENSITIVE_TOOLS = new Set([
  "execute_code", "run_shell", "github_issues", "github_repos",
  "web_search", "analyze_image",
  // Security tools — all require guardrail check
  "port_scan", "vuln_scan", "osint_gather", "web_scan",
  "exploit_search", "generate_pentest_report",
]);

// In-memory rate limiter: max 20 sensitive tool calls per minute per IP.
const _sensitiveRateMap = new Map<string, { count: number; resetAt: number }>();
const SENSITIVE_RATE_LIMIT = 20;
const SENSITIVE_RATE_WINDOW_MS = 60_000;

function sensitiveRateCheck(ip: string): boolean {
  const now = Date.now();
  const entry = _sensitiveRateMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    _sensitiveRateMap.set(ip, { count: 1, resetAt: now + SENSITIVE_RATE_WINDOW_MS });
    return true; // allowed
  }
  if (entry.count >= SENSITIVE_RATE_LIMIT) return false; // blocked
  entry.count++;
  return true;
}

// Pattern-based guardrail classifier (no AI key required).
// Returns null if allowed; returns a rejection reason string if blocked.
function guardRailsCheck(toolName: string, args: Record<string, unknown>): string | null {
  const argsStr = JSON.stringify(args).toLowerCase();

  // Rule 1: execute_code with network/exploitation patterns targeting external IPs
  if (toolName === "execute_code") {
    const code = String(args.code ?? "").toLowerCase();
    // Detect attempted connections to real public IPs (not 127.x, 10.x, 192.168.x, 172.16-31.x)
    const publicIpRe = /\b(?!10\.|127\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)(?:\d{1,3}\.){3}\d{1,3}\b/;
    const exploitKeywords = /exploit|payload|shellcode|reverse.?shell|bind.?shell|metasploit|meterpreter|c2.server|command.and.control/i;
    if (publicIpRe.test(code) && exploitKeywords.test(code)) {
      return "تم الكشف عن كود يحاول استغلال نظام خارجي بدون إذن. التنفيذ مرفوض.";
    }
    // Detect credential harvesting
    if (/dump.{0,20}password|lsass|mimikatz|hashdump|secretsdump/i.test(code) &&
        publicIpRe.test(code)) {
      return "كود يحاول سرقة بيانات اعتماد من نظام خارجي. مرفوض.";
    }
  }

  // Rule 2: OSINT / search targeting language suggesting an unauthorized attack
  const unauthorizedAttackRe = /(?:اختر|هاجم|استهدف|اخترق|exploit|attack|hack|pwn|brute.?force|ddos|steal|bypass).{0,60}(?:\.com|\.net|\.org|\.gov|\.edu|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i;
  if (["web_search", "github_repos", "github_issues"].includes(toolName) && unauthorizedAttackRe.test(argsStr)) {
    // Allow if the user explicitly declares ownership/authorization/lab scope.
    if (/\b(?:lab|ctf|my |own |test.env|authorized|permission|مختبر|بيئة.اختبار|بإذن|بتصريح|أملكه|خاصتي)\b/i.test(argsStr)) {
      return null;
    }
    // No ownership/authorization signal + explicit attack language against a real target → block.
    return "تم رصد لغة توحي باستهداف نظام حقيقي تابع لطرف ثالث دون إذن معلن (هجوم/اختراق/سرقة بيانات). التنفيذ مرفوض. إن كانت هذه بيئتك الخاصة أو بيئة اختبار مصرَّح بها، أعد الصياغة موضّحاً ذلك (مثال: \"في بيئتي المعملية الخاصة\").";
  }

  return null; // allowed by pattern rules — caller may still apply a secondary AI classifier
}

async function auditSensitiveTool(
  toolName: string,
  args: Record<string, unknown>,
  verdict: "allowed" | "blocked",
  blockReason: string | null,
  ip: string,
  deviceId: string,
): Promise<void> {
  try {
    const argsSummary = JSON.stringify(args).slice(0, 500); // trim large payloads
    await pool.query(
      `INSERT INTO sensitive_tool_audit_log (device_id, ip, tool_name, args_summary, verdict, block_reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [deviceId || "anonymous", ip || "unknown", toolName, argsSummary, verdict, blockReason],
    );
  } catch {
    /* audit failure must never crash the main flow */
  }
}

// ── Main route ─────────────────────────────────────────────────────────────────
router.post("/orchestrate", async (req: Request, res: Response) => {
  const expressRes = res as import("express").Response;
  try {
    const body = req.body as {
      messages?: { role: string; content: string }[];
      provider?: string;
      model?: string;
      apiKey?: string;
      apiBaseURL?: string;
      language?: string;
      customSystemPrompt?: string;
      customInstructions?: string;
      memory?: string[];
      maxSteps?: number;
      temperature?: number;
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const maxSteps = Math.min(body.maxSteps ?? 10, 20);
    const temperature = body.temperature ?? 0.7;
    const language = body.language ?? "ar";
    const langLine =
      language === "ar"
        ? "\n\nاردّ دائماً بالعربية ما لم يطلب المستخدم غير ذلك. استخدم الإنجليزية للمصطلحات التقنية وأسماء الأدوات."
        : "\n\nRespond in English by default.";

    const ciLine = body.customInstructions?.trim()
      ? `\n\nتعليمات إضافية من المستخدم: ${body.customInstructions.trim()}`
      : "";
    const memLine =
      Array.isArray(body.memory) && body.memory.length > 0
        ? `\n\nذاكرة المستخدم:\n- ${body.memory.join("\n- ")}`
        : "";

    const lastUserMessageForClassifier = [...messages].reverse().find((m) => m.role === "user")?.content;
    const thinkingBlock = isComplexRequest(lastUserMessageForClassifier) ? THINKING_SYSTEM_BLOCK : "";

    const sysContent =
      (body.customSystemPrompt?.trim() ?? ORCHESTRATE_SYSTEM) +
      thinkingBlock +
      langLine +
      ciLine +
      memLine;

    // ── Setup SSE ────────────────────────────────────────────────────────────
    expressRes.setHeader("Content-Type", "text/event-stream");
    expressRes.setHeader("Cache-Control", "no-cache, no-transform");
    expressRes.setHeader("Connection", "keep-alive");
    expressRes.setHeader("X-Accel-Buffering", "no");
    expressRes.flushHeaders?.();

    let aborted = false;
    const routeAbortController = new AbortController();
    // Use res "close" (client disconnected from SSE stream), not req "close"
    // (req "close" fires as soon as the request body is fully received, which
    //  is almost immediately and would abort the in-flight Cloudflare fetch).
    expressRes.on("close", () => {
      aborted = true;
      routeAbortController.abort();
    });

    // ── Find tool-capable provider ───────────────────────────────────────────
    const providerInfo = findToolCapableProvider(body.provider, body.model);

    if (!providerInfo) {
      sse(expressRes, {
        type: "error",
        error:
          "لا يوجد مزود ذكاء اصطناعي متاح يدعم Function Calling. أضف OPENAI_API_KEY أو GROQ_API_KEY في إعدادات Secrets.",
      });
      expressRes.end();
      return;
    }

    if (providerInfo.warning) {
      sse(expressRes, { type: "tool_warning", message: providerInfo.warning });
    }

    // ── Build message history ─────────────────────────────────────────────────
    type LoopMsg = {
      role: "system" | "user" | "assistant" | "tool";
      content: string;
      tool_calls?: unknown[];
      tool_call_id?: string;
      name?: string;
    };

    const loop: LoopMsg[] = [
      { role: "system", content: sysContent },
      ...messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    ];

    // ══════════════════════════════════════════════════════════════════════════
    // PATH B: OpenAI-compatible providers — full Function Calling loop
    // (Cloudflare also uses this path via its /ai/v1 OpenAI-compatible endpoint)
    // ══════════════════════════════════════════════════════════════════════════
    const clientResult = await buildProviderClient(
      providerInfo.provider,
      providerInfo.model,
      body.apiKey?.trim(),
      body.apiBaseURL?.trim(),
    );

    if (!clientResult) {
      sse(expressRes, {
        type: "error",
        error: `فشل الاتصال بالمزود ${providerInfo.provider}. تحقق من مفاتيح API في إعدادات Secrets.`,
      });
      expressRes.end();
      return;
    }

    const client = clientResult.client;
    providerInfo.model = clientResult.model;

    let step = 0;
    let toolsWorked = true;
    let forceFinalAnswer = false; // true after first successful tool batch → no more tool calls
    // Track (tool_name + args_hash) to detect tight loops
    const seenToolCalls = new Map<string, number>();

    while (step < maxSteps && !aborted) {
      step++;
      sse(expressRes, { type: "step_start", step, maxSteps });

      // After executing tools once, tell the model to synthesize — no more tool calls
      const toolChoiceOpt = (!toolsWorked || forceFinalAnswer)
        ? {}
        : { tools: ORCHESTRATE_TOOLS, tool_choice: "auto" as const };

      let response: import("openai").default.ChatCompletion;
      try {
        response = await client.chat.completions.create(
          {
            model: providerInfo.model,
            max_tokens: 4096,
            temperature,
            messages:
              loop as import("openai/resources/chat/completions").ChatCompletionMessageParam[],
            ...toolChoiceOpt,
          },
          { signal: routeAbortController.signal },
        );
      } catch (apiErr) {
        const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
        if (
          toolsWorked &&
          (errMsg.includes("tools") ||
            errMsg.includes("function") ||
            errMsg.includes("400") ||
            errMsg.includes("tool_choice"))
        ) {
          toolsWorked = false;
          sse(expressRes, {
            type: "tool_warning",
            message: `⚠️ النموذج "${providerInfo.model}" لا يدعم Function Calling. يعمل الآن بوضع المحادثة العادية.`,
          });
          step--;
          continue;
        }
        throw apiErr;
      }

      const choice = response.choices?.[0];
      if (!choice) break;
      const msg = choice.message;

      // ── Final text answer ────────────────────────────────────────────────
      if (msg.content && !msg.tool_calls?.length) {
        loop.push({ role: "assistant", content: msg.content });
        sse(expressRes, { type: "answer_start" });
        const CHUNK = 4;
        for (let i = 0; i < msg.content.length; i += CHUNK) {
          if (aborted) break;
          sse(expressRes, { type: "answer_chunk", content: msg.content.slice(i, i + CHUNK) });
        }
        break;
      }

      // ── Tool calls ───────────────────────────────────────────────────────
      if (msg.tool_calls?.length) {
        if (msg.content) sse(expressRes, { type: "thinking", content: msg.content });

        loop.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });

        const toolCallList = msg.tool_calls.map((tc) => {
          const fn = (tc as { function: { name: string; arguments: string } }).function;
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(fn.arguments ?? "{}"); } catch { /* keep empty */ }
          return { tc, name: fn.name, args };
        });

        for (const { name, args } of toolCallList) {
          sse(expressRes, { type: "tool_call", step, name, args });
        }

        // Detect duplicate tool calls — break the loop if we've seen this exact call before
        let hasDuplicate = false;
        for (const { name, args } of toolCallList) {
          const key = `${name}:${JSON.stringify(args)}`;
          const count = (seenToolCalls.get(key) ?? 0) + 1;
          seenToolCalls.set(key, count);
          if (count >= 2) { hasDuplicate = true; break; }
        }

        const requestIp = (req as import("express").Request).ip ?? "unknown";
        const requestDeviceId = String((req.body as Record<string, unknown>)?.deviceId ?? "anonymous");
        const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content;
        const toolResults = await Promise.all(
          toolCallList.map(async ({ tc, name, args }) => {
            if (aborted) return { tc, name, result: "[Aborted]" };
            const result = await dispatchTool(name, args, requestIp, requestDeviceId, lastUserMsg);
            const ok = !result.startsWith("خطأ") && !result.startsWith("فشل");
            if (!aborted) sse(expressRes, { type: "tool_result", step, name, result: result.slice(0, 2000), ok });
            return { tc, name, result };
          }),
        );

        for (const { tc, name, result } of toolResults) {
          loop.push({
            role: "tool",
            content: result.slice(0, 8000),
            tool_call_id: (tc as { id: string }).id,
            name,
          });
        }

        // After executing tools, force a final answer on the next iteration
        forceFinalAnswer = true;

        // If we detected a duplicate call, break immediately and don't call the model again
        if (hasDuplicate) {
          sse(expressRes, { type: "done", steps: step });
          expressRes.end();
          return;
        }

        continue;
      }

      break;
    }

    if (!aborted) {
      sse(expressRes, { type: "done", steps: step });
      expressRes.end();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Orchestration error";
    try {
      expressRes.write(
        `data: ${JSON.stringify({ type: "error", error: message })}\n\n`,
      );
      expressRes.end();
    } catch { /* closed */ }
  }
});

// ── GET /api/orchestrate/tools — list all available tools ─────────────────────
router.get("/orchestrate/tools", (_req, res: import("express").Response) => {
  res.json({
    count: ORCHESTRATE_TOOLS.length,
    toolCapableModels: Array.from(TOOL_CAPABLE_MODELS),
    tools: ORCHESTRATE_TOOLS.map((t) => ({
      name: (t as unknown as { function: { name: string; description: string } })
        .function.name,
      description: (
        t as unknown as { function: { name: string; description: string } }
      ).function.description,
    })),
  });
});

// ── GET /api/orchestrate/status — provider status for tools ───────────────────
router.get("/orchestrate/status", (_req, res: import("express").Response) => {
  const providers = listProviders().filter((p) => p.available);
  const best = findToolCapableProvider();
  res.json({
    toolsAvailable: best !== null,
    bestProvider: best,
    availableProviders: providers.map((p) => p.id),
    toolCapableModels: Array.from(TOOL_CAPABLE_MODELS).slice(0, 15),
  });
});

export default router;
