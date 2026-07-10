import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TokenGaugeProps {
  used: number;
  limit: number;
  label?: string;
}

function GaugeMesh({ used, limit }: { used: number; limit: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const progress = Math.min(used / limit, 1);

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.elapsedTime;
    ringRef.current.rotation.z = Math.sin(t * 0.5) * 0.05;
  });

  return (
    <group>
      {/* Background ring */}
      <mesh>
        <torusGeometry args={[1, 0.05, 8, 64, Math.PI * 2]} />
        <meshBasicMaterial color="#1a1a1a" transparent opacity={0.5} />
      </mesh>
      {/* Progress ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1, 0.08, 8, 64, Math.PI * 2 * progress]} />
        <meshStandardMaterial
          color={progress > 0.8 ? "#e21227" : progress > 0.5 ? "#f59e0b" : "#00e5ff"}
          emissive={progress > 0.8 ? "#e21227" : progress > 0.5 ? "#f59e0b" : "#00e5ff"}
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Center text plane */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[1.5, 0.8]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export function TokenGauge({ used, limit, label = "Tokens" }: TokenGaugeProps) {
  const [displayUsed, setDisplayUsed] = useState(0);
  const progress = (used / limit) * 100;

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayUsed((prev) => {
        const diff = used - prev;
        if (Math.abs(diff) < 100) return used;
        return prev + diff * 0.1;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [used]);

  return (
    <div className="relative w-full h-48 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["transparent"]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[2, 2, 2]} intensity={0.5} />
        <GaugeMesh used={displayUsed} limit={limit} />
      </Canvas>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-3xl font-mono font-bold text-white">
          {Math.round(displayUsed).toLocaleString()}
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">
          {label}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {progress.toFixed(1)}% of {(limit / 1000).toFixed(0)}K
        </div>
      </div>
    </div>
  );
}
