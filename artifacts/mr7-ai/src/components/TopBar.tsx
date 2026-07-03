import { useState } from "react";
import { motion } from "framer-motion";
import {
  Menu, PanelLeftClose, PanelLeftOpen, ChevronDown, Zap, Crown, HelpCircle,
  Wrench, Bot, Radar, Activity, HardDrive, Check, Search,
  UserCircle2, Users, Cpu, Sword, Network, Settings2, GitCompare, BarChart3,
  ShieldAlert, Globe2, Radio, ListChecks, Braces, Shuffle, Users2, GraduationCap,
  Dna, Gauge, DollarSign, Layers3, Rss, ShieldCheck, BrainCircuit, Zap as ZapIcon,
  AlertTriangle, Waypoints, LayoutGrid, Rows3, Newspaper, History, Map as MapIcon,
  Bug, Workflow, Skull, Target, GitBranch, Cog, HeartPulse, MonitorCog, WifiOff, Sparkles,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { useStore } from "../lib/store";
import { AI_MODELS } from "../lib/ai-config";
import HardwareDashboardModal from "./modals/HardwareDashboardModal";

export function TopBarHardwareButton({ onOpenHardware }: { onOpenHardware: () => void }) {
  return (
    <motion.button
      onClick={onOpenHardware}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide text-white"
      style={{
        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
        boxShadow: "0 0 12px rgba(59, 130, 246, 0.5)",
        border: "1px solid rgba(139, 92, 246, 0.5)",
      }}
      title="Hardware Control Center"
    >
      <HardDrive className="w-4 h-4" />
      <span className="hidden sm:inline">Hardware</span>
    </motion.button>
  );
}

type IconAction = { label: string; icon: any; onClick: () => void };

function ToolbarGroup({
  label,
  icon: Icon,
  items,
  activeColor = "#e21227",
}: {
  label: string;
  icon: any;
  items: IconAction[];
  activeColor?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={label}
        >
          <Icon className="w-4 h-4" style={{ color: activeColor }} />
          <span className="hidden lg:inline">{label}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-[70vh] overflow-y-auto bg-card border-border">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.label} onSelect={item.onClick}>
            <item.icon className="w-4 h-4" /> {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HudToggleButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: any;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="p-1.5 rounded-lg transition-colors hover:bg-accent"
      style={active ? { color: "#e21227", background: "rgba(226,18,39,0.12)" } : { color: "var(--muted-foreground)" }}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

export type TopBarProps = {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenPricing: () => void;
  onOpenToolsHub: () => void;
  onOpenHelp: () => void;
  onOpenPersonaEditor: () => void;
  onOpenPersonaManager: () => void;
  onOpenLocalModel: () => void;
  onOpenAgent: () => void;
  onOpenNexus: () => void;
  onOpenArsenal: () => void;
  onOpenPentestLab: () => void;
  onOpenProviderSettings: () => void;
  onOpenModelCompare: () => void;
  onOpenNeuralMatrix: () => void;
  onOpenAnalytics: () => void;
  onOpenWarRoom: () => void;
  onOpenDeepSearch: () => void;
  onOpenChainInvestigation: () => void;
  onOpenRedTeam: () => void;
  onOpenPerfDash: () => void;
  onOpenCostDash: () => void;
  onOpenDedupViz: () => void;
  onOpenThreatFeed: () => void;
  onOpenSecurityDash: () => void;
  onOpenContextMemory: () => void;
  onOpenPrefetch: () => void;
  onOpenMasterHud: () => void;
  onOpenAnomalyLog: () => void;
  hudsVisible: boolean;
  onOpenNetworkTopo: () => void;
  onOpenCyberHub: () => void;
  onOpenWidgetsDock: () => void;
  onOpenCisaLive: () => void;
  onOpenCveTimeline: () => void;
  onOpenThreatMap: () => void;
  onOpenCveTracker: () => void;
  onOpenLiveOps: () => void;
  onOpenCyberHierarchy: () => void;
  onOpenCognitiveWarfare: () => void;
  onOpenAutonomousOffense: () => void;
  onOpenAttackGraph: () => void;
  onOpenAutonomousDecisionEngine: () => void;
  onOpenJARVISCommandCenter: () => void;
  onOpenOmegaAgent: () => void;
  onOpenOllamaHub: () => void;
  onOpenMultiModelRace: () => void;
  onOpenLocalBenchmark: () => void;
  onOpenLocalAINexus: () => void;
  onOpenLocalEngineHub: () => void;
  onOpenBenchmark: () => void;
  onOpenDebate: () => void;
  onOpenChainOfThought: () => void;
  onOpenDynamicCouncil: () => void;
  onOpenCollab: () => void;
  onOpenFinetune: () => void;
  onOpenSwarmEvolution: () => void;
  onOpenPerfCC: () => void;
  onToggleSysHealth: () => void;
  onTogglePerfHud: () => void;
  onTogglePerfMon: () => void;
  onToggleGlobalStatus: () => void;
  onToggleOfflineQueue: () => void;
  onToggleCyberHeatmap: () => void;
  onToggleCyber3DGrid: () => void;
  onToggleQuantumCommand: () => void;
  onToggleAIQuickSetup: () => void;
  onToggleFloatingNetwork: () => void;
  onToggleQuantumMemGraph: () => void;
  onToggleQuantumPersona3D: () => void;
  onToggleQuantumStatusBar: () => void;
  onToggleWebGLParticles: () => void;
  onToggleSysMonitorOrb: () => void;
  onToggleIdleTrackerOrb: () => void;
  onToggleStreamTPS: () => void;
  onOpenRealTimeMonitor: () => void;
  onOpenBlockchainTracker: () => void;
  onOpenContextWindowPage: () => void;
  onOpenSecurityAuditPage: () => void;
  onOpenMonitoringPagePlain: () => void;
  onOpenSecurityCompliancePagePlain: () => void;
  // ── Restored modals (previously orphaned) ──────────────────────────────
  onOpenAdaV2: () => void;
  onOpenAgent4DesignCanvas: () => void;
  onOpenAgent4GitDashboard: () => void;
  onOpenAgent4Integrations: () => void;
  onOpenAgent4Slides: () => void;
  onOpenAgent4WebSearch: () => void;
  onOpenAgentFour: () => void;
  onOpenAgentSwarm: () => void;
  onOpenAgentV2: () => void;
  onOpenAiAtlas: () => void;
  onOpenAiInfra: () => void;
  onOpenAiSafety: () => void;
  onOpenAnomalyCS: () => void;
  onOpenArchEngine: () => void;
  onOpenAttackSurface: () => void;
  onOpenAutonomousOversight: () => void;
  onOpenAutonomousSOC: () => void;
  onOpenBehavioralDNA: () => void;
  onOpenBinaryCore: () => void;
  onOpenBuildYourOwnX: () => void;
  onOpenCausalReasoning: () => void;
  onOpenClaudeCode: () => void;
  onOpenClaudeSkills: () => void;
  onOpenCrossDomainRisk: () => void;
  onOpenCyberConsciousness: () => void;
  onOpenCyberEvolution: () => void;
  onOpenCyberIntelBrain: () => void;
  onOpenCyberPhysical: () => void;
  onOpenCyberWarfare: () => void;
  onOpenDarkWebSearch: () => void;
  onOpenDataIntel: () => void;
  onOpenDeepfakeDetector: () => void;
  onOpenDeepPacket: () => void;
  onOpenDigitalTwin: () => void;
  onOpenExploitAbs: () => void;
  onOpenExploitResist: () => void;
  onOpenForensicRecon: () => void;
  onOpenFridayAI: () => void;
  onOpenFullSpectrumAI: () => void;
  onOpenGlobalIntelSync: () => void;
  onOpenHyperAdaptive: () => void;
  onOpenHyperFusion: () => void;
  onOpenIdentityGraph: () => void;
  onOpenIncidentResponse: () => void;
  onOpenInfraIntel: () => void;
  onOpenInstagramCLI: () => void;
  onOpenIntelligenceFabric: () => void;
  onOpenJarvisHologram: () => void;
  onOpenLargeScaleAnomaly: () => void;
  onOpenMalwareAnalysis: () => void;
  onOpenMalwareCog: () => void;
  onOpenMalwareTools: () => void;
  onOpenMisinfoDetector: () => void;
  onOpenMultiReality: () => void;
  onOpenOdysseusCompare: () => void;
  onOpenOdysseusDeepResearch: () => void;
  onOpenOdysseusDocEditor: () => void;
  onOpenOdysseusEmailAI: () => void;
  onOpenOdysseusModelCookbook: () => void;
  onOpenOdysseusTaskCalendar: () => void;
  onOpenOdysseusWorkspace: () => void;
  onOpenOmniBot: () => void;
  onOpenOnboardingTour: () => void;
  onOpenPayment: () => void;
  onOpenPocketAI: () => void;
  onOpenPrivacyRisk: () => void;
  onOpenProviderStatus: () => void;
  onOpenSelfHealing: () => void;
  onOpenSelfImproving: () => void;
  onOpenShare: () => void;
  onOpenSovereignAI: () => void;
  onOpenSysCognition: () => void;
  onOpenSysEvolution: () => void;
  onOpenSysObs: () => void;
  onOpenTemporalThreat: () => void;
  onOpenThreatCog: () => void;
  onOpenThreatDetection: () => void;
  onOpenThreatPredict: () => void;
  onOpenVisionCapture: () => void;
  onOpenVoiceChat: () => void;
  onOpenVulnDiscovery: () => void;
  onOpenWhatsNew: () => void;
  onOpenZeroBoundary: () => void;
};

export function TopBar(props: TopBarProps) {
  const { state, dispatch } = useStore();
  const [modelQuery, setModelQuery] = useState("");

  const filteredModels = modelQuery.trim()
    ? AI_MODELS.filter((m) => m.id.toLowerCase().includes(modelQuery.toLowerCase()))
    : AI_MODELS;
  const activeModelInfo = AI_MODELS.find((m) => m.id === state.activeModel) ?? AI_MODELS[0];
  const ActiveModelIcon = activeModelInfo?.icon ?? Zap;

  const toolsItems: IconAction[] = [
    { label: "Tools Hub", icon: Wrench, onClick: props.onOpenToolsHub },
    { label: "Persona Editor", icon: UserCircle2, onClick: props.onOpenPersonaEditor },
    { label: "Persona Manager", icon: Users, onClick: props.onOpenPersonaManager },
    { label: "Local Model", icon: Cpu, onClick: props.onOpenLocalModel },
    { label: "Local Engine Hub", icon: Layers3, onClick: props.onOpenLocalEngineHub },
    { label: "Local AI Nexus", icon: Network, onClick: props.onOpenLocalAINexus },
    { label: "Ollama Hub", icon: Cpu, onClick: props.onOpenOllamaHub },
    { label: "Provider Settings", icon: Settings2, onClick: props.onOpenProviderSettings },
    { label: "Model Compare", icon: GitCompare, onClick: props.onOpenModelCompare },
    { label: "Multi-Model Race", icon: Shuffle, onClick: props.onOpenMultiModelRace },
    { label: "Benchmark", icon: Gauge, onClick: props.onOpenBenchmark },
    { label: "Local Benchmark", icon: Gauge, onClick: props.onOpenLocalBenchmark },
    { label: "Fine-tune", icon: GraduationCap, onClick: props.onOpenFinetune },
    { label: "Analytics", icon: BarChart3, onClick: props.onOpenAnalytics },
  ];

  const agentItems: IconAction[] = [
    { label: "Kali Agent", icon: Bot, onClick: props.onOpenAgent },
    { label: "Nexus Agent", icon: Network, onClick: props.onOpenNexus },
    { label: "Arsenal Hub", icon: Sword, onClick: props.onOpenArsenal },
    { label: "Pentest Lab", icon: ShieldAlert, onClick: props.onOpenPentestLab },
    { label: "Neural Matrix", icon: BrainCircuit, onClick: props.onOpenNeuralMatrix },
    { label: "JARVIS Command Center", icon: MonitorCog, onClick: props.onOpenJARVISCommandCenter },
    { label: "Omega Agent", icon: Skull, onClick: props.onOpenOmegaAgent },
    { label: "Autonomous Offense", icon: Target, onClick: props.onOpenAutonomousOffense },
    { label: "Autonomous Decision Engine", icon: Workflow, onClick: props.onOpenAutonomousDecisionEngine },
    { label: "Cognitive Warfare", icon: Dna, onClick: props.onOpenCognitiveWarfare },
    { label: "Debate", icon: Users2, onClick: props.onOpenDebate },
    { label: "Chain of Thought", icon: GitBranch, onClick: props.onOpenChainOfThought },
    { label: "Dynamic Council", icon: Users2, onClick: props.onOpenDynamicCouncil },
    { label: "Collab", icon: Users, onClick: props.onOpenCollab },
    { label: "Swarm Evolution", icon: Dna, onClick: props.onOpenSwarmEvolution },
  ];

  const intelItems: IconAction[] = [
    { label: "War Room", icon: ShieldAlert, onClick: props.onOpenWarRoom },
    { label: "Deep Search", icon: Search, onClick: props.onOpenDeepSearch },
    { label: "Chain Investigation", icon: Waypoints, onClick: props.onOpenChainInvestigation },
    { label: "Red Team Dashboard", icon: Skull, onClick: props.onOpenRedTeam },
    { label: "Cyber Hub", icon: Globe2, onClick: props.onOpenCyberHub },
    { label: "Widgets Dock", icon: LayoutGrid, onClick: props.onOpenWidgetsDock },
    { label: "CISA Live Feed", icon: Rss, onClick: props.onOpenCisaLive },
    { label: "CVE Timeline", icon: History, onClick: props.onOpenCveTimeline },
    { label: "Threat Map", icon: MapIcon, onClick: props.onOpenThreatMap },
    { label: "CVE Tracker", icon: Bug, onClick: props.onOpenCveTracker },
    { label: "Live Ops", icon: Radio, onClick: props.onOpenLiveOps },
    { label: "Cyber Hierarchy", icon: Rows3, onClick: props.onOpenCyberHierarchy },
    { label: "Attack Graph", icon: Network, onClick: props.onOpenAttackGraph },
  ];

  const hudItems: { label: string; icon: any; onClick: () => void; active?: boolean }[] = [
    { label: "Performance Dashboard", icon: Gauge, onClick: props.onOpenPerfDash },
    { label: "Cost Dashboard", icon: DollarSign, onClick: props.onOpenCostDash },
    { label: "Deduplication Visualizer", icon: Braces, onClick: props.onOpenDedupViz },
    { label: "Threat Feed", icon: Rss, onClick: props.onOpenThreatFeed },
    { label: "Security Dashboard", icon: ShieldCheck, onClick: props.onOpenSecurityDash },
    { label: "Context Memory", icon: BrainCircuit, onClick: props.onOpenContextMemory },
    { label: "Prefetch", icon: ZapIcon, onClick: props.onOpenPrefetch },
    { label: "Master HUD", icon: LayoutGrid, onClick: props.onOpenMasterHud },
    { label: "Anomaly Log", icon: AlertTriangle, onClick: props.onOpenAnomalyLog },
    { label: "Network Topology", icon: Network, onClick: props.onOpenNetworkTopo, active: props.hudsVisible },
    { label: "System Health", icon: HeartPulse, onClick: props.onToggleSysHealth },
    { label: "Performance HUD", icon: Activity, onClick: props.onTogglePerfHud },
    { label: "Performance Monitor", icon: Gauge, onClick: props.onTogglePerfMon },
    { label: "Global Status", icon: Globe2, onClick: props.onToggleGlobalStatus },
    { label: "Offline Queue", icon: WifiOff, onClick: props.onToggleOfflineQueue },
    { label: "Performance Command Center", icon: Cog, onClick: props.onOpenPerfCC },
  ];


  const restoredItems: IconAction[] = [
    { label: "Ada V2", icon: Sparkles, onClick: props.onOpenAdaV2 },
    { label: "Agent4 Design Canvas", icon: Sparkles, onClick: props.onOpenAgent4DesignCanvas },
    { label: "Agent4 Git Dashboard", icon: Sparkles, onClick: props.onOpenAgent4GitDashboard },
    { label: "Agent4 Integrations", icon: Sparkles, onClick: props.onOpenAgent4Integrations },
    { label: "Agent4 Slides", icon: Sparkles, onClick: props.onOpenAgent4Slides },
    { label: "Agent4 Web Search", icon: Sparkles, onClick: props.onOpenAgent4WebSearch },
    { label: "Agent Four", icon: Sparkles, onClick: props.onOpenAgentFour },
    { label: "Agent Swarm", icon: Sparkles, onClick: props.onOpenAgentSwarm },
    { label: "Agent V2", icon: Sparkles, onClick: props.onOpenAgentV2 },
    { label: "AI Atlas", icon: Sparkles, onClick: props.onOpenAiAtlas },
    { label: "AI Infra", icon: Sparkles, onClick: props.onOpenAiInfra },
    { label: "AI Safety", icon: Sparkles, onClick: props.onOpenAiSafety },
    { label: "Anomaly CS", icon: Sparkles, onClick: props.onOpenAnomalyCS },
    { label: "Arch Engine", icon: Sparkles, onClick: props.onOpenArchEngine },
    { label: "Attack Surface", icon: Sparkles, onClick: props.onOpenAttackSurface },
    { label: "Autonomous Oversight", icon: Sparkles, onClick: props.onOpenAutonomousOversight },
    { label: "Autonomous SOC", icon: Sparkles, onClick: props.onOpenAutonomousSOC },
    { label: "Behavioral DNA", icon: Sparkles, onClick: props.onOpenBehavioralDNA },
    { label: "Binary Core", icon: Sparkles, onClick: props.onOpenBinaryCore },
    { label: "Build Your Own X", icon: Sparkles, onClick: props.onOpenBuildYourOwnX },
    { label: "Causal Reasoning", icon: Sparkles, onClick: props.onOpenCausalReasoning },
    { label: "Claude Code", icon: Sparkles, onClick: props.onOpenClaudeCode },
    { label: "Claude Skills", icon: Sparkles, onClick: props.onOpenClaudeSkills },
    { label: "Cross Domain Risk", icon: Sparkles, onClick: props.onOpenCrossDomainRisk },
    { label: "Cyber Consciousness", icon: Sparkles, onClick: props.onOpenCyberConsciousness },
    { label: "Cyber Evolution", icon: Sparkles, onClick: props.onOpenCyberEvolution },
    { label: "Cyber Intel Brain", icon: Sparkles, onClick: props.onOpenCyberIntelBrain },
    { label: "Cyber Physical", icon: Sparkles, onClick: props.onOpenCyberPhysical },
    { label: "Cyber Warfare", icon: Sparkles, onClick: props.onOpenCyberWarfare },
    { label: "Dark Web Search", icon: Sparkles, onClick: props.onOpenDarkWebSearch },
    { label: "Data Intel", icon: Sparkles, onClick: props.onOpenDataIntel },
    { label: "Deepfake Detector", icon: Sparkles, onClick: props.onOpenDeepfakeDetector },
    { label: "Deep Packet", icon: Sparkles, onClick: props.onOpenDeepPacket },
    { label: "Digital Twin", icon: Sparkles, onClick: props.onOpenDigitalTwin },
    { label: "Exploit Abs", icon: Sparkles, onClick: props.onOpenExploitAbs },
    { label: "Exploit Resist", icon: Sparkles, onClick: props.onOpenExploitResist },
    { label: "Forensic Recon", icon: Sparkles, onClick: props.onOpenForensicRecon },
    { label: "Friday AI", icon: Sparkles, onClick: props.onOpenFridayAI },
    { label: "Full Spectrum AI", icon: Sparkles, onClick: props.onOpenFullSpectrumAI },
    { label: "Global Intel Sync", icon: Sparkles, onClick: props.onOpenGlobalIntelSync },
    { label: "Hyper Adaptive", icon: Sparkles, onClick: props.onOpenHyperAdaptive },
    { label: "Hyper Fusion", icon: Sparkles, onClick: props.onOpenHyperFusion },
    { label: "Identity Graph", icon: Sparkles, onClick: props.onOpenIdentityGraph },
    { label: "Incident Response", icon: Sparkles, onClick: props.onOpenIncidentResponse },
    { label: "Infra Intel", icon: Sparkles, onClick: props.onOpenInfraIntel },
    { label: "Instagram CLI", icon: Sparkles, onClick: props.onOpenInstagramCLI },
    { label: "Intelligence Fabric", icon: Sparkles, onClick: props.onOpenIntelligenceFabric },
    { label: "Jarvis Hologram", icon: Sparkles, onClick: props.onOpenJarvisHologram },
    { label: "Large Scale Anomaly", icon: Sparkles, onClick: props.onOpenLargeScaleAnomaly },
    { label: "Malware Analysis", icon: Sparkles, onClick: props.onOpenMalwareAnalysis },
    { label: "Malware Cog", icon: Sparkles, onClick: props.onOpenMalwareCog },
    { label: "Malware Tools", icon: Sparkles, onClick: props.onOpenMalwareTools },
    { label: "Misinfo Detector", icon: Sparkles, onClick: props.onOpenMisinfoDetector },
    { label: "Multi Reality", icon: Sparkles, onClick: props.onOpenMultiReality },
    { label: "Odysseus Compare", icon: Sparkles, onClick: props.onOpenOdysseusCompare },
    { label: "Odysseus Deep Research", icon: Sparkles, onClick: props.onOpenOdysseusDeepResearch },
    { label: "Odysseus Doc Editor", icon: Sparkles, onClick: props.onOpenOdysseusDocEditor },
    { label: "Odysseus Email AI", icon: Sparkles, onClick: props.onOpenOdysseusEmailAI },
    { label: "Odysseus Model Cookbook", icon: Sparkles, onClick: props.onOpenOdysseusModelCookbook },
    { label: "Odysseus Task Calendar", icon: Sparkles, onClick: props.onOpenOdysseusTaskCalendar },
    { label: "Odysseus Workspace", icon: Sparkles, onClick: props.onOpenOdysseusWorkspace },
    { label: "Omni Bot", icon: Sparkles, onClick: props.onOpenOmniBot },
    { label: "Onboarding Tour", icon: Sparkles, onClick: props.onOpenOnboardingTour },
    { label: "Payment", icon: Sparkles, onClick: props.onOpenPayment },
    { label: "Pocket AI", icon: Sparkles, onClick: props.onOpenPocketAI },
    { label: "Privacy Risk", icon: Sparkles, onClick: props.onOpenPrivacyRisk },
    { label: "Provider Status", icon: Sparkles, onClick: props.onOpenProviderStatus },
    { label: "Self Healing", icon: Sparkles, onClick: props.onOpenSelfHealing },
    { label: "Self Improving", icon: Sparkles, onClick: props.onOpenSelfImproving },
    { label: "Share", icon: Sparkles, onClick: props.onOpenShare },
    { label: "Sovereign AI", icon: Sparkles, onClick: props.onOpenSovereignAI },
    { label: "Sys Cognition", icon: Sparkles, onClick: props.onOpenSysCognition },
    { label: "Sys Evolution", icon: Sparkles, onClick: props.onOpenSysEvolution },
    { label: "Sys Obs", icon: Sparkles, onClick: props.onOpenSysObs },
    { label: "Temporal Threat", icon: Sparkles, onClick: props.onOpenTemporalThreat },
    { label: "Threat Cog", icon: Sparkles, onClick: props.onOpenThreatCog },
    { label: "Threat Detection", icon: Sparkles, onClick: props.onOpenThreatDetection },
    { label: "Threat Predict", icon: Sparkles, onClick: props.onOpenThreatPredict },
    { label: "Vision Capture", icon: Sparkles, onClick: props.onOpenVisionCapture },
    { label: "Voice Chat", icon: Sparkles, onClick: props.onOpenVoiceChat },
    { label: "Vuln Discovery", icon: Sparkles, onClick: props.onOpenVulnDiscovery },
    { label: "Whats New", icon: Sparkles, onClick: props.onOpenWhatsNew },
    { label: "Zero Boundary", icon: Sparkles, onClick: props.onOpenZeroBoundary },
    { label: "Real-Time Monitor", icon: Sparkles, onClick: props.onOpenRealTimeMonitor },
    { label: "Blockchain Tracker", icon: Sparkles, onClick: props.onOpenBlockchainTracker },
    { label: "Context Window", icon: Sparkles, onClick: props.onOpenContextWindowPage },
    { label: "Security Audit", icon: Sparkles, onClick: props.onOpenSecurityAuditPage },
    { label: "Monitoring (Classic)", icon: Sparkles, onClick: props.onOpenMonitoringPagePlain },
    { label: "Security Compliance (Classic)", icon: Sparkles, onClick: props.onOpenSecurityCompliancePagePlain },
    { label: "Cyber Heatmap HUD", icon: Sparkles, onClick: props.onToggleCyberHeatmap },
    { label: "Cyber 3D Grid", icon: Sparkles, onClick: props.onToggleCyber3DGrid },
    { label: "Quantum Command Center", icon: Sparkles, onClick: props.onToggleQuantumCommand },
    { label: "AI Quick Setup", icon: Sparkles, onClick: props.onToggleAIQuickSetup },
    { label: "Floating Network Panel", icon: Sparkles, onClick: props.onToggleFloatingNetwork },
    { label: "Quantum Memory Graph", icon: Sparkles, onClick: props.onToggleQuantumMemGraph },
    { label: "Quantum Persona 3D", icon: Sparkles, onClick: props.onToggleQuantumPersona3D },
    { label: "Quantum Status Bar", icon: Sparkles, onClick: props.onToggleQuantumStatusBar },
    { label: "WebGL Particle Field", icon: Sparkles, onClick: props.onToggleWebGLParticles },
    { label: "Sys Monitor Orb", icon: Sparkles, onClick: props.onToggleSysMonitorOrb },
    { label: "Idle Tracker Orb", icon: Sparkles, onClick: props.onToggleIdleTrackerOrb },
    { label: "Stream TPS Badge", icon: Sparkles, onClick: props.onToggleStreamTPS },
  ];

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/60 backdrop-blur-sm shrink-0 overflow-x-auto">
      <button
        onClick={props.onMenuClick}
        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground lg:hidden"
        title="Menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      <button
        onClick={props.onToggleSidebar}
        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hidden lg:flex"
        title={props.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {props.sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-accent/40 hover:bg-accent transition-colors max-w-[220px]"
            title="Select model"
          >
            <ActiveModelIcon className={`w-4 h-4 ${activeModelInfo?.color ?? "text-primary"}`} />
            <span className="text-xs font-semibold truncate">{activeModelInfo?.id ?? "Model"}</span>
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 max-h-[70vh] overflow-y-auto bg-card border-border">
          <div className="px-2 pb-2 pt-1 sticky top-0 bg-card z-10">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-background/60">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder="Search models..."
                className="bg-transparent outline-none text-xs w-full"
              />
            </div>
          </div>
          <DropdownMenuSeparator />
          {filteredModels.map((m) => (
            <DropdownMenuItem key={m.id} onSelect={() => dispatch({ type: "SET_MODEL", model: m.id })}>
              <m.icon className={`w-4 h-4 ${m.color}`} />
              <span className="flex-1 truncate">{m.id}</span>
              {m.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">{m.badge}</span>}
              {m.id === state.activeModel && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1 ml-1">
        <ToolbarGroup label="Tools" icon={Wrench} items={toolsItems} activeColor="#00e5ff" />
        <ToolbarGroup label="Agents" icon={Bot} items={agentItems} activeColor="#a78bfa" />
        <ToolbarGroup label="Intel" icon={Radar} items={intelItems} activeColor="#22c55e" />
        <ToolbarGroup label="HUD" icon={Activity} items={hudItems} activeColor="#e21227" />
        <ToolbarGroup label="More" icon={Sparkles} items={restoredItems} activeColor="#f59e0b" />
      </div>

      <div className="flex-1" />

      <div className="hidden xl:flex items-center gap-0.5 mr-1">
        {hudItems.slice(0, 6).map((item) => (
          <HudToggleButton key={item.label} label={item.label} icon={item.icon} active={item.active} onClick={item.onClick} />
        ))}
      </div>

      <button
        onClick={props.onOpenHelp}
        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
        title="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      <motion.button
        onClick={props.onOpenPricing}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide text-white shrink-0"
        style={{
          background: "linear-gradient(135deg, #e21227 0%, #7a0d16 100%)",
          boxShadow: "0 0 12px rgba(226, 18, 39, 0.5)",
          border: "1px solid rgba(226, 18, 39, 0.5)",
        }}
        title="Upgrade"
      >
        <Crown className="w-4 h-4" />
        <span className="hidden sm:inline">Upgrade</span>
      </motion.button>
    </div>
  );
}
