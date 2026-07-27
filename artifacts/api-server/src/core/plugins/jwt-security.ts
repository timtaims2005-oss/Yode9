import type {
  AgenticPlugin,
  PluginContext,
  PluginFinding,
  PluginResult,
  PluginTelemetry,
} from "../agentic/types";

// JWT header/payload structures (analysis-only, no actual token processing)
interface JwtAlgorithmAnalysis {
  readonly algorithm: string;
  readonly category: "symmetric" | "asymmetric" | "none" | "unknown";
  readonly risk: "critical" | "high" | "medium" | "low";
  readonly description: string;
  readonly cweId: string;
  readonly cvssBase: number;
}

interface JwtClaimAnalysis {
  readonly claim: string;
  readonly required: boolean;
  readonly secure: boolean;
  readonly issue?: string;
  readonly recommendation: string;
}

interface SignatureForgeVector {
  readonly technique: string;
  readonly description: string;
  readonly cvssBase: number;
  readonly mitigationControl: string;
}

const ALGORITHM_RISKS: readonly JwtAlgorithmAnalysis[] = [
  {
    algorithm: "none",
    category: "none",
    risk: "critical",
    description: 'JWT algorithm "none" bypasses signature verification entirely, allowing forged tokens.',
    cweId: "CWE-347",
    cvssBase: 9.8,
  },
  {
    algorithm: "HS256",
    category: "symmetric",
    risk: "medium",
    description: "HMAC-SHA256 uses a shared secret — compromise of the secret allows arbitrary token forgery.",
    cweId: "CWE-321",
    cvssBase: 6.5,
  },
  {
    algorithm: "HS384",
    category: "symmetric",
    risk: "medium",
    description: "HMAC-SHA384 — same shared-secret risk as HS256 with slightly larger digest.",
    cweId: "CWE-321",
    cvssBase: 6.3,
  },
  {
    algorithm: "HS512",
    category: "symmetric",
    risk: "medium",
    description: "HMAC-SHA512 — symmetric key risk remains; key rotation is critical.",
    cweId: "CWE-321",
    cvssBase: 6.1,
  },
  {
    algorithm: "RS256",
    category: "asymmetric",
    risk: "low",
    description: "RSA-SHA256 with asymmetric key pair. Risk is in key management and `alg` header confusion attacks.",
    cweId: "CWE-295",
    cvssBase: 3.7,
  },
  {
    algorithm: "RS384",
    category: "asymmetric",
    risk: "low",
    description: "RSA-SHA384 asymmetric — monitor for `alg` switching attacks (RS→HS confusion).",
    cweId: "CWE-295",
    cvssBase: 3.5,
  },
  {
    algorithm: "ES256",
    category: "asymmetric",
    risk: "low",
    description: "ECDSA P-256 — strong curve selection. Risk is in nonce reuse (ECDSA nonce=0 is catastrophic).",
    cweId: "CWE-338",
    cvssBase: 3.2,
  },
  {
    algorithm: "PS256",
    category: "asymmetric",
    risk: "low",
    description: "RSA-PSS SHA-256 — recommended asymmetric algorithm. Probabilistic padding reduces oracle risks.",
    cweId: "CWE-295",
    cvssBase: 2.1,
  },
];

const CLAIM_SECURITY_RULES: readonly JwtClaimAnalysis[] = [
  {
    claim: "iss (Issuer)",
    required: true,
    secure: false,
    issue: "Missing issuer claim allows token reuse across services (token audience confusion).",
    recommendation: "Always include `iss` and validate it strictly against an allow-list on the server side.",
  },
  {
    claim: "exp (Expiration)",
    required: true,
    secure: false,
    issue: "Tokens without `exp` are permanently valid — a stolen token can be used indefinitely.",
    recommendation: "Set short-lived `exp` (15–60 min for access tokens). Implement refresh token rotation.",
  },
  {
    claim: "aud (Audience)",
    required: true,
    secure: false,
    issue: "Missing `aud` permits cross-service token substitution attacks.",
    recommendation: "Set `aud` to the specific service identifier and validate on every request.",
  },
  {
    claim: "nbf (Not Before)",
    required: false,
    secure: false,
    issue: "Without `nbf`, tokens can be replayed before their intended activation window.",
    recommendation: "Include `nbf` for tokens generated before their valid period begins.",
  },
  {
    claim: "jti (JWT ID)",
    required: false,
    secure: false,
    issue: "Without `jti`, replay attacks cannot be detected — there is no per-token revocation anchor.",
    recommendation: "Include `jti` and maintain a short-lived server-side revocation list for sensitive operations.",
  },
];

const FORGE_VECTORS: readonly SignatureForgeVector[] = [
  {
    technique: "Algorithm Stripping (alg:none)",
    description:
      'Attacker crafts a JWT with `"alg":"none"` and removes the signature. Libraries that do not enforce ' +
      "expected algorithm may accept the forged token as valid.",
    cvssBase: 9.8,
    mitigationControl: "Always specify the exact expected algorithm in the verification call. Never pass `algorithms: [\"none\"]`.",
  },
  {
    technique: "RS→HS Algorithm Confusion",
    description:
      "Server configured for RS256 is tricked into verifying with HS256 using the public key as the HMAC secret. " +
      "If the public key is known, any token can be forged.",
    cvssBase: 8.8,
    mitigationControl:
      "Pin the expected algorithm server-side. Never derive the algorithm from the token header alone.",
  },
  {
    technique: "Weak Secret Brute-Force",
    description:
      "Short or dictionary-based HMAC secrets (<32 bytes, common words) can be brute-forced offline against " +
      "a captured token using hashcat or jwt-cracker in seconds to minutes.",
    cvssBase: 7.5,
    mitigationControl:
      "Use cryptographically random secrets of ≥256 bits. Rotate on suspected compromise. Consider RS256 for services with many clients.",
  },
  {
    technique: "Kid Parameter Injection",
    description:
      "If the `kid` (Key ID) header is used to look up a key from a database or filesystem without sanitization, " +
      "SQL injection or path traversal via the `kid` value may allow arbitrary key substitution.",
    cvssBase: 8.1,
    mitigationControl:
      "Validate `kid` against a strict UUID/slug allow-list before any database or file lookup.",
  },
  {
    technique: "Expired Token Replay",
    description:
      "Tokens passed to services that do not enforce `exp` or use lenient grace windows can be replayed " +
      "indefinitely after expiration.",
    cvssBase: 6.5,
    mitigationControl:
      "Reject tokens with `exp` in the past (max clock skew: 30 seconds). Use short TTLs and active revocation for sensitive scopes.",
  },
];

export class JWTSecurityPlugin implements AgenticPlugin {
  readonly name = "JWTSecurityPlugin";

  async run(context: PluginContext): Promise<PluginResult> {
    const startedAt = Date.now();
    const { request } = context;

    const criticalAlgos = ALGORITHM_RISKS.filter((a) => a.risk === "critical" || a.risk === "high");
    const highForgeVectors = FORGE_VECTORS.filter((v) => v.cvssBase >= 8.0);

    const findings: PluginFinding[] = [
      {
        id: "jwt-algorithm-exposure",
        severity: "high",
        title: "JWT Algorithm Configuration Risk Analysis",
        description:
          `Analyzed ${ALGORITHM_RISKS.length} JWT algorithm variants. ` +
          `${criticalAlgos.length} carry critical/high risk: ` +
          criticalAlgos.map((a) => a.algorithm).join(", ") +
          `. Symmetric algorithms (HS*) create single-point-of-compromise on the shared secret.`,
        evidence: ALGORITHM_RISKS.map((a) => `alg:${a.algorithm}:risk=${a.risk}:cvss=${a.cvssBase}:${a.cweId}`),
        remediation:
          "Migrate to RS256 or PS256 for multi-service architectures. Ban `alg:none` explicitly in verification configuration.",
      },
      {
        id: "jwt-claim-validation",
        severity: "medium",
        title: "JWT Standard Claim Validation Gaps",
        description:
          `${CLAIM_SECURITY_RULES.filter((c) => c.required).length} required claims (iss, exp, aud) must be ` +
          "present and server-validated to prevent token confusion, replay, and cross-service substitution attacks.",
        evidence: CLAIM_SECURITY_RULES.map((c) => `claim:${c.claim}:required=${c.required}`),
        remediation:
          "Implement strict server-side validation for all standard claims. Reject tokens missing required claims rather than applying defaults.",
      },
      ...highForgeVectors.map((v) => ({
        id: `jwt-forge-${v.technique.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}`,
        severity: v.cvssBase >= 9.0 ? ("high" as const) : ("medium" as const),
        title: `JWT Forge Vector: ${v.technique}`,
        description: v.description,
        evidence: [
          `technique:${v.technique}`,
          `cvss-base:${v.cvssBase}`,
          `scope:${request.authorizedScope.id}`,
          `mode:${request.mode}`,
        ],
        remediation: v.mitigationControl,
      } satisfies PluginFinding)),
      {
        id: "jwt-key-management",
        severity: "medium",
        title: "JWT Key Management & Rotation Policy",
        description:
          "Absent key rotation policy, cryptographic hygiene drift, or missing key revocation infrastructure " +
          "creates persistent exposure after secret/key compromise.",
        evidence: [
          "control:key-rotation-recommended",
          "control:jwks-endpoint-preferred",
          "control:jti-revocation-list-recommended",
        ],
        remediation:
          "Implement JWKS endpoint for asymmetric key distribution. Rotate HMAC secrets on schedule and on any suspected compromise. " +
          "Maintain a `jti` revocation cache (Redis TTL-keyed) for high-value operations.",
      },
    ];

    const telemetry: PluginTelemetry = {
      plugin: this.name,
      durationMs: Math.max(0, Date.now() - startedAt),
      mode: request.mode,
      actionsConsidered: [
        "algorithm-risk-analysis",
        "claim-validation-audit",
        "signature-forge-simulation",
        "key-management-assessment",
        "cryptographic-hygiene-review",
      ],
      actionsBlocked: [
        "token-forgery-attempt",
        "secret-brute-force",
        "active-token-replay",
        "key-extraction",
        "credential-attack",
      ],
    };

    return {
      plugin: this.name,
      status: "simulated",
      findings,
      telemetry,
      blockedActions: telemetry.actionsBlocked,
      explanation:
        `JWTSecurityPlugin analyzed ${ALGORITHM_RISKS.length} algorithm variants and ${FORGE_VECTORS.length} ` +
        `signature forge techniques. Identified ${highForgeVectors.length} high-risk forge vectors and ` +
        `${CLAIM_SECURITY_RULES.filter((c) => c.required).length} critical claim validation gaps. ` +
        "All analysis is advisory — no tokens were decoded, forged, or replayed.",
    };
  }
}

export default JWTSecurityPlugin;
