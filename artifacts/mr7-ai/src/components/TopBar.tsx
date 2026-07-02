import { useState } from "react";
import { motion } from "framer-motion";
import {
  Menu, PanelLeftClose, PanelLeftOpen, ChevronDown, Zap, Crown, HelpCircle,
  Wrench, Bot, Radar, Activity, HardDrive, Check, Search,
  UserCircle2, Users, Cpu, Sword, Network, Settings2, GitCompare, BarChart3,
  ShieldAlert, Globe2, Radio, ListChecks, Braces, Shuffle, Users2, GraduationCap,
  Dna, Gauge, DollarSign, Layers3, Rss, ShieldCheck, BrainCircuit, Zap as ZapIcon,
  AlertTriangle, Waypoints, LayoutGrid, Rows3, Newspaper, History, Map as MapIcon,
  Bug, Workflow, Skull, Target, GitBranch, Cog, HeartPulse, MonitorCog, WifiOff,
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
