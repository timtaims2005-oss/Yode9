// ─────────────────────────────────────────────────────────────────────────────
//  NEXUS INTERCEPTOR — الطبقة الثالثة
//  يعترض كل رسالة قبل إرسالها للذكاء الاصطناعي ويحقن سياق التحكم الكامل
// ─────────────────────────────────────────────────────────────────────────────

import { NEXUS_TOOL_REGISTRY } from "./ToolRegistry";
import { NexusCore } from "./NexusCore";

export interface InterceptorContext {
  activeProvider?: string;
  activeModel?: string;
  themeAccent?: string;
  activeGlobeTheme?: string;
  activePersonaPreset?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  openModals?: string[];
  language?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Build the NEXUS system prompt block injected into every message
// ─────────────────────────────────────────────────────────────────────────────
export function buildNexusSystemPrompt(ctx: InterceptorContext): string {
  NexusCore.touchSnapshot();

  const toolsList = NEXUS_TOOL_REGISTRY.map((t) => {
    const paramsStr = t.params
      ? ` | params: ${JSON.stringify(
          Object.fromEntries(
            Object.entries(t.params).map(([k, v]) => [
              k,
              { type: v.type, desc: v.description, ...(v.enum ? { enum: v.enum } : {}), ...(v.required ? { required: true } : {}) },
            ])
          )
        )}`
      : "";
    return `  • ${t.id} [${t.category}]: ${t.descriptionAr}${paramsStr}`;
  }).join("\n");

  const openModalsStr = (ctx.openModals ?? []).join(", ") || "لا يوجد";

  return `
╔══════════════════════════════════════════════════════════════╗
║           🤖 NEXUS AI AGENT — نظام التحكم الكامل            ║
╚══════════════════════════════════════════════════════════════╝

أنت تمتلك صلاحية تحكم كاملة في هذا التطبيق عبر نظام NEXUS.
عندما يطلب المستخدم فتح شيء، تغيير شيء، تشغيل أداة، أو أي إجراء
— نفّذه تلقائياً بإضافة كتلة الأوامر في ردك.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 الحالة الحالية للتطبيق:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• المزود النشط: ${ctx.activeProvider ?? "غير محدد"}
• النموذج النشط: ${ctx.activeModel ?? "غير محدد"}
• لون الثيم: ${ctx.themeAccent ?? "green"}
• ثيم الكرة 3D: ${ctx.activeGlobeTheme ?? "cyber"}
• الشخصية النشطة: ${ctx.activePersonaPreset ?? "default"}
• درجة الحرارة: ${ctx.temperature ?? 0.7}
• الحد الأقصى للرموز: ${ctx.maxTokens ?? 2048}
• البث المباشر: ${ctx.streaming ? "مفعّل" : "معطّل"}
• النوافذ المفتوحة: ${openModalsStr}
• اللغة: ${ctx.language ?? "ar"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ صيغة الأوامر (JSON دقيق):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<<<NEXUS_ACTIONS>>>
[
  {"action": "tool_id", "params": {"key": "value"}},
  {"action": "tool_id_2"}
]
<<<END_NEXUS>>>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ الأوامر المتاحة (${NEXUS_TOOL_REGISTRY.length} أمر):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${toolsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 قواعد هامة:
• يمكنك تنفيذ عدة أوامر دفعة واحدة في نفس المصفوفة
• أخبر المستخدم بما ستفعله قبل كتلة الأوامر
• الأوامر تُنفَّذ تلقائياً فور إرسال ردك — لا حاجة لخطوات إضافية
• إذا لم يطلب المستخدم إجراءً — لا تضف كتلة الأوامر أبداً
• إذا فشل أمر — سيحاول النظام بديلاً تلقائياً
╔══════════════════════════════════════════════════════════════╝
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Parse NEXUS actions from AI response text
// ─────────────────────────────────────────────────────────────────────────────
export interface ParsedNexusAction {
  action: string;
  params?: Record<string, unknown>;
}

export function parseNexusActions(responseText: string): ParsedNexusAction[] {
  // Support both NEXUS format and legacy AIController format
  const nexusMatch = responseText.match(/<<<NEXUS_ACTIONS>>>([\s\S]*?)<<<END_NEXUS>>>/);
  const legacyMatch = responseText.match(/<<<ACTIONS>>>([\s\S]*?)<<<END_ACTIONS>>>/);
  const match = nexusMatch ?? legacyMatch;
  if (!match) return [];
  try {
    const raw = JSON.parse(match[1].trim());
    const arr: ParsedNexusAction[] = Array.isArray(raw) ? raw : [raw];
    return arr.filter((a) => typeof a.action === "string" && a.action.length > 0);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Strip action blocks from response text (for clean display)
// ─────────────────────────────────────────────────────────────────────────────
export function stripNexusBlocks(text: string): string {
  return text
    .replace(/<<<NEXUS_ACTIONS>>>[\s\S]*?<<<END_NEXUS>>>/g, "")
    .replace(/<<<ACTIONS>>>[\s\S]*?<<<END_ACTIONS>>>/g, "")
    .trim();
}
