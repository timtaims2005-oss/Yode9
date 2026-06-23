import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const NODE_COUNT = 100;
const PRIMARY_COLOR = new THREE.Color("#e21227");
const SECONDARY_COLOR = new THREE.Color("#00e5ff");

function NeuralNodes() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(NODE_COUNT * 3);
    const vel = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * 6;
      pos[i3 + 1] = (Math.random() - 0.5) * 6;
      pos[i3 + 2] = (Math.random() - 0.5) * 6;
      vel[i3] = (Math.random() - 0.5) * 0.002;
      vel[i3 + 1] = (Math.random() - 0.5) * 0.002;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    for (let i = 0; i < NODE_COUNT; i++) {
      const i3 = i * 3;
      posArr[i3] += velocities[i3];
      posArr[i3 + 1] += velocities[i3 + 1];
      posArr[i3 + 2] += velocities[i3 + 2];

      if (Math.abs(posArr[i3]) > 3) velocities[i3] *= -1;
      if (Math.abs(posArr[i3 + 1]) > 3) velocities[i3 + 1] *= -1;
      if (Math.abs(posArr[i3 + 2]) > 3) velocities[i3 + 2] *= -1;
    }
    posAttr.needsUpdate = true;

    const colorAttr = geo.attributes.color as THREE.BufferAttribute;
    const colArr = colorAttr.array as Float32Array;
    for (let i = 0; i < NODE_COUNT; i++) {
      const i3 = i * 3;
      const pulse = (Math.sin(state.clock.elapsedTime * 1.5 + i * 0.2) + 1) * 0.5;
      const color = PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, pulse * 0.3);
      colArr[i3] = color.r;
      colArr[i3 + 1] = color.g;
      colArr[i3 + 2] = color.b;
    }
    colorAttr.needsUpdate = true;
  });

  const colors = useMemo(() => new Float32Array(NODE_COUNT * 3), []);

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        vertexColors
        size={0.08}
        sizeAttenuation
        depthWrite={false}
        opacity={0.8}
      />
    </Points>
  );
}

export function ThreatRadar() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={0.4} color="#e21227" />
        <NeuralNodes />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
