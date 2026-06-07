import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Crosshair, Zap, Search, Database, Code2, Shield, Network } from "lucide-react";

const AGENT_PHASES = [
  { icon: Search, text: "Scanning attack surface...", color: "#e21227" },
  { icon: Database, text: "Querying knowledge base...", color: "#a78bfa" },
  { icon: Crosshair, text: "Identifying vulnerabilities...", color: "#f59e0b" },
  { icon: Code2, text: "Generating exploit chain...", color: "#10b981" },
  { icon: Shield, text: "Running stealth checks...", color: "#06b6d4" },
  { icon: Network, text: "Synthesizing intelligence...", color: "#e21227" },
];

const CHAT_PHASES = [
  { icon: Brain, text: "Analyzing your query...", color: "#e21227" },
  { icon: Database, text: "Retrieving context...", color: "#a78bfa" },
  { icon: Zap, text: "Processing with neural matrix...", color: "#f59e0b" },
  { icon: Code2, text: "Formulating response...", color: "#10b981" },
  { icon: Search, text: "Cross-referencing knowledge...", color: "#06b6d4" },
  { icon: Shield, text: "Applying security protocols...", color: "#e21227" },
];

interface ThinkingIndicatorProps {
  agentMode?: boolean;
}

export function ThinkingIndicator({ agentMode = false }: ThinkingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState(0);
  const [dots, setDots] = useState(0);
  const [pulseRing, setPulseRing] = useState(false);
  const startRef = useRef(Date.now());

  const phases = agentMode ? AGENT_PHASES : CHAT_PHASES;
  const currentPhase = phases[phase % phases.length];
  const PhaseIcon = currentPhase.icon;

  useEffect(() => {
    startRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsed(((Date.now() - startRef.current) / 1000));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const dotsTimer = setInterval(() => {
      setDots(d => (d + 1) % 4);
    }, 400);
    return () => clearInterval(dotsTimer);
  }, []);

  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setPhase(p => p + 1);
      setPulseRing(true);
      setTimeout(() => setPulseRing(false), 600);
    }, 2200);
    return () => clearInterval(phaseTimer);
  }, []);

  const dotsStr = ".".repeat(dots);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="inline-flex items-start gap-3 my-1"
    >
      {/* Brain icon container */}
      <div className="relative flex-shrink-0 mt-0.5">
        {/* Outer pulse ring */}
        <motion.div
          animate={{
            scale: pulseRing ? [1, 1.6, 1] : [1, 1.15, 1],
            opacity: pulseRing ? [0.6, 0, 0] : [0.3, 0.1, 0.3],
          }}
          transition={{ duration: pulseRing ? 0.6 : 2, repeat: pulseRing ? 0 : Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: currentPhase.color, margin: "-6px" }}
        />
        {/* Scanner ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full"
          style={{
            margin: "-4px",
            border: `1.5px solid transparent`,
            borderTopColor: currentPhase.color,
            borderRightColor: `${currentPhase.color}55`,
          }}
        />
        {/* Brain core */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, ${currentPhase.color}22 0%, ${currentPhase.color}08 100%)`,
            border: `1px solid ${currentPhase.color}40`,
            boxShadow: `0 0 12px ${currentPhase.color}40, inset 0 0 8px ${currentPhase.color}15`,
          }}
        >
          <motion.div
            key={phase}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <Brain className="w-4 h-4" style={{ color: currentPhase.color }} />
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <div
        className="rounded-xl px-3.5 py-2.5 min-w-[220px] max-w-[320px]"
        style={{
          background: "linear-gradient(135deg, #161616 0%, #0d0d0d 100%)",
          border: `1px solid ${currentPhase.color}25`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${currentPhase.color}10`,
        }}
      >
        {/* Title row */}
        <div className="flex items-center gap-2 mb-1.5">
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: currentPhase.color }}
          />
          <span
            className="text-[13px] font-semibold tracking-wide"
            style={{ color: currentPhase.color }}
          >
            {agentMode ? "AGENT" : "Thinking"}{dotsStr}
          </span>
          {/* Timer */}
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/60 tabular-nums">
            {elapsed.toFixed(1)}s
          </span>
        </div>

        {/* Phase message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-1.5"
          >
            <PhaseIcon className="w-3 h-3 flex-shrink-0 text-muted-foreground/50" />
            <span className="text-[11.5px] text-muted-foreground/70 font-mono">
              {currentPhase.text}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="mt-2 h-[2px] rounded-full overflow-hidden bg-white/5">
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-1/3 rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${currentPhase.color}, transparent)` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
