import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Provider {
  id: string;
  available: boolean;
  latency?: number;
}

interface ProviderStatusOrbsProps {
  providers: Provider[];
}

function StatusOrb({ provider, position }: { provider: Provider; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = provider.available ? "#00e5ff" : "#e21227";
  const emissiveIntensity = provider.available ? 0.5 : 0.2;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = (Math.sin(t * 2 + position[0]) + 1) * 0.5;
    meshRef.current.scale.setScalar(0.8 + pulse * 0.2);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function OrbGrid({ providers }: { providers: Provider[] }) {
  const positions = useMemo(() => {
    const pos: [number, number, number][] = [];
    const gridSize = Math.ceil(Math.sqrt(providers.length));
    let index = 0;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (index >= providers.length) break;
        pos.push([
          (j - gridSize / 2 + 0.5) * 1.2,
          (i - gridSize / 2 + 0.5) * 1.2,
          0,
        ]);
        index++;
      }
    }
    return pos;
  }, [providers]);

  return (
    <group>
      {providers.map((p, i) => (
        <StatusOrb key={p.id} provider={p} position={positions[i]} />
      ))}
    </group>
  );
}

export function ProviderStatusOrbs({ providers }: ProviderStatusOrbsProps) {
  return (
    <div className="w-full h-64 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["transparent"]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.5} />
        <OrbGrid providers={providers} />
      </Canvas>
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 pointer-events-none">
        {providers.slice(0, 8).map((p) => (
          <div key={p.id} className="flex items-center gap-1 text-xs text-gray-400">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: p.available ? "#00e5ff" : "#e21227" }}
            />
            <span>{p.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
