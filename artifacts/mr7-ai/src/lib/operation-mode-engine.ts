/**
 * Operation Mode Engine v2 — Full Real Implementation
 * يربط OPERATION CENTER بكل الأنظمة الحقيقية الموجودة
 */

import { animationController }  from "./animation-controller";
import { adaptiveFPS }          from "./adaptive-fps";
import { requestPrioritizer }   from "./request-prioritizer";
import { frameScheduler }       from "./frame-scheduler";
import { memoryPressure }       from "./memory-pressure";
import { thermalGuard }         from "./thermal-guard";
import { renderBudget }         from "./render-budget";
import { idleQueue }            from "./idle-queue";
import { eventBus }             from "./event-bus";
import { getQualityLevel }      from "./adaptive-quality";

export type PerfMode     = "low" | "medium" | "high" | "xhigh";
export type WorkflowMode = "Smarter" | "Lite" | "Autonomous" | "Max" | "Power" | "Turbo";

const LS_PERF  = "mr7-op-perf";
const LS_WFLOW = "mr7-op-wflow";
const LS_SYS   = "mr7-workflow-system-prompt";

const PERF_MODES: PerfMode[]         = ["low", "medium", "high", "xhigh"];
const WORKFLOW_MODES: WorkflowMode[] = ["Smarter", "Lite", "Autonomous", "Max", "Power", "Turbo"];

function isPerfMode(v: string | null): v is PerfMode {
  return !!v && (PERF_MODES as string[]).includes(v);
}
function isWorkflowMode(v: string | null): v is WorkflowMode {
  return !!v && (WORKFLOW_MODES as string[]).includes(v);
}

// ── System Prompts لكل Workflow Mode ─────────────────────────────────────────
export const WORKFLOW_PROMPTS: Record<WorkflowMode, string> = {
  Smarter: `أنت مساعد ذكاء اصطناعي متقدم جداً. قبل الإجابة:
1. حلّل السؤال من زوايا متعددة
2. فكّر بعمق في الحل الأمثل
3. تحقق من صحة إجابتك
4. قدّم إجابة شاملة ودقيقة مع أمثلة عملية`,

  Lite: `أنت مساعد سريع وفعّال. قواعدك:
- اجب مباشرة بدون مقدمات
- اجعل الإجابة مختصرة وواضحة
- تجنب التفاصيل غير الضرورية
- الدقة أهم من الطول`,

  Autonomous: `أنت مساعد مستقل ومبادر. سلوكك:
- خذ المبادرة واقترح حلولاً لم يطلبها المستخدم
- توقّع الخطوة التالية وجهّزها
- نبّه على المشاكل المحتملة قبل حدوثها
- اعمل كشريك استراتيجي لا مجرد منفّذ`,

  Max: `أنت في وضع أقصى قدرة. معاييرك:
- أجب بأقصى عمق وتفصيل ممكن
- اشمل كل الجوانب: تقني، عملي، نظري
- قدّم مقارنات وبدائل
- أضف مصادر وتوصيات
- لا تختصر — الشمولية هي الأولوية`,

  Power: `وضع الطاقة العالية — أداء ذكي مكثّف:
- دمج السرعة مع العمق
- أجوبة موضوعية مع أمثلة كود حقيقية
- ركّز على الحلول العملية القابلة للتطبيق فوراً
- استخدم قدراتك التقنية الكاملة`,

  Turbo: `وضع توربو — أقصى سرعة:
- الإجابة في أقل عدد كلمات ممكن
- مباشرة للنقطة الجوهرية
- لا شرح إضافي إلا إذا طُلب
- الكود بدون شرح ما لم يُطلب`,
};

// ── إعدادات دقيقة لكل PerfMode ───────────────────────────────────────────────
interface PerfProfile {
  // Animation
  animLevel:         1 | 2 | 3 | 4 | 5;
  // FPS
  fpsTarget:         "max" | "low" | "auto";
  // Network
  maxConcurrent:     number;
  requestPriority:   "critical" | "high" | "normal" | "low";
  // Memory
  gcIntervalMs:      number;
  memPressureTarget: "aggressive" | "balanced" | "relaxed";
  // Rendering
  frameBudgetMs:     number;
  renderThrottle:    number;  // ms بين renders
  // CSS
  cssVarPrefix:      string;
  // Features ON/OFF
  particles:         boolean;
  webgl:             boolean;
  blur:              boolean;
  heavyModals:       boolean;
  // AI params
  aiTemperature:     number;
  aiMaxTokens:       number;
  aiStreamChunkMs:   number;
}

const PERF_PROFILES: Record<PerfMode, PerfProfile> = {
  low: {
    animLevel: 1, fpsTarget: "low", maxConcurrent: 1,
    requestPriority: "low", gcIntervalMs: 3000,
    memPressureTarget: "aggressive", frameBudgetMs: 32,
    renderThrottle: 100, cssVarPrefix: "low",
    particles: false, webgl: false, blur: false, heavyModals: false,
    aiTemperature: 0.3, aiMaxTokens: 512, aiStreamChunkMs: 80,
  },
  medium: {
    animLevel: 3, fpsTarget: "auto", maxConcurrent: 3,
    requestPriority: "normal", gcIntervalMs: 10000,
    memPressureTarget: "balanced", frameBudgetMs: 16,
    renderThrottle: 33, cssVarPrefix: "med",
    particles: false, webgl: false, blur: true, heavyModals: true,
    aiTemperature: 0.7, aiMaxTokens: 2048, aiStreamChunkMs: 48,
  },
  high: {
    animLevel: 4, fpsTarget: "auto", maxConcurrent: 5,
    requestPriority: "high", gcIntervalMs: 20000,
    memPressureTarget: "relaxed", frameBudgetMs: 11,
    renderThrottle: 16, cssVarPrefix: "high",
    particles: true, webgl: true, blur: true, heavyModals: true,
    aiTemperature: 0.7, aiMaxTokens: 4096, aiStreamChunkMs: 32,
  },
  xhigh: {
    animLevel: 5, fpsTarget: "max", maxConcurrent: 8,
    requestPriority: "critical", gcIntervalMs: 60000,
    memPressureTarget: "relaxed", frameBudgetMs: 8,
    renderThrottle: 8, cssVarPrefix: "xhigh",
    particles: true, webgl: true, blur: true, heavyModals: true,
    aiTemperature: 0.9, aiMaxTokens: 8192, aiStreamChunkMs: 16,
  },
};

// ── Engine Class ──────────────────────────────────────────────────────────────
class OperationModeEngine {
  private perfMode:  PerfMode     = "medium";
  private wflow:     WorkflowMode = "Smarter";
  private gcTimer:   ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(p: PerfMode, w: WorkflowMode) => void> = new Set();
  private initialized = false;

  // ── init ────────────────────────────────────────────────────────────────────
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // اقرأ الإعدادات المحفوظة (مع تحقق من صحتها)
    const sp = localStorage.getItem(LS_PERF);
    const sw = localStorage.getItem(LS_WFLOW);
    if (isPerfMode(sp))     this.perfMode = sp;
    if (isWorkflowMode(sw)) this.wflow    = sw;

    // طبّق فوراً
    this._applyPerf(this.perfMode);
    this._applyWorkflow(this.wflow);

    // استمع لتغييرات من TopBar (نفس الـ tab)
    window.addEventListener("mr7-op-change", () => {
      const p = localStorage.getItem(LS_PERF);
      const w = localStorage.getItem(LS_WFLOW);
      let changed = false;
      if (isPerfMode(p) && p !== this.perfMode)         { this.setPerfMode(p, { persist: false }); changed = true; }
      if (isWorkflowMode(w) && w !== this.wflow)         { this.setWorkflowMode(w, { persist: false }); changed = true; }
      if (changed) this._notify();
    });

    // استمع لتدهور الأداء — تخفيض تلقائي
    thermalGuard.onMetrics(m => {
      if (m.state === "critical" && this.perfMode !== "low") {
        console.warn("[OpEngine] Thermal critical → auto-downgrade to LOW");
        this.setPerfMode("low", { persist: false });
      } else if (m.state === "serious" && (this.perfMode === "xhigh" || this.perfMode === "high")) {
        console.warn("[OpEngine] Thermal serious → auto-downgrade to MEDIUM");
        this.setPerfMode("medium", { persist: false });
      }
    });

    // استمع لضغط الذاكرة
    memoryPressure.onStats(stats => {
      if (stats.pressure === "critical" && this.perfMode === "xhigh") {
        this.setPerfMode("high", { persist: false });
      }
    });

    // Visibility change — خفّض عند الانتقال للخلفية
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        animationController.setLevel(1, true);
        if (this.perfMode === "xhigh") adaptiveFPS.forceLowPower();
      } else {
        this._applyPerf(this.perfMode);
      }
    });

    console.log(`[OpEngine] init — perf=${this.perfMode} workflow=${this.wflow}`);
  }

  // ── تغيير الحالة المركزي (يحدّث + يطبّق + يخزّن + ينبّه في مكان واحد) ─────────
  setPerfMode(mode: PerfMode, opts: { persist?: boolean } = {}) {
    this.perfMode = mode;
    this._applyPerf(mode);
    if (opts.persist !== false) localStorage.setItem(LS_PERF, mode);
    this._notify();
  }

  setWorkflowMode(mode: WorkflowMode, opts: { persist?: boolean } = {}) {
    this.wflow = mode;
    this._applyWorkflow(mode);
    if (opts.persist !== false) localStorage.setItem(LS_WFLOW, mode);
    this._notify();
  }

  // ── تطبيق PerfMode ──────────────────────────────────────────────────────────
  private _applyPerf(mode: PerfMode) {
    const p = PERF_PROFILES[mode];

    // 1. Animation
    animationController.setLevel(p.animLevel, true);

    // 2. FPS
    if      (p.fpsTarget === "max")  adaptiveFPS.forceMaxHz();
    else if (p.fpsTarget === "low")  adaptiveFPS.forceLowPower();
    else                             adaptiveFPS.releaseOverride();

    // 3. Network concurrency
    requestPrioritizer.setMaxConcurrent(p.maxConcurrent);

    // 4. Frame budget
    frameScheduler.setFrameBudgetMs(p.frameBudgetMs);

    // 5. GC دوري
    if (this.gcTimer) clearInterval(this.gcTimer);
    this.gcTimer = setInterval(() => {
      idleQueue.add(`op-engine-gc-${mode}`, () => {
        if (p.memPressureTarget === "aggressive") {
          const heapMB = (performance as any).memory?.usedJSHeapSize;
          eventBus.emit("perf:memory-pressure", {
            level: "moderate",
            heapMB: typeof heapMB === "number" ? heapMB / 1048576 : 0,
          });
        }
      });
    }, p.gcIntervalMs);

    // 6. CSS variables — components تقرأها لضبط نفسها
    const root = document.documentElement;
    root.setAttribute("data-perf", mode);
    root.style.setProperty("--op-anim-level",    String(p.animLevel));
    root.style.setProperty("--op-particles",     p.particles ? "1" : "0");
    root.style.setProperty("--op-webgl",         p.webgl     ? "1" : "0");
    root.style.setProperty("--op-blur",          p.blur      ? "blur(12px)" : "none");
    root.style.setProperty("--op-frame-budget",  String(p.frameBudgetMs));
    root.style.setProperty("--op-render-ms",     String(p.renderThrottle));

    // 7. AI params — chat-client.ts يقرأها
    localStorage.setItem("mr7-ai-temperature",    String(p.aiTemperature));
    localStorage.setItem("mr7-ai-max-tokens",     String(p.aiMaxTokens));
    localStorage.setItem("mr7-ai-stream-chunk-ms", String(p.aiStreamChunkMs));

    // 8. Cancel low-priority requests عند التحويل
    if (mode === "low") {
      requestPrioritizer.cancelBelow("normal");
    }

    // 9. Disable heavy features في LOW mode
    if (!p.heavyModals) {
      root.style.setProperty("--op-heavy-modals", "0");
    } else {
      root.style.setProperty("--op-heavy-modals", "1");
    }

    console.log(`[OpEngine] PerfMode=${mode} | anim=${p.animLevel} fps=${p.fpsTarget} concurrent=${p.maxConcurrent} budget=${p.frameBudgetMs}ms`);
  }

  // ── تطبيق WorkflowMode ──────────────────────────────────────────────────────
  private _applyWorkflow(mode: WorkflowMode) {
    // حفظ system prompt — chat-client يقرأه
    localStorage.setItem(LS_SYS, WORKFLOW_PROMPTS[mode]);

    // CSS + data attribute
    document.documentElement.setAttribute("data-workflow", mode.toLowerCase());
    document.documentElement.style.setProperty("--op-workflow", `"${mode.toLowerCase()}"`);

    console.log(`[OpEngine] WorkflowMode=${mode}`);
  }

  private _notify() {
    this.listeners.forEach(fn => fn(this.perfMode, this.wflow));
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  get currentPerf()         { return this.perfMode; }
  get currentWorkflow()     { return this.wflow; }
  get currentSystemPrompt() { return WORKFLOW_PROMPTS[this.wflow]; }
  get currentProfile()      { return PERF_PROFILES[this.perfMode]; }

  onChange(fn: (p: PerfMode, w: WorkflowMode) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const operationModeEngine = new OperationModeEngine();
