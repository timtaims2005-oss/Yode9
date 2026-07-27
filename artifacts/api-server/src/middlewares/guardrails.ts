import { type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { checkGuardrail } from "../lib/guardrails.js";

/**
 * Strict rate limit dedicated to sensitive tools/routes — separate from and
 * tighter than the general per-route limiters, to prevent bulk automated abuse.
 */
export const sensitiveToolLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Sensitive-tool rate limit — max 20 requests/min." },
});

/**
 * Express middleware that runs the guardrail classifier/heuristics before a
 * sensitive OSINT/dark-web route executes. Rejects with 403 if the request
 * looks like an unauthorized attack against a real third party.
 *
 * `toolNameFn` lets each mount point label itself (e.g. "osint:/ip/:ip").
 */
export function guardrailsMiddleware(toolNameLabel: string) {
  return async function guardrailsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const args = { ...req.params, ...req.query, ...(typeof req.body === "object" ? req.body : {}) };
      const declaredScope =
        (req.headers["x-scope-declaration"] as string) || (req.body && (req.body as any).scopeDeclaration) || "";
      const userContext =
        (req.body && ((req.body as any).notes || (req.body as any).context || (req.body as any).reason)) || undefined;

      const decision = await checkGuardrail({
        toolName: `${toolNameLabel}:${req.method} ${req.path}`,
        args,
        userContext,
        declaredScope,
        actorId: (req as any).user?.id || (req as any).deviceId,
        actorIp: req.ip,
      });

      if (!decision.allowed) {
        res.status(403).json({
          success: false,
          error:
            "تم رفض هذا الطلب: يبدو أنه يستهدف نظاماً حقيقياً تابعاً لطرف ثالث دون إذن أو ملكية معلنة. " +
            "هذه الأداة مخصصة للاستخدام التعليمي/الدفاعي أو على أنظمة تملكها أو مصرَّح لك باختبارها (بيئات معملية/lab). " +
            "إن كانت هذه بيئتك الخاصة، أضف تصريحاً صريحاً (header: X-Scope-Declaration: own|lab|authorized).",
          classification: decision.classification,
        });
        return;
      }

      next();
    } catch (err) {
      // Fail open on infrastructure errors so a guardrail bug never becomes a total outage,
      // but never on an actual "denied" classification (handled above).
      console.error("[guardrails] middleware error, allowing request:", (err as Error).message);
      next();
    }
  };
}
