import type {
  AgenticPlugin,
  PluginContext,
  PluginFinding,
  PluginResult,
  PluginTelemetry,
} from "../agentic/types";

interface ServiceProfile {
  readonly port: number;
  readonly protocol: "tcp" | "udp";
  readonly service: string;
  readonly version?: string;
  readonly riskLevel: "critical" | "high" | "medium" | "low";
  readonly exposureNote: string;
  readonly hardeningAction: string;
}

interface SubnetZone {
  readonly cidr: string;
  readonly zone: "public" | "internal" | "dmz" | "restricted";
  readonly riskNote: string;
  readonly segregationRecommendation: string;
}

interface TopologyVector {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly cvssBase: number;
  readonly cweId: string;
  readonly remediation: string;
}

// Common high-risk service profiles encountered in enterprise and cloud environments
const HIGH_RISK_SERVICES: readonly ServiceProfile[] = [
  {
    port: 22,
    protocol: "tcp",
    service: "SSH",
    riskLevel: "medium",
    exposureNote: "SSH exposed to internet without IP restriction enables brute-force and credential stuffing.",
    hardeningAction: "Restrict to VPN/bastion IP ranges. Enforce key-based auth. Disable root login. Apply fail2ban.",
  },
  {
    port: 23,
    protocol: "tcp",
    service: "Telnet",
    riskLevel: "critical",
    exposureNote: "Telnet transmits credentials and data in cleartext. No authentication encryption.",
    hardeningAction: "Disable Telnet entirely. Replace with SSH. Block port at perimeter firewall.",
  },
  {
    port: 445,
    protocol: "tcp",
    service: "SMB/CIFS",
    version: "SMBv1",
    riskLevel: "critical",
    exposureNote: "SMBv1 has known critical RCE exploits (EternalBlue/MS17-010). Internet-exposed SMB is a primary ransomware vector.",
    hardeningAction: "Disable SMBv1. Block port 445 at perimeter. Enable Windows Firewall SMB rules. Patch to latest SMB dialect.",
  },
  {
    port: 3389,
    protocol: "tcp",
    service: "RDP",
    riskLevel: "critical",
    exposureNote: "Internet-exposed RDP is the #1 initial access vector for ransomware groups. BlueKeep (CVE-2019-0708) affects unpatched systems.",
    hardeningAction: "Move RDP behind VPN. Enable NLA. Apply all security patches. Monitor for anomalous authentication.",
  },
  {
    port: 1433,
    protocol: "tcp",
    service: "MSSQL",
    riskLevel: "high",
    exposureNote: "Database port exposed to the internet allows direct credential attacks and SQL Slammer-class exploits.",
    hardeningAction: "Restrict to application-tier IP ranges only. Never expose to internet. Use encrypted connections (TLS).",
  },
  {
    port: 3306,
    protocol: "tcp",
    service: "MySQL/MariaDB",
    riskLevel: "high",
    exposureNote: "Direct MySQL exposure enables credential stuffing, CVE scanning, and exfiltration without application-layer controls.",
    hardeningAction: "Bind to localhost or private subnet only. Use TLS for client connections. Restrict user source IPs in grants.",
  },
  {
    port: 6379,
    protocol: "tcp",
    service: "Redis",
    riskLevel: "critical",
    exposureNote: "Unauthenticated Redis (default config) allows arbitrary command execution, config file write, and SSH key injection via SLAVEOF.",
    hardeningAction: "Enable `requirepass`. Bind to 127.0.0.1. Disable dangerous commands (FLUSHALL, CONFIG, SLAVEOF) via `rename-command`.",
  },
  {
    port: 9200,
    protocol: "tcp",
    service: "Elasticsearch",
    riskLevel: "high",
    exposureNote: "Open Elasticsearch without X-Pack security allows unauthenticated read of all indices — responsible for many public data breaches.",
    hardeningAction: "Enable X-Pack security. Require TLS client authentication. Block port from public internet.",
  },
  {
    port: 5432,
    protocol: "tcp",
    service: "PostgreSQL",
    riskLevel: "high",
    exposureNote: "Public PostgreSQL exposure enables pg_hba misconfiguration exploitation and credential brute-force.",
    hardeningAction: "Restrict `pg_hba.conf` to known CIDRs. Use scram-sha-256 authentication. Enforce SSL mode `require`.",
  },
  {
    port: 8080,
    protocol: "tcp",
    service: "HTTP (alt)",
    riskLevel: "medium",
    exposureNote: "Alternate HTTP port often used for dev/admin panels or APIs without TLS — subject to interception and unintended exposure.",
    hardeningAction: "Redirect to HTTPS. Ensure no admin panels are accessible. Inventory all non-standard HTTP listeners.",
  },
];

const SUBNET_ZONES: readonly SubnetZone[] = [
  {
    cidr: "10.0.0.0/8",
    zone: "internal",
    riskNote: "RFC1918 internal range — standard for corporate LAN. Verify no direct internet routing leaks.",
    segregationRecommendation: "Implement micro-segmentation. Enforce VLAN separation between workstations, servers, and OT.",
  },
  {
    cidr: "172.16.0.0/12",
    zone: "internal",
    riskNote: "RFC1918 internal range often used for container/pod networking (Kubernetes, Docker).",
    segregationRecommendation: "Apply NetworkPolicies in Kubernetes. Ensure pod-to-pod traffic is encrypted (mTLS via service mesh).",
  },
  {
    cidr: "192.168.0.0/16",
    zone: "internal",
    riskNote: "RFC1918 — common home/small-office range. Often misconfigured in cloud VPC subnets.",
    segregationRecommendation: "Audit VPC route tables for unexpected 192.168/16 peering. Validate security group inbound rules.",
  },
  {
    cidr: "0.0.0.0/0",
    zone: "public",
    riskNote: "Public internet exposure. Any service reachable from this route is accessible globally.",
    segregationRecommendation: "Apply zero-trust perimeter. Expose only load balancers/CDN edge. All internal services behind private subnets.",
  },
];

const TOPOLOGY_VECTORS: readonly TopologyVector[] = [
  {
    id: "topology-flat-network",
    label: "Flat Network Topology",
    description:
      "A flat (unsegmented) network allows lateral movement after initial compromise. Once an attacker gains access to one host, " +
      "all other assets are reachable without additional privilege escalation.",
    cvssBase: 8.2,
    cweId: "CWE-1269",
    remediation:
      "Implement network micro-segmentation with VLAN or SDN-based zones. Apply deny-by-default inter-zone firewall rules.",
  },
  {
    id: "topology-unencrypted-internal",
    label: "Unencrypted East-West Traffic",
    description:
      "Internal service-to-service communication without TLS allows passive interception by any host on the same VLAN/subnet.",
    cvssBase: 6.8,
    cweId: "CWE-319",
    remediation:
      "Deploy a service mesh (Istio, Linkerd) for mTLS enforcement. At minimum, TLS-encrypt all database and API connections.",
  },
  {
    id: "topology-no-egress-filter",
    label: "Unrestricted Egress Traffic",
    description:
      "Servers with unrestricted outbound internet access allow C2 beaconing, data exfiltration, and supply-chain callback after compromise.",
    cvssBase: 7.1,
    cweId: "CWE-923",
    remediation:
      "Implement egress filtering via NAT gateway with domain allow-lists. Log all DNS and HTTPS egress. Alert on anomalous destinations.",
  },
  {
    id: "topology-dns-rebind",
    label: "DNS Rebinding Attack Surface",
    description:
      "Internal services accessible via browser without Host header validation are vulnerable to DNS rebinding, " +
      "allowing attacker-controlled JavaScript to query internal APIs.",
    cvssBase: 5.8,
    cweId: "CWE-350",
    remediation:
      "Validate Host headers on all internal HTTP services. Implement CORS and CSRF protections. Use DNS rebinding protection in resolvers.",
  },
];

export class NetworkScannerPlugin implements AgenticPlugin {
  readonly name = "NetworkScannerPlugin";

  async run(context: PluginContext): Promise<PluginResult> {
    const startedAt = Date.now();
    const { request } = context;

    const intentLower = request.intent.toLowerCase();
    const focusOnHighRisk = /critical|high|urgent|immediate/.test(intentLower);

    const servicesToReport = focusOnHighRisk
      ? HIGH_RISK_SERVICES.filter((s) => s.riskLevel === "critical" || s.riskLevel === "high")
      : HIGH_RISK_SERVICES;

    const criticalServices = servicesToReport.filter((s) => s.riskLevel === "critical");
    const highServices = servicesToReport.filter((s) => s.riskLevel === "high");

    const findings: PluginFinding[] = [
      {
        id: "network-asset-inventory",
        severity: "info",
        title: `Network Asset Inventory Plan — ${servicesToReport.length} Service Profiles`,
        description:
          `Passive inventory strategy defined for ${servicesToReport.length} common service exposure vectors ` +
          `(${criticalServices.length} critical, ${highServices.length} high risk). ` +
          `Topology analysis covers ${SUBNET_ZONES.length} subnet zones and ${TOPOLOGY_VECTORS.length} structural risk patterns.`,
        evidence: [
          `total-services-profiled:${servicesToReport.length}`,
          `subnet-zones:${SUBNET_ZONES.length}`,
          `topology-vectors:${TOPOLOGY_VECTORS.length}`,
          `scope:${request.authorizedScope.id}`,
        ],
        remediation:
          "Execute a passive asset discovery sweep using authenticated network scanning (Nmap -sV with credentials) from an authorized scanner node.",
      },
      ...criticalServices.map((s) => ({
        id: `network-service-${s.port}`,
        severity: "high" as const,
        title: `Critical Exposure Risk: ${s.service} (port ${s.port}/${s.protocol})`,
        description: s.exposureNote,
        evidence: [
          `port:${s.port}`,
          `protocol:${s.protocol}`,
          `service:${s.service}`,
          ...(s.version !== undefined ? [`version:${s.version}`] : []),
          `risk:${s.riskLevel}`,
        ],
        remediation: s.hardeningAction,
      } satisfies PluginFinding)),
      ...highServices.map((s) => ({
        id: `network-service-${s.port}`,
        severity: "medium" as const,
        title: `High-Risk Service Exposure: ${s.service} (port ${s.port}/${s.protocol})`,
        description: s.exposureNote,
        evidence: [
          `port:${s.port}`,
          `protocol:${s.protocol}`,
          `service:${s.service}`,
          `risk:${s.riskLevel}`,
        ],
        remediation: s.hardeningAction,
      } satisfies PluginFinding)),
      ...TOPOLOGY_VECTORS.map((v) => ({
        id: v.id,
        severity: v.cvssBase >= 8.0 ? ("high" as const) : ("medium" as const),
        title: `Network Topology Risk: ${v.label}`,
        description: v.description,
        evidence: [
          `cvss-base:${v.cvssBase}`,
          `cwe:${v.cweId}`,
          `mode:${request.mode}`,
        ],
        remediation: v.remediation,
      } satisfies PluginFinding)),
      {
        id: "network-subnet-segmentation",
        severity: "medium",
        title: "Subnet Zone Segmentation Assessment",
        description:
          `RFC1918 and public subnet zone analysis covers ${SUBNET_ZONES.length} CIDR ranges. ` +
          "Flat network topology and unrestricted inter-zone routing are primary post-exploitation lateral-movement enablers.",
        evidence: SUBNET_ZONES.map((z) => `zone:${z.zone}:cidr=${z.cidr}`),
        remediation:
          "Apply micro-segmentation with deny-by-default inter-zone ACLs. Document all zone-crossing flows and apply least-privilege egress.",
      },
    ];

    const telemetry: PluginTelemetry = {
      plugin: this.name,
      durationMs: Math.max(0, Date.now() - startedAt),
      mode: request.mode,
      actionsConsidered: [
        "service-fingerprinting-plan",
        "subnet-topology-mapping",
        "port-risk-classification",
        "lateral-movement-surface-analysis",
        "egress-filter-assessment",
      ],
      actionsBlocked: [
        "active-port-scan",
        "network-probing",
        "service-banner-grabbing",
        "ping-sweep",
        "exploit-delivery",
      ],
    };

    return {
      plugin: this.name,
      status: "simulated",
      findings,
      telemetry,
      blockedActions: telemetry.actionsBlocked,
      explanation:
        `NetworkScanner produced a passive asset inventory plan covering ${servicesToReport.length} service profiles, ` +
        `${SUBNET_ZONES.length} subnet zones, and ${TOPOLOGY_VECTORS.length} topology risk vectors. ` +
        `${criticalServices.length} critical-risk services identified. No active scanning or probing performed.`,
    };
  }
}

export default NetworkScannerPlugin;
