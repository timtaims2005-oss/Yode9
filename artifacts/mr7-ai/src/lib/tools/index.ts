// ─────────────────────────────────────────────────────────────────────────────
//  TOOLS ENTRY POINT — نقطة الدخول لتهيئة جميع الأدوات وتسجيلها
//  استدعِ initializeToolsRegistry() مرة واحدة عند تشغيل التطبيق
// ─────────────────────────────────────────────────────────────────────────────

import { registerArsenalTools } from "./arsenalTools";
import { registerNavigationTools } from "./navigationTools";
import { registerSystemTools } from "./systemTools";
import { getToolCount } from "../toolsRegistry";

let _initialized = false;

/**
 * تهيئة جميع الأدوات في السجل:
 * - 155+ موديول Arsenal Hub
 * - أدوات التنقل والـ UI (Sidebar/TopBar)
 * - أدوات الأنظمة الداخلية (ملفات، ذاكرة، مهارات، OSINT)
 */
export function initializeToolsRegistry(): void {
  if (_initialized) return;
  _initialized = true;

  try {
    registerArsenalTools();
    registerNavigationTools();
    registerSystemTools();
    console.log(`[toolsRegistry] ✅ All tools initialized — ${getToolCount()} tools ready.`);
  } catch (err) {
    console.error("[toolsRegistry] ❌ Initialization failed:", err);
    _initialized = false; // السماح بإعادة المحاولة
  }
}

/**
 * إعادة تهيئة السجل (مفيد عند تغيير الإعدادات أو إضافة أدوات ديناميكية)
 */
export function reinitializeToolsRegistry(): void {
  _initialized = false;
  initializeToolsRegistry();
}

export { getToolCount } from "../toolsRegistry";
export type { ToolDefinition, ToolActivityEvent } from "../toolsRegistry";
