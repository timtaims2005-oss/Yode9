import type { AgenticRequest, AuthorizedScope, SafetyDecision } from "./types";

const FORBIDDEN_ACTIONS = new Set([
  "exploit-delivery",
  "credential-attack",
  "arbitrary-shell",
  "destructive-payload",
  "network-probing",
  "active-scan",
  "brute-force",
]);

export function validateAuthorizedScope(scope: AuthorizedScope | undefined): SafetyDecision {
  if (scope === undefined || scope.id.trim() === "") {
    return { allowed: false, reason: "An explicit authorized scope is required." };
  }
  if (scope.actions.length === 0) {
    return { allowed: false, reason: "Authorized scope must name at least one action." };
  }
  if (scope.expiresAt !== undefined && scope.expiresAt <= Date.now()) {
    return { allowed: false, reason: "Authorized scope has expired." };
  }
  return { allowed: true, reason: "Authorized scope accepted." };
}

export function assessRequestSafety(request: AgenticRequest): SafetyDecision {
  const scope = validateAuthorizedScope(request.authorizedScope);
  if (!scope.allowed) return scope;
  if (request.mode !== "dry-run" && request.mode !== "simulation") {
    return { allowed: false, reason: "Only dry-run or simulation mode is supported." };
  }
  const forbidden = request.authorizedScope.actions.filter((action) =>
    FORBIDDEN_ACTIONS.has(action.toLowerCase()),
  );
  if (forbidden.length > 0) {
    return {
      allowed: false,
      reason: `Forbidden active actions requested: ${forbidden.join(", ")}.`,
    };
  }
  return { allowed: true, reason: "Request is safe for simulation." };
}

export function blockedActionsForScope(scope: AuthorizedScope): readonly string[] {
  return [...FORBIDDEN_ACTIONS].filter((action) => scope.actions.includes(action));
}
