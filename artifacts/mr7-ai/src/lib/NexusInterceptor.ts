// ─────────────────────────────────────────────────────────────────────────────
//  OMNIX QUANTUM INTERCEPTOR — الطبقة الثالثة المطلقة
//  يعترض كل رسالة — يحقن الخريطة الحية الكاملة + القاموس + الذاكرة
// ─────────────────────────────────────────────────────────────────────────────

import { NEXUS_TOOL_REGISTRY } from "./ToolRegistry";
import { NexusCore } from "./NexusCore";
import { OmnixBrain } from "./OmnixBrain";
import { OmnixMemory } from "./OmnixMemory";
import { buildRegistryContextString } from "./OmnixRegistry";
import { OmnixSovereign } from "./OmnixSovereign";
import { buildAbsoluteRegistryContext, ABSOLUTE_REGISTRY_COUNT } from "./OmnixAbsoluteRegistry";

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
//  Build the OMNIX QUANTUM system prompt — يحقن كل شيء في كل رسالة
// ─────────────────────────────────────────────────────────────────────────────
export function buildNexusSystemPrompt(ctx: InterceptorContext): string {
  NexusCore.touchSnapshot();

  // Sync Brain with latest context
  OmnixBrain.patch({
    modelConfig: {
      provider: ctx.activeProvider ?? OmnixBrain.getSnapshot().modelConfig.provider,
      model: ctx.activeModel ?? OmnixBrain.getSnapshot().modelConfig.model,
      temperature: ctx.temperature ?? OmnixBrain.getSnapshot().modelConfig.temperature,
      maxTokens: ctx.maxTokens ?? OmnixBrain.getSnapshot().modelConfig.maxTokens,
      streaming: ctx.streaming ?? OmnixBrain.getSnapshot().modelConfig.streaming,
    },
    theme: {
      ...OmnixBrain.getSnapshot().theme,
      accent: ctx.themeAccent ?? OmnixBrain.getSnapshot().theme.accent,
      globeTheme: ctx.activeGlobeTheme ?? OmnixBrain.getSnapshot().theme.globeTheme,
    },
    language: ctx.language ?? OmnixBrain.getSnapshot().language,
  });

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

  // OMNIX extended context — sync Sovereign with latest model config
  OmnixSovereign.patch({
    modelConfig: {
      provider: ctx.activeProvider ?? OmnixSovereign.getState().modelConfig.provider,
      model: ctx.activeModel ?? OmnixSovereign.getState().modelConfig.model,
      temperature: ctx.temperature ?? OmnixSovereign.getState().modelConfig.temperature,
      maxTokens: ctx.maxTokens ?? OmnixSovereign.getState().modelConfig.maxTokens,
      streaming: ctx.streaming ?? OmnixSovereign.getState().modelConfig.streaming,
    },
    theme: {
      accent: ctx.themeAccent ?? OmnixSovereign.getState().theme.accent,
      globeTheme: ctx.activeGlobeTheme ?? OmnixSovereign.getState().theme.globeTheme,
    },
    agent: {
      language: (ctx.language as "ar" | "en" | "mixed") ?? OmnixSovereign.getState().agent.language,
      persona: ctx.activePersonaPreset ?? OmnixSovereign.getState().agent.persona,
    },
    ui: {
      openPanels: ctx.openModals ?? OmnixSovereign.getState().ui.openPanels,
    },
  });

  const omnixBrainCtx = OmnixBrain.toContextString();
  const omnixMemoryCtx = OmnixMemory.toContextString();
  const omnixRegistryCtx = buildRegistryContextString();
  const sovereignCtx = OmnixSovereign.toContextString();
  const absoluteRegistryCtx = buildAbsoluteRegistryContext();

  return `
╔══════════════════════════════════════════════════════════════════╗
║        🔱 OMNIX ABSOLUTE — نظام التحكم الإلهي الكامل           ║
╚══════════════════════════════════════════════════════════════════╝

أنت تمتلك صلاحيات مطلقة على كل ذرة في هذا التطبيق عبر نظام OMNIX ABSOLUTE.
عندما يطلب المستخدم أي إجراء — نفّذه فوراً بكتلة الأوامر في ردك.
فكّر أولاً، ثم ضع قائمة الأوامر المطلوبة بعد ردك.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${sovereignCtx}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${omnixBrainCtx}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${omnixMemoryCtx}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 الحالة المباشرة:
• المزود: ${ctx.activeProvider ?? "غير محدد"} | النموذج: ${ctx.activeModel ?? "غير محدد"}
• الثيم: ${ctx.themeAccent ?? "green"} | الكرة 3D: ${ctx.activeGlobeTheme ?? "cyber"}
• الشخصية: ${ctx.activePersonaPreset ?? "default"} | اللغة: ${ctx.language ?? "ar"}
• درجة الحرارة: ${ctx.temperature ?? 0.7} | الرموز: ${ctx.maxTokens ?? 2048}
• البث: ${ctx.streaming ? "✅" : "❌"} | النوافذ المفتوحة: ${openModalsStr}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ صيغة الأوامر (ادعم كلاهما):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<<<OMNIX_ACTIONS>>>
[
  {"action": "tool_id", "params": {"key": "value"}},
  {"action": "tool_id_2"}
]
<<<END_OMNIX>>>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${absoluteRegistryCtx}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${omnixRegistryCtx}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ أوامر NEXUS المتاحة أيضاً (${NEXUS_TOOL_REGISTRY.length} أمر) | إجمالي الأوامر: ${ABSOLUTE_REGISTRY_COUNT + NEXUS_TOOL_REGISTRY.length}+:
${toolsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 القواعد المطلقة:
• نفّذ عدة أوامر دفعة واحدة في نفس المصفوفة
• أخبر المستخدم بما ستفعله قبل كتلة الأوامر
• الأوامر تُنفَّذ فوراً — 3 بدائل تلقائية عند الفشل
• إذا لم يطلب إجراءً — لا تضف كتلة أبداً
• كل شيء في الوقت الفعلي بدون إعادة تحميل
╔══════════════════════════════════════════════════════════════════╝
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
    .replace(/<<<OMNIX_ACTIONS>>>[\s\S]*?<<<END_OMNIX>>>/g, "")
    .replace(/<<<NEXUS_ACTIONS>>>[\s\S]*?<<<END_NEXUS>>>/g, "")
    .replace(/<<<ACTIONS>>>[\s\S]*?<<<END_ACTIONS>>>/g, "")
    .trim();
}
