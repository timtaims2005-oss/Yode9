/**
 * Crystalline Geometry — هندسة كريستالية
 * مجسمات كريستالية سيبرانية مع PBR وتشويه انعكاسي
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── Crystal Shard Shader ──────────────────────────────────────────────────
const crystalVert = `
  varying vec3  vNormal;
  varying vec3  vPos;
  varying vec2  vUv;
  varying vec3  vReflect;
  uniform float time;

  void main(){
    vNormal = normalize(normalMatrix * normal);
    vPos    = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv     = uv;

    // Subtle crystal breathing
    float breath = 1.0 + sin(time * 0.8 + position.y * 3.0) * 0.015;
    vec3  pos    = position * breath;
    vReflect     = reflect(normalize(pos - cameraPosition), vNormal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const crystalFrag = `
  uniform float time;
  uniform vec3  baseColor;
  uniform float metalness;
  uniform float opacity_;
  varying vec3  vNormal;
  varying vec3  vPos;
  varying vec2  vUv;
  varying vec3  vReflect;

  // Fake environment reflection using procedural sky
  vec3 envSample(vec3 dir) {
    float t = dot(normalize(dir), vec3(0,1,0)) * 0.5 + 0.5;
    vec3 sky = mix(vec3(0.05, 0.01, 0.15), vec3(0.0, 0.02, 0.1), t);
    // Fake light sources
    float sun1 = exp(-length(dir - normalize(vec3(1,2,-1))) * 8.0);
    float sun2 = exp(-length(dir - normalize(vec3(-2,1,1))) * 10.0);
    sky += vec3(0.886,0.3,0.3) * sun1 * 2.0;
    sky += vec3(0.0, 0.898, 1.0) * sun2 * 1.5;
    return sky;
  }

  void main(){
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vPos);

    // Fresnel
    float fresnel = pow(1.0 - abs(dot(N, V)), 3.0);

    // Refraction-like iridescence
    vec3 refDir = refract(-V, N, 0.9);
    vec3 envRef = envSample(vReflect);
    vec3 envRefr = envSample(refDir);

    // Internal structure lines
    float lines = sin(vPos.y * 20.0 + time * 0.5) * 0.5 + 0.5;
    lines = smoothstep(0.6, 0.8, lines) * 0.3;

    // Final color
    vec3 col = mix(baseColor * envRefr, envRef, fresnel * metalness);
    col += baseColor * lines;
    col += vec3(fresnel * 0.4 * metalness);

    float a = mix(opacity_, 1.0, fresnel * metalness);
    gl_FragColor = vec4(col, a);
  }
`;

function CrystalShard({
  position, rotation, scale, color, metalness = 0.9,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: THREE.Color;
  metalness?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef  = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    time:      { value: 0 },
    baseColor: { value: color },
    metalness: { value: metalness },
    opacity_:  { value: 0.65 },
  }), [color, metalness]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.4 + position[0]) * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <octahedronGeometry args={[1, 0]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={crystalVert}
        fragmentShader={crystalFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Crystal Cluster ────────────────────────────────────────────────────────
export function CrystalCluster({ center = [0,0,0] as [number,number,number] }) {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  const CYAN   = new THREE.Color("#00e5ff");
  const RED    = new THREE.Color("#e21227");
  const PURPLE = new THREE.Color("#7c3aed");
  const WHITE  = new THREE.Color("#ffffff");

  return (
    <group position={center}>
      {/* Main cluster */}
      <CrystalShard
        position={[0, 0, 0]}
        rotation={[0.3, 0.5, 0.1]}
        scale={[0.4, 0.9, 0.4]}
        color={CYAN}
        metalness={0.95}
      />
      <CrystalShard
        position={[0.6, -0.3, 0.2]}
        rotation={[0.1, 0.8, 0.3]}
        scale={[0.3, 0.6, 0.3]}
        color={RED}
        metalness={0.9}
      />
      <CrystalShard
        position={[-0.5, 0.2, -0.3]}
        rotation={[-0.2, 0.4, 0.6]}
        scale={[0.25, 0.7, 0.25]}
        color={PURPLE}
        metalness={0.95}
      />
      {isMed && (
        <>
          <CrystalShard
            position={[0.2, 0.5, -0.6]}
            rotation={[0.7, 0.2, -0.3]}
            scale={[0.2, 0.5, 0.2]}
            color={WHITE}
            metalness={0.99}
          />
          <CrystalShard
            position={[-0.3, -0.4, 0.5]}
            rotation={[0.4, -0.3, 0.8]}
            scale={[0.18, 0.45, 0.18]}
            color={CYAN}
            metalness={0.85}
          />
        </>
      )}
      {isHigh && (
        <>
          <CrystalShard
            position={[0.8, 0.3, -0.4]}
            rotation={[-0.5, 0.7, 0.2]}
            scale={[0.15, 0.4, 0.15]}
            color={RED}
            metalness={0.88}
          />
          <CrystalShard
            position={[-0.7, 0.4, 0.3]}
            rotation={[0.3, -0.5, 0.9]}
            scale={[0.22, 0.55, 0.22]}
            color={PURPLE}
            metalness={0.92}
          />
        </>
      )}
    </group>
  );
}

// ── Floating Crystal Array ─────────────────────────────────────────────────
export function CrystalArray() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";

  const positions: [number, number, number][] = [
    [-7,  1.5, -4], [7, -1, -3], [0, 4, -6],
    [-5, -2, -2],   [5, 3, -5],
    ...(isHigh ? [
      [3, -3, -4]   as [number,number,number],
      [-3, 2.5, -3] as [number,number,number],
    ] : []),
  ];

  return (
    <>
      {positions.map((pos, i) => (
        <CrystalCluster key={i} center={pos} />
      ))}
    </>
  );
}
