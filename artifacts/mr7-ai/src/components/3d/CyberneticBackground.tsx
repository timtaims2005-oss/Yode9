import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const NODE_COUNT = 120;
const CONNECTION_DISTANCE = 2.5;
const PRIMARY_COLOR = "#e21227";
const SECONDARY_COLOR = "#00e5ff";

function generateNodes(): { positions: Float32Array; velocities: Float32Array } {
  const positions = new Float32Array(NODE_COUNT * 3);
  const velocities = new Float32Array(NODE_COUNT * 3);
  for (let i = 0; i < NODE_COUNT; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 8;
    positions[i3 + 1] = (Math.random() - 0.5) * 8;
    positions[i3 + 2] = (Math.random() - 0.5) * 8;
    velocities[i3] = (Math.random() - 0.5) * 0.003;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.003;
  }
  return { positions, velocities };
}

function NeuralNetwork() {
  const pointsRef = useRef<THREE.Points>(null);
  const lineRef = useRef<THREE.LineSegments>(null);
  const { positions, velocities } = useMemo(generateNodes, []);
  const linePositions = useMemo(() => new Float32Array(NODE_COUNT * NODE_COUNT * 6), []);
  const lineColors = useMemo(() => new Float32Array(NODE_COUNT * NODE_COUNT * 6), []);

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

      if (Math.abs(posArr[i3]) > 4) velocities[i3] *= -1;
      if (Math.abs(posArr[i3 + 1]) > 4) velocities[i3 + 1] *= -1;
      if (Math.abs(posArr[i3 + 2]) > 4) velocities[i3 + 2] *= -1;
    }
    posAttr.needsUpdate = true;

    if (!lineRef.current) return;
    const lineGeo = lineRef.current.geometry;
    let lineIndex = 0;
    let colorIndex = 0;

    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const i3 = i * 3;
        const j3 = j * 3;
        const dx = posArr[i3] - posArr[j3];
        const dy = posArr[i3 + 1] - posArr[j3 + 1];
        const dz = posArr[i3 + 2] - posArr[j3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < CONNECTION_DISTANCE) {
          const alpha = 1 - dist / CONNECTION_DISTANCE;
          linePositions[lineIndex] = posArr[i3];
          linePositions[lineIndex + 1] = posArr[i3 + 1];
          linePositions[lineIndex + 2] = posArr[i3 + 2];
          linePositions[lineIndex + 3] = posArr[j3];
          linePositions[lineIndex + 4] = posArr[j3 + 1];
          linePositions[lineIndex + 5] = posArr[j3 + 2];

          const pulse = (Math.sin(state.clock.elapsedTime * 2 + i * 0.1) + 1) * 0.5;
          const r = alpha * (0.88 + pulse * 0.12);
          const g = alpha * 0.07 * (1 - pulse);
          const b = alpha * (0.15 + pulse * 0.85);

          lineColors[colorIndex] = r;
          lineColors[colorIndex + 1] = g;
          lineColors[colorIndex + 2] = b;
          lineColors[colorIndex + 3] = r;
          lineColors[colorIndex + 4] = g;
          lineColors[colorIndex + 5] = b;

          lineIndex += 6;
          colorIndex += 6;
        }
      }
    }

    const linePosAttr = lineGeo.attributes.position as THREE.BufferAttribute;
    const lineColAttr = lineGeo.attributes.color as THREE.BufferAttribute;
    linePosAttr.needsUpdate = true;
    lineColAttr.needsUpdate = true;
    lineGeo.setDrawRange(0, lineIndex / 3);
  });

  const maxLines = (NODE_COUNT * (NODE_COUNT - 1) / 2);
  const maxLinePositions = new Float32Array(maxLines * 6);
  const maxLineColors = new Float32Array(maxLines * 6);

  return (
    <group>
      <Points positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          vertexColors
          size={0.05}
          sizeAttenuation
          depthWrite={false}
          opacity={0.9}
        />
      </Points>
      <lineSegments ref={lineRef as any}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[maxLinePositions, 3]}
            count={maxLines * 2}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[maxLineColors, 3]}
            count={maxLines * 2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}

function CoreSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.08);
    meshRef.current.rotation.y += 0.003;
    meshRef.current.rotation.x += 0.001;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[0.6, 2]} />
      <meshStandardMaterial
        color={PRIMARY_COLOR}
        emissive={PRIMARY_COLOR}
        emissiveIntensity={0.4}
        wireframe
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

function FloatingRings() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.1;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
  });

  return (
    <group ref={group}>
      {[1.2, 1.8, 2.4].map((radius, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.3, i * 0.5, 0]}>
          <torusGeometry args={[radius, 0.01, 8, 64]} />
          <meshBasicMaterial
            color={i === 0 ? PRIMARY_COLOR : SECONDARY_COLOR}
            transparent
            opacity={0.3 - i * 0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

export function CyberneticBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#080808"]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.5} color={PRIMARY_COLOR} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} color={SECONDARY_COLOR} />
        <NeuralNetwork />
        <CoreSphere />
        <FloatingRings />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
          autoRotate
          autoRotateSpeed={0.2}
        />
      </Canvas>
    </div>
  );
}
