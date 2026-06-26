import { useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HoloChatBubbleProps {
  content: string;
  isUser?: boolean;
  timestamp?: Date;
  children?: ReactNode;
}

function HoloSphere({ isUser }: { isUser: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = isUser ? "#00e5ff" : "#e21227";

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.y = t * 0.5;
    meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    meshRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[0.3, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        wireframe
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function ScanLineEffect() {
  const lineRef = useRef<THREE.Line>(null);

  useFrame((state) => {
    if (!lineRef.current) return;
    const t = state.clock.elapsedTime;
    const y = ((t * 0.5) % 1) * 2 - 1;
    lineRef.current.position.y = y;
  });

  return (
    <line ref={lineRef as any}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array([-0.5, 0, 0, 0.5, 0, 0]), 3]}
          count={2}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00e5ff" transparent opacity={0.6} />
    </line>
  );
}

export function HoloChatBubble({ content, isUser = false, timestamp }: HoloChatBubbleProps) {
  const borderColor = isUser ? "border-cyan-500/30" : "border-red-500/30";
  const gradientFrom = isUser ? "from-cyan-500/10" : "from-red-500/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`relative group ${isUser ? "ml-auto" : "mr-auto"} max-w-[80%] mb-4`}
    >
      <div className={`relative bg-gradient-to-br ${gradientFrom} to-black/60 backdrop-blur-md rounded-2xl p-4 border-2 ${borderColor} overflow-hidden`}>
        {/* 3D Icon */}
        <div className="absolute top-2 left-2 w-8 h-8 pointer-events-none">
          <Canvas
            camera={{ position: [0, 0, 1.5], fov: 50 }}
            dpr={[1, 1.5]}
            gl={{ alpha: true, antialias: true }}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[2, 2, 2]} intensity={0.5} />
            <HoloSphere isUser={isUser} />
          </Canvas>
        </div>

        {/* Content */}
        <div className="relative z-10 pl-10 pt-2">
          <div className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
          {timestamp && (
            <div className="text-xs text-gray-500 mt-2">
              {timestamp.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: "100%" }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"
          />
        </div>

        {/* Glowing border effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: [
              `0 0 20px rgba(226, 18, 39, 0.3)`,
              `0 0 30px rgba(226, 18, 39, 0.5)`,
              `0 0 20px rgba(226, 18, 39, 0.3)`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
    </motion.div>
  );
}

// Typing indicator with oscillating sine wave
export function HoloTypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mr-auto max-w-[80%] mb-4"
    >
      <div className="relative bg-black/60 backdrop-blur-md rounded-2xl px-6 py-4 border border-red-500/30">
        <div className="flex gap-2 items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
              className="w-2 h-2 rounded-full bg-red-500"
              style={{
                boxShadow: "0 0 10px rgba(226, 18, 39, 0.6)",
              }}
            />
          ))}
          <span className="ml-2 text-xs text-gray-500">Analyzing...</span>
        </div>
      </div>
    </motion.div>
  );
}
