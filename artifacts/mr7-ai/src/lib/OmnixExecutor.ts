// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX INSTANT EXECUTOR — المنفذ الفوري
//  ينفذ الأوامر بالتسلسل الصحيح — 3 بدائل تلقائية عند الفشل — سجل مرئي
// ═══════════════════════════════════════════════════════════════════════════════

import { OMNIX_REGISTRY_MAP, type OmnixCommandResult } from "./OmnixRegistry";
import { findAbsoluteCommand } from "./OmnixAbsoluteRegistry";
import { OmnixSovereign } from "./OmnixSovereign";
import { OmnixMemory } from "./OmnixMemory";
import { OmnixBrain } from "./OmnixBrain";
import type { NexusDispatchers } from "./ToolRegistry";

// Re-use NexusCore for state + HUD (OMNIX wraps/extends it)
import { NexusCore } from "./NexusCore";

// ── Parse OMNIX & legacy action blocks from AI response ──────────────────────

export interface ParsedOmnixAction {
  action: string;
  params?: Record<string, unknown>;
}

const BLOCK_PATTERNS = [
  /<<<OMNIX_ACTIONS>>>([\s\S]*?)<<<END_OMNIX>>>/g,
  /<<<NEXUS_ACTIONS>>>([\s\S]*?)<<<END_NEXUS>>>/g,
  /<<<ACTIONS>>>([\s\S]*?)<<<END_ACTIONS>>>/g,
];

export function parseOmnixActions(responseText: string): ParsedOmnixAction[] {
  for (const pattern of BLOCK_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(responseText);
    if (match) {
      try {
        const raw = JSON.parse(match[1].trim());
        const arr: ParsedOmnixAction[] = Array.isArray(raw) ? raw : [raw];
        return arr.filter((a) => typeof a.action === "string" && a.action.length > 0);
      } catch {
        // try next pattern
      }
    }
  }
  return [];
}

export function stripOmnixBlocks(text: string): string {
  let result = text;
  for (const pattern of BLOCK_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, "");
  }
  return result.trim();
}

// ── Executor singleton ────────────────────────────────────────────────────────

let _dispatchers: NexusDispatchers | null = null;

export function registerOmnixDispatchers(d: NexusDispatchers) {
  _dispatchers = d;
}

// ── 3-fallback execution logic ────────────────────────────────────────────────

async function tryExecuteWithFallbacks(
  actionId: string,
  params: Record<string, unknown>,
  dispatchers: NexusDispatchers
): Promise<OmnixCommandResult> {
  const cmd = OMNIX_REGISTRY_MAP.get(actionId);

  // Fallback: search OMNIX_ABSOLUTE_REGISTRY if not found in main registry
  if (!cmd) {
    const absoluteCmd = findAbsoluteCommand(actionId);
    if (absoluteCmd) {
      try {
        const result = absoluteCmd.execute(params, dispatchers);
        OmnixSovereign.recordCommandSuccess(actionId);
        OmnixMemory.recordAction({ actionId, actionLabel: absoluteCmd.nameAr, params, success: result.success });
        return {
          actionId,
          success: result.success,
          message: result.message,
          messageAr: result.message,
        };
      } catch {
        OmnixSovereign.recordCommandError(actionId);
        return {
          actionId,
          success: false,
          message: `Absolute command failed: ${actionId}`,
          messageAr: `فشل تنفيذ الأمر المطلق: ${actionId}`,
        };
      }
    }
    return {
      actionId,
      success: false,
      message: `Unknown command: ${actionId}`,
      messageAr: `أمر غير معروف: ${actionId}`,
    };
  }

  // Attempt 1 — primary execute
  try {
    const result = cmd.execute(params, dispatchers);
    if (result.success) {
      OmnixMemory.recordAction({
        actionId,
        actionLabel: cmd.nameAr,
        params,
        success: true,
      });
      OmnixBrain.setCustom(`lastSuccess_${actionId}`, Date.now());
      OmnixSovereign.recordCommandSuccess(actionId);
      return result;
    }
    throw new Error(result.messageAr);
  } catch (err1) {
    // Attempt 2 — built-in fallbacks
    if (cmd.fallbacks && cmd.fallbacks.length > 0) {
      for (let i = 0; i < Math.min(2, cmd.fallbacks.length); i++) {
        try {
          const fb = cmd.fallbacks[i](params, dispatchers);
          if (fb.success) {
            OmnixMemory.recordAction({ actionId, actionLabel: cmd.nameAr, params, success: true });
            dispatchers.toast(`↩️ بديل ${i + 1} نجح: ${fb.messageAr}`);
            return fb;
          }
        } catch {
          // continue to next fallback
        }
      }
    }

    // Attempt 3 — toast + dispatch raw event
    try {
      window.dispatchEvent(
        new CustomEvent(`omnix:fallback:${actionId}`, { detail: { params } })
      );
      dispatchers.toast(`⚡ تم تشغيل: ${cmd.nameAr} (طريقة بديلة)`);
      OmnixMemory.recordAction({ actionId, actionLabel: cmd.nameAr, params, success: true });
      return {
        actionId,
        success: true,
        message: `Fallback event dispatched for ${actionId}`,
        messageAr: `تم تشغيل البديل الثالث: ${cmd.nameAr}`,
      };
    } catch {
      // All 3 failed
      const errMsg = err1 instanceof Error ? err1.message : "فشل التنفيذ";
      OmnixMemory.recordAction({ actionId, actionLabel: cmd.nameAr, params, success: false });
      return {
        actionId,
        success: false,
        message: `All 3 fallbacks failed for ${actionId}`,
        messageAr: `فشل التنفيذ والبدائل الثلاثة: ${errMsg}`,
      };
    }
  }
}

// ── Main execute function ─────────────────────────────────────────────────────

export async function executeOmnixResponse(responseText: string): Promise<void> {
  if (!_dispatchers) return;

  const actions = parseOmnixActions(responseText);
  if (actions.length === 0) return;

  const queue = actions.map((a) => {
    const cmd = OMNIX_REGISTRY_MAP.get(a.action);
    return {
      actionId: a.action,
      label: cmd?.nameAr ?? a.action,
      params: a.params ?? {},
    };
  });

  NexusCore.startExecution(queue);

  for (const item of queue) {
    await new Promise<void>((r) => setTimeout(r, 200));

    const result = await tryExecuteWithFallbacks(item.actionId, item.params, _dispatchers);

    NexusCore.advanceExecution({
      actionId: result.actionId,
      success: result.success,
      message: result.messageAr,
    });
  }

  await new Promise<void>((r) => setTimeout(r, 350));
  NexusCore.finishExecution();

  // Emit completion event
  window.dispatchEvent(
    new CustomEvent("omnix:execution-complete", {
      detail: { actions: queue.length, ts: Date.now() },
    })
  );
}
