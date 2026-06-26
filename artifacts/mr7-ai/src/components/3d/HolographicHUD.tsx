/**
 * Holographic HUD — واجهة هولوغرافية متقدمة
 * عرض ثلاثي الأبعاد للبيانات + مؤشرات حيوية + خرائط حرارية
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";

// ── Holographic Panel ─────────────────────────────────────────────────────
const holoPanelVert = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv    = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const holoPanelFrag = `
  uniform float time;
  uniform vec3  color;
  uniform float opacity;
  varying vec2  vUv;
  varying vec3  vNormal;

  void main() {
    vec2 uv = vUv;

    // Grid lines
    float gridX = step(0.97, fract(uv.x * 12.0));
    float gridY = step(0.97, fract(uv.y * 8.0));
    float grid  = max(gridX, gridY);

    // Scan line
    float scan = step(0.98, fract(uv.y * 40.0 - time * 0.5));

    // Edge glow
    float edge = (1.0 - smoothstep(0.0, 0.04, uv.x)) +
                 (1.0 - smoothstep(0.96, 1.0, uv.x)) +
                 (1.0 - smoothstep(0.0, 0.04, uv.y)) +
                 (1.0 - smoothstep(0.96, 1.0, uv.y));
    edge = clamp(edge, 0.0, 1.0);

    // Corner brackets
    float cx = step(0.92, max(uv.x, 1.0 - uv.x));
    float cy = step(0.88, max(uv.y, 1.0 - uv.y));
    float corner = cx * cy;

    // Noise flicker
    float flicker = 0.92 + 0.08 * fract(sin(time * 47.3 + uv.y * 100.0) * 43758.5);

    vec3  col = color;
    float a   = (grid * 0.4 + scan * 0.2 + edge * 0.8 + corner) * opacity * flicker;
    a += 0.04 * opacity; // base alpha

    gl_FragColor = vec4(col, a);
  }
`;

function HoloPanel({
  position, rotation, size, color,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number];
  color: THREE.Color;
}) {
  const matRef   = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(() => ({
    time:    { value: 0 },
    color:   { value: color },
    opacity: { value: 0.7 },
  }), [color]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.4) * 0.05;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation ? rotation : [0, 0, 0]}
    >
      <mesh>
        <planeGeometry args={[size[0], size[1]]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={holoPanelVert}
          fragmentShader={holoPanelFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ── 3D Bar Chart ──────────────────────────────────────────────────────────
export function HoloBarChart({
  position,
  data,
  color,
}: {
  position: [number, number, number];
  data: number[];
  color: THREE.Color;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const barsRef  = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    barsRef.current.forEach((bar, i) => {
      if (!bar) return;
      const t   = state.clock.elapsedTime;
      const val = data[i] * (0.9 + Math.sin(t * 1.5 + i * 0.7) * 0.1);
      bar.scale.y = val;
      bar.position.y = val * 0.5 - 0.5;
      const mat = bar.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + val * 0.4;
    });
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {data.map((val, i) => (
        <mesh
          key={i}
          ref={(m) => { if (m) barsRef.current[i] = m; }}
          position={[(i - data.length / 2) * 0.22, val * 0.5 - 0.5, 0]}
        >
          <boxGeometry args={[0.15, val, 0.05]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Floating Data Label ────────────────────────────────────────────────────
export function HoloLabel({
  position, text, color, fontSize = 0.12,
}: {
  position: [number, number, number];
  text: string;
  color: string;
  fontSize?: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.06;
  });

  return (
    <group ref={ref} position={position}>
      <Billboard>
        <Text
          fontSize={fontSize}
          color={color}
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.9}
          font={undefined}
        >
          {text}
        </Text>
      </Billboard>
    </group>
  );
}

// ── Orbit Indicator Ring ───────────────────────────────────────────────────
const orbitVert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

const orbitFrag = `
  uniform float time;
  uniform vec3  color;
  varying vec2  vUv;

  void main() {
    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
    float norm  = (angle + 3.14159) / 6.28318;
    float arc   = mod(norm - time * 0.2, 1.0);
    float a     = smoothstep(0.6, 0.0, arc) * smoothstep(0.0, 0.02, arc);
    float ring  = abs(length(vUv - 0.5) - 0.47);
    float rMask = smoothstep(0.03, 0.0, ring);
    gl_FragColor = vec4(color, a * rMask * 0.8);
  }
`;

export function OrbitIndicator({
  position, radius, color,
}: {
  position: [number, number, number];
  radius: number;
  color: THREE.Color;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    time:  { value: 0 },
    color: { value: color },
  }), [color]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={position} scale={radius * 2} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={orbitVert}
        fragmentShader={orbitFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Full HUD System ────────────────────────────────────────────────────────
export function HolographicHUD() {
  const CYAN   = new THREE.Color("#00e5ff");
  const RED    = new THREE.Color("#e21227");
  const PURPLE = new THREE.Color("#7c3aed");

  const mockData = [0.3, 0.7, 0.5, 0.9, 0.4, 0.8, 0.6, 0.75];

  return (
    <group>
      {/* Side panels */}
      <HoloPanel position={[-6.5, 0.5, -2]} rotation={[0, 0.3, 0]} size={[2.5, 3.5]} color={CYAN}  />
      <HoloPanel position={[ 6.5, 0.5, -2]} rotation={[0,-0.3, 0]} size={[2.5, 3.5]} color={RED}   />
      <HoloPanel position={[ 0,   4.0, -4]} size={[4.0, 1.2]}  color={PURPLE} />

      {/* 3D Bar charts */}
      <HoloBarChart position={[-6.5, 0, -2]} data={mockData}   color={CYAN}   />
      <HoloBarChart position={[ 6.5, 0, -2]} data={mockData.map(v => 1 - v)} color={RED} />

      {/* Floating labels */}
      <HoloLabel position={[-6.5, 2.2, -2]} text="◈ THREAT LEVEL: CRITICAL" color="#00e5ff" />
      <HoloLabel position={[ 6.5, 2.2, -2]} text="◈ SYSTEMS: ONLINE" color="#e21227" />
      <HoloLabel position={[0, 4.8, -4]}    text="▸ MR7-AI ULTRA MODE ACTIVE ◂" color="#7c3aed" fontSize={0.14} />

      {/* Orbit indicators around core */}
      <OrbitIndicator position={[0, 0, 0]} radius={2.0} color={CYAN}   />
      <OrbitIndicator position={[0, 0, 0]} radius={3.2} color={RED}    />
      <OrbitIndicator position={[0, 0, 0]} radius={4.5} color={PURPLE} />
    </group>
  );
}
