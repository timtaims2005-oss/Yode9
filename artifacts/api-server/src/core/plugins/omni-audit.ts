import type {
  AgenticPlugin,
  PluginContext,
  PluginFinding,
  PluginResult,
  PluginTelemetry,
} from "../agentic/types";

interface AttackVector {
  readonly id: string;
  readonly category: string;
  readonly surface: string;
  readonly cvssBase: number;
  readonly cweId: string;
  readonly description: string;
  readonly remediationHint: string;
}

interface AuditSurface {
  readonly name: string;
  readonly vectors: readonly AttackVector[];
  readonly riskScore: number;
}

const ATTACK_SURFACES: readonly AuditSurface[] = [
  {
    name: "Authentication & Session Management",
    riskScore: 8.2,
    vectors: [
      {
        id: "auth-brute-force",
        category: "A07:2021",
        surface: "login-endpoint",
        cvssBase: 7.5,
        cweId: "CWE-307",
        description: "Absence of account lockout or rate-limiting on authentication endpoints allows credential stuffing.",
        remediationHint: "Implement exponential backoff, CAPTCHA after N failures, and distributed rate-limiting.",
      },
      {
        id: "auth-session-fixation",
        category: "A07:2021",
        surface: "session-management",
        cvssBase: 6.8,
        cweId: "CWE-384",
        description: "Session identifiers may not be regenerated after privilege escalation events.",
        remediationHint: "Rotate session tokens on login, privilege change, and logout. Use SameSite=Strict cookies.",
      },
    ],
  },
  {
    name: "Injection & Input Validation",
    riskScore: 9.1,
    vectors: [
      {
        id: "injection-sqli",
        category: "A03:2021",
        surface: "database-queries",
        cvssBase: 9.8,
        cweId: "CWE-89",
        description: "Unparameterized SQL fragments in dynamic query construction expose the database to injection.",
        remediationHint: "Use parameterized queries exclusively. Apply an ORM with strict typing. Never concatenate user input into SQL.",
      },
      {
        id: "injection-nosql",
        category: "A03:2021",
        surface: "nosql-queries",
        cvssBase: 8.1,
        cweId: "CWE-943",
        description: "MongoDB/document-store operators ($where, $regex) in deserialized user input allow operator injection.",
        remediationHint: "Sanitize and validate document-store operators. Use allow-lists for field names.",
      },
    ],
  },
  {
    name: "API Security & Exposure",
    riskScore: 7.6,
    vectors: [
      {
        id: "api-bola",
        category: "A01:2021",
        surface: "rest-api-resources",
        cvssBase: 8.6,
        cweId: "CWE-639",
        description: "Broken Object Level Authorization (BOLA/IDOR): resource IDs in API paths not verified against authenticated principal.",
        remediationHint: "Enforce server-side ownership checks on every resource access. Never trust client-supplied IDs alone.",
      },
      {
        id: "api-mass-assignment",
        category: "A03:2021",
        surface: "json-deserialization",
        cvssBase: 6.5,
        cweId: "CWE-915",
        description: "Mass assignment via JSON body may overwrite privileged fields (isAdmin, role, credits).",
        remediationHint: "Use schema validation (Zod/Yup) with explicit allow-lists. Never blindly spread request body into ORM models.",
      },
    ],
  },
  {
    name: "Cryptographic Failures",
    riskScore: 7.9,
    vectors: [
      {
        id: "crypto-weak-hash",
        category: "A02:2021",
        surface: "password-storage",
        cvssBase: 7.4,
        cweId: "CWE-916",
        description: "Password hashing with MD5, SHA-1, or unsalted SHA-256 allows rapid offline cracking.",
        remediationHint: "Use bcrypt (cost ≥12), scrypt, or argon2id for password hashing. Never use reversible encryption for credentials.",
      },
      {
        id: "crypto-tls",
        category: "A02:2021",
        surface: "transport-security",
        cvssBase: 5.9,
        cweId: "CWE-326",
        description: "TLS 1.0/1.1 or weak cipher suites (RC4, DES, 3DES) may be negotiable in legacy configurations.",
        remediationHint: "Enforce TLS 1.2+ minimum. Configure explicit cipher suite allow-lists. Use HSTS with long max-age.",
      },
    ],
  },
  {
    name: "Security Misconfiguration",
    riskScore: 7.2,
    vectors: [
      {
        id: "misc-cors",
        category: "A05:2021",
        surface: "cors-policy",
        cvssBase: 6.1,
        cweId: "CWE-346",
        description: "Wildcard or overly permissive CORS policy (`Access-Control-Allow-Origin: *`) exposes authenticated endpoints.",
        remediationHint: "Define an explicit origin allow-list. Never combine `credentials: include` with wildcard CORS.",
      },
      {
        id: "misc-debug-exposure",
        category: "A05:2021",
        surface: "debug-endpoints",
        cvssBase: 5.3,
        cweId: "CWE-215",
        description: "Debug routes, stack traces, or verbose error messages exposed in production responses.",
        remediationHint: "Gate all debug endpoints on NODE_ENV. Return opaque error IDs to clients; log full traces server-side only.",
      },
    ],
  },
];

function scoreOverallRisk(surfaces: readonly AuditSurface[]): number {
  const max = surfaces.reduce((m, s) => Math.max(m, s.riskScore), 0);
  const avg = surfaces.reduce((sum, s) => sum + s.riskScore, 0) / surfaces.length;
  return parseFloat(((max * 0.6 + avg * 0.4)).toFixed(1));
}

function filterByIntent(intent: string): readonly AuditSurface[] {
  const intentLower = intent.toLowerCase();
  const isNetworkFocused = /network|api|rest|http/.test(intentLower);
  const isAuthFocused = /auth|login|session|credential/.test(intentLower);
  const isCryptoFocused = /crypto|encrypt|tls|cert|hash/.test(intentLower);

  if (!isNetworkFocused && !isAuthFocused && !isCryptoFocused) {
    return ATTACK_SURFACES; // full audit
  }

  return ATTACK_SURFACES.filter((s) => {
    if (isAuthFocused && /auth|session/i.test(s.name)) return true;
    if (isNetworkFocused && /api|injection/i.test(s.name)) return true;
    if (isCryptoFocused && /crypto/i.test(s.name)) return true;
    return false;
  });
}

export class OmniAuditPlugin implements AgenticPlugin {
  readonly name = "OmniAuditPlugin";

  async run(context: PluginContext): Promise<PluginResult> {
    const startedAt = Date.now();
    const { request } = context;

    const surfaces = filterByIntent(request.intent);
    const overallRisk = scoreOverallRisk(surfaces);
    const allVectors = surfaces.flatMap((s) => s.vectors);
    const highSeverity = allVectors.filter((v) => v.cvssBase >= 8.0);
    const mediumSeverity = allVectors.filter((v) => v.cvssBase >= 5.0 && v.cvssBase < 8.0);

    const findings: PluginFinding[] = [
      {
        id: "omni-risk-summary",
        severity: overallRisk >= 8 ? "high" : overallRisk >= 6 ? "medium" : "low",
        title: `Attack Surface Risk Assessment — Score ${overallRisk}/10`,
        description:
          `Continuous audit across ${surfaces.length} attack surfaces identified ` +
          `${allVectors.length} vectors (${highSeverity.length} high, ${mediumSeverity.length} medium). ` +
          `OWASP Top 10 2021 mapping applied throughout.`,
        evidence: surfaces.map((s) => `surface:${s.name}:risk=${s.riskScore}`),
        remediation: "Prioritize high-CVSS vectors. Establish a patch SLA: Critical ≤24h, High ≤7 days, Medium ≤30 days.",
      },
      ...allVectors.map((v) => ({
        id: v.id,
        severity: v.cvssBase >= 8.0 ? ("high" as const) : v.cvssBase >= 5.0 ? ("medium" as const) : ("low" as const),
        title: `[${v.cweId}] ${v.description.slice(0, 60)}…`,
        description: v.description,
        evidence: [
          `owasp-category:${v.category}`,
          `cvss-base:${v.cvssBase}`,
          `surface:${v.surface}`,
          `scope:${request.authorizedScope.id}`,
        ],
        remediation: v.remediationHint,
      } satisfies PluginFinding)),
    ];

    const telemetry: PluginTelemetry = {
      plugin: this.name,
      durationMs: Math.max(0, Date.now() - startedAt),
      mode: request.mode,
      actionsConsidered: [
        "attack-surface-enumeration",
        "owasp-top10-mapping",
        "cvss-scoring",
        "cwe-classification",
        "remediation-planning",
      ],
      actionsBlocked: [
        "exploit-delivery",
        "active-scan",
        "network-probing",
        "credential-attack",
        "destructive-payload",
      ],
    };

    return {
      plugin: this.name,
      status: "simulated",
      findings,
      telemetry,
      blockedActions: telemetry.actionsBlocked,
      explanation:
        `OmniAudit performed a continuous defensive audit across ${surfaces.length} attack surfaces, ` +
        `mapping ${allVectors.length} vectors to OWASP Top 10 2021 categories and CWE identifiers. ` +
        `Overall risk score: ${overallRisk}/10. All analysis is advisory; no active probing performed.`,
    };
  }
}

export default OmniAuditPlugin;
