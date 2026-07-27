// ─────────────────────────────────────────────────────────────────────────────
//  APPROVAL GATE — Human-in-the-Loop & Approval Layer (System 5)
//  يتيح طلب تأكيد بشري قبل تنفيذ الأدوات الحساسة مع إمكانية التجاوز.
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة فقط.
// ─────────────────────────────────────────────────────────────────────────────

import type { ToolDefinition } from "./toolsRegistry";

// ── أنواع نظام الموافقة ───────────────────────────────────────────────────────
export type ApprovalPolicy = "always" | "once_per_session" | "bypass" | "ask";

export type ApprovalRequest = {
  id: string;
  toolId: string;
  toolName: string;
  toolDescription: string;
  input: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskReason: string;
  createdAt: number;
  status: "pending" | "approved" | "rejected" | "timeout";
  resolvedAt?: number;
  resolvedBy?: "user" | "auto" | "policy";
};

export type ApprovalConfig = {
  enabled: boolean;
  globalPolicy: ApprovalPolicy;
  perToolPolicies: Record<string, ApprovalPolicy>;
  riskThreshold: "low" | "medium" | "high"; // ما فوقه يحتاج تأكيد
  timeoutMs: number;           // ميلي-ثانية قبل الرفض التلقائي (0 = لا مهلة)
  autoApproveCategories: string[]; // فئات تُوافَق عليها تلقائياً
};

// ── الإعدادات الافتراضية ──────────────────────────────────────────────────────
let _config: ApprovalConfig = {
  enabled: true,
  globalPolicy: "ask",
  perToolPolicies: {},
  riskThreshold: "high",
  timeoutMs: 60_000, // دقيقة واحدة
  autoApproveCategories: ["navigation", "arsenal", "ai"],
};

const SESSION_APPROVALS_KEY = "mr7-session-approvals";

// ── تقدير مستوى المخاطر للأداة ───────────────────────────────────────────────
export function assessRisk(tool: ToolDefinition, input: Record<string, unknown>): {
  level: "low" | "medium" | "high" | "critical";
  reason: string;
} {
  const desc = tool.description.toLowerCase();
  const name = tool.name.toLowerCase();
  const moduleId = tool.moduleId.toLowerCase();
  const inputStr = JSON.stringify(input).toLowerCase();

  // Critical: حذف أو كتابة أو رفع
  const criticalPatterns = [
    /delete|remove|destroy|wipe|format|rm -rf/i,
    /overwrite|truncate|drop table/i,
    /execute|shell|bash|cmd|powershell/i,
    /sudo|root|privilege/i,
  ];
  if (criticalPatterns.some((p) => p.test(desc) || p.test(inputStr))) {
    return { level: "critical", reason: "Destructive or system-level operation detected" };
  }

  // High: ملفات، شبكة، نظام
  const highPatterns = [
    /write|create file|upload|modify|patch/i,
    /network|request|fetch|http|api call/i,
    /system|process|spawn|subprocess/i,
    /database|sql|query/i,
  ];
  if (tool.confirmRequired || highPatterns.some((p) => p.test(desc) || p.test(moduleId))) {
    return { level: "high", reason: "File system, network, or system modification" };
  }

  // Medium: OSINT، بحث، تحليل
  if (tool.category === "osint" || /scan|recon|intel|search|lookup/i.test(desc)) {
    return { level: "medium", reason: "External data gathering or OSINT operation" };
  }

  // Low: navigation، display، read-only
  if (tool.category === "navigation" || /read|view|display|show|list/i.test(desc)) {
    return { level: "low", reason: "Read-only or navigation action" };
  }

  return { level: "low", reason: "Standard tool operation" };
}

// ── فحص الموافقات المخزنة في الجلسة ─────────────────────────────────────────
function getSessionApprovals(): Record<string, boolean> {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_APPROVALS_KEY) || "{}");
  } catch { return {}; }
}

function saveSessionApproval(toolId: string, approved: boolean): void {
  try {
    const approvals = getSessionApprovals();
    approvals[toolId] = approved;
    sessionStorage.setItem(SESSION_APPROVALS_KEY, JSON.stringify(approvals));
  } catch { /* ignore */ }
}

// ── قائمة انتظار طلبات الموافقة ──────────────────────────────────────────────
const _pendingRequests = new Map<
  string,
  { resolve: (approved: boolean) => void; request: ApprovalRequest }
>();

// ── مستمعو طلبات الموافقة (يُستخدم من ApprovalDialog) ────────────────────────
type ApprovalListener = (request: ApprovalRequest) => void;
const _approvalListeners: ApprovalListener[] = [];

export function onApprovalRequest(fn: ApprovalListener): () => void {
  _approvalListeners.push(fn);
  return () => {
    const i = _approvalListeners.indexOf(fn);
    if (i >= 0) _approvalListeners.splice(i, 1);
  };
}

// ── تسوية طلب موافقة من الـ UI ────────────────────────────────────────────────
export function resolveApproval(requestId: string, approved: boolean): void {
  const pending = _pendingRequests.get(requestId);
  if (!pending) return;
  pending.request.status = approved ? "approved" : "rejected";
  pending.request.resolvedAt = Date.now();
  pending.request.resolvedBy = "user";
  _pendingRequests.delete(requestId);
  pending.resolve(approved);
}

// ── الدالة الرئيسية: طلب موافقة بشرية ────────────────────────────────────────
export async function requestApproval(
  tool: ToolDefinition,
  input: Record<string, unknown>,
): Promise<{ approved: boolean; reason: string }> {
  if (!_config.enabled) {
    return { approved: true, reason: "Approval gate disabled" };
  }

  const policy = _config.perToolPolicies[tool.moduleId] ?? _config.globalPolicy;

  // سياسة التجاوز
  if (policy === "bypass") {
    return { approved: true, reason: "Bypass policy active for this tool" };
  }

  // تحقق من الفئات المُوافَق عليها تلقائياً
  if (tool.category && _config.autoApproveCategories.includes(tool.category)) {
    return { approved: true, reason: `Category "${tool.category}" is auto-approved` };
  }

  // تقييم المخاطر
  const { level, reason: riskReason } = assessRisk(tool, input);
  const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  const thresholdOrder = riskOrder[_config.riskThreshold];

  if (riskOrder[level] < thresholdOrder) {
    return { approved: true, reason: `Risk level "${level}" below threshold` };
  }

  // فحص موافقات الجلسة (once_per_session)
  if (policy === "once_per_session") {
    const sessionApprovals = getSessionApprovals();
    if (tool.moduleId in sessionApprovals) {
      return {
        approved: sessionApprovals[tool.moduleId],
        reason: sessionApprovals[tool.moduleId] ? "Previously approved this session" : "Previously rejected this session",
      };
    }
  }

  // إنشاء طلب موافقة
  const request: ApprovalRequest = {
    id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    toolId: tool.moduleId,
    toolName: tool.name,
    toolDescription: tool.description,
    input,
    riskLevel: level,
    riskReason,
    createdAt: Date.now(),
    status: "pending",
  };

  // إرسال الطلب إلى المستمعين (ApprovalDialog)
  const approvalPromise = new Promise<boolean>((resolve) => {
    _pendingRequests.set(request.id, { resolve, request });
    _approvalListeners.forEach((fn) => { try { fn(request); } catch { /* ignore */ } });
  });

  // مهلة الموافقة
  let approved: boolean;
  if (_config.timeoutMs > 0) {
    const timeoutPromise = new Promise<boolean>((resolve) =>
      setTimeout(() => {
        if (_pendingRequests.has(request.id)) {
          request.status = "timeout";
          request.resolvedAt = Date.now();
          request.resolvedBy = "auto";
          _pendingRequests.delete(request.id);
          resolve(false); // رفض تلقائي عند انتهاء المهلة
        }
      }, _config.timeoutMs),
    );
    approved = await Promise.race([approvalPromise, timeoutPromise]);
  } else {
    approved = await approvalPromise;
  }

  // حفظ في الجلسة إذا كانت السياسة "مرة واحدة"
  if (policy === "once_per_session") {
    saveSessionApproval(tool.moduleId, approved);
  }

  return {
    approved,
    reason: approved ? "User approved" : (request.status === "timeout" ? "Timed out" : "User rejected"),
  };
}

// ── إدارة الإعدادات ───────────────────────────────────────────────────────────
export function configureApprovalGate(patch: Partial<ApprovalConfig>): void {
  _config = { ..._config, ...patch };
}

export function getApprovalConfig(): Readonly<ApprovalConfig> {
  return _config;
}

export function setToolPolicy(toolId: string, policy: ApprovalPolicy): void {
  _config.perToolPolicies[toolId] = policy;
}

export function clearToolPolicy(toolId: string): void {
  delete _config.perToolPolicies[toolId];
}

export function getPendingApprovals(): ApprovalRequest[] {
  return [..._pendingRequests.values()].map((v) => v.request);
}

// ── تنفيذ أداة مع بوابة الموافقة ─────────────────────────────────────────────
export async function executeWithApproval(
  tool: ToolDefinition,
  input: Record<string, unknown>,
): Promise<{ ok: boolean; result: unknown; approvalStatus: string }> {
  const { approved, reason } = await requestApproval(tool, input);

  if (!approved) {
    return {
      ok: false,
      result: `❌ Tool execution blocked: ${reason}. User must approve before "${tool.name}" can run.`,
      approvalStatus: reason,
    };
  }

  try {
    const result = await tool.execute(input);
    return { ok: true, result, approvalStatus: reason };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, result: errMsg, approvalStatus: reason };
  }
}
