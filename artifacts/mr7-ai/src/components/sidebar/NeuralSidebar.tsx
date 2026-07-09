import { useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface NeuralSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  onOpenPricing?: () => void;
  onOpenApi?: () => void;
  onOpenTool?: () => void;
  onOpenSettings?: () => void;
  onOpenAccount?: () => void;
}

// Animated neon flow line through the sidebar
function FlowLines() {
  const linesRef = useRef<THREE.Group>(null);

  const lineData = useMemo(() => {
    const lines: { points: THREE.Vector3[]; color: string; offset: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const points: THREE.Vector3[] = [];
      const y = -2 + i * 0.6;
      for (let j = 0; j < 20; j++) {
        const x = (j / 19) * 4 - 2;
        const z = Math.sin(j * 0.5) * 0.3;
        points.push(new THREE.Vector3(x, y, z));
      }
      lines.push({
        points,
        color: i % 2 === 0 ? "#e21227" : "#00e5ff",
        offset: i * 0.3,
      });
    }
    return lines;
  }, []);

  useFrame((state) => {
    if (!linesRef.current) return;
    linesRef.current.children.forEach((child, i) => {
      child.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + i * 0.2) * 0.05;
      child.position.x = Math.sin(state.clock.elapsedTime * 0.3 + i * 0.3) * 0.1;
    });
  });

  return (
    <group ref={linesRef}>
      {lineData.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(line.points.flatMap((p) => [p.x, p.y, p.z])), 3]}
              count={line.points.length}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={line.color} transparent opacity={0.2} />
        </line>
      ))}
    </group>
  );
}

function BackgroundCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["transparent"]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} intensity={0.5} color="#e21227" />
      <pointLight position={[-3, -3, 3]} intensity={0.3} color="#00e5ff" />
      <FlowLines />
    </Canvas>
  );
}

export function NeuralSidebar({
  isOpen,
  onClose,
  children,
  ...props
}: NeuralSidebarProps) {
  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: isOpen ? 0 : -300, opacity: isOpen ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 30 }}
      className="fixed inset-y-0 left-0 w-80 z-50 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(13,13,13,0.95) 0%, rgba(8,8,8,0.98) 100%)",
      }}
    >
      {/* 3D background layer */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <BackgroundCanvas />
      </div>

      {/* Glitch border effect */}
      <div
        className="absolute inset-y-0 right-0 w-px"
        style={{
          background: "linear-gradient(180deg, transparent, #e21227, #00e5ff, transparent)",
          boxShadow: "0 0 20px rgba(226, 18, 39, 0.5)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">MR7.AI</h2>
            <p className="text-xs text-gray-500 tracking-widest">NEURAL COMMAND</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </motion.button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Footer action buttons */}
        <div className="p-3 border-t border-white/10 grid grid-cols-2 gap-2">
          {[
            { label: "PRICING", action: props.onOpenPricing, color: "#e21227" },
            { label: "API", action: props.onOpenApi, color: "#00e5ff" },
            { label: "TOOLS", action: props.onOpenTool, color: "#f59e0b" },
            { label: "SETTINGS", action: props.onOpenSettings, color: "#22c55e" },
          ].map((btn) => (
            <motion.button
              key={btn.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={btn.action}
              className="px-3 py-2 rounded-lg text-xs font-bold tracking-wider transition-all"
              style={{
                background: `${btn.color}15`,
                border: `1px solid ${btn.color}40`,
                color: btn.color,
              }}
            >
              {btn.label}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
