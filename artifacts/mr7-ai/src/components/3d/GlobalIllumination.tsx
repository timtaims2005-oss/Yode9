/**
 * Global Illumination System
 * إضاءة عالمية محاكاة + Ambient Occlusion + HDR Environment
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── HDR Sky Environment ────────────────────────────────────────────────────
const skyVert = `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFrag = `
  uniform float time;
  varying vec3  vDir;

  vec3 linearToSRGB(vec3 c) { return pow(max(c, 0.0), vec3(1.0/2.2)); }

  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5); }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(
      mix(mix(hash(i),            hash(i+vec3(1,0,0)),f.x),
          mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
          mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }

  void main() {
    vec3 dir = normalize(vDir);

    // Sky gradient based on elevation
    float elevation = dir.y * 0.5 + 0.5;
    vec3  horizon   = vec3(0.005, 0.002, 0.015);
    vec3  zenith    = vec3(0.002, 0.001, 0.008);
    vec3  sky       = mix(horizon, zenith, elevation);

    // Nebula wisps
    float n1 = noise(dir * 3.0 + vec3(time * 0.01));
    float n2 = noise(dir * 6.0 - vec3(time * 0.007));
    float neb = n1 * n2 * 0.03;

    // Star shimmer
    float star = step(0.998, hash(floor(dir * 300.0)));
    float starTwinkle = star * (0.5 + 0.5 * sin(time * hash(dir) * 20.0));

    vec3 col = sky + vec3(neb * 0.886, neb * 0.3, neb * 0.5);
    col += vec3(starTwinkle * 0.9);
    col  = linearToSRGB(col);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function HDRSkybox() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });
  return (
    <mesh scale={[-80, 80, 80]}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={skyVert}
        fragmentShader={skyFrag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Volumetric Light Shafts (أعمدة ضوء حجمية) ────────────────────────────
const lightShaftVert = `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const lightShaftFrag = `
  uniform float time;
  uniform vec3  lightColor;
  uniform float intensity;
  varying vec2  vUv;
  varying vec3  vPos;

  float noise2(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5); }
  float smoothNoise(vec2 p) {
    vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(noise2(i),noise2(i+vec2(1,0)),f.x),
               mix(noise2(i+vec2(0,1)),noise2(i+vec2(1,1)),f.x),f.y);
  }

  void main() {
    float y     = vUv.y;
    float x     = vUv.x - 0.5;
    float shaft = exp(-x*x*20.0);
    float dust  = smoothNoise(vUv * 8.0 + vec2(time * 0.05, -time * 0.1)) * 0.3;
    float fade  = y * (1.0 - y * 0.7);
    float alpha = shaft * fade * (0.3 + dust) * intensity;
    gl_FragColor = vec4(lightColor, alpha * 0.4);
  }
`;

function LightShaft({
  position, rotation, height, color, intensity,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  height: number;
  color: THREE.Color;
  intensity: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    lightColor: { value: color },
    intensity:  { value: intensity },
  }), [color, intensity]);
  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[1.2, height]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={lightShaftVert}
        fragmentShader={lightShaftFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Pulse Rings (حلقات نبضية من المركز) ──────────────────────────────────
const pulseVert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const pulseFrag = `
  uniform float time;
  uniform float delay;
  uniform float speed;
  uniform vec3  color;
  varying vec2  vUv;

  void main() {
    vec2  uv   = vUv - 0.5;
    float r    = length(uv);
    float t    = mod(time * speed + delay, 4.0);
    float ring = abs(r - t * 0.12);
    float a    = smoothstep(0.015, 0.0, ring) * (1.0 - t / 4.0) * (1.0 - t / 4.0);
    gl_FragColor = vec4(color, a * 0.6);
  }
`;

export function PulseRings({ count = 3, color }: { count?: number; color: THREE.Color }) {
  const matsRef = useRef<THREE.ShaderMaterial[]>([]);
  useFrame((state) => {
    matsRef.current.forEach(m => { if (m) m.uniforms.time.value = state.clock.elapsedTime; });
  });
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: count }, (_, i) => {
        const uniforms = {
          time:  { value: 0 },
          delay: { value: (i / count) * 4 },
          speed: { value: 0.5 + i * 0.1 },
          color: { value: color },
        };
        return (
          <mesh key={i} scale={8}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
              ref={(m) => { if (m) matsRef.current[i] = m; }}
              vertexShader={pulseVert}
              fragmentShader={pulseFrag}
              uniforms={uniforms}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Composite Global Illumination Layer ────────────────────────────────────
export function GlobalIlluminationLayer() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  const CYAN   = new THREE.Color("#00e5ff");
  const RED    = new THREE.Color("#e21227");
  const PURPLE = new THREE.Color("#7c3aed");

  return (
    <>
      {/* HDR Sky */}
      <HDRSkybox />

      {/* Volumetric light shafts */}
      {isHigh && (
        <>
          <LightShaft
            position={[4, 2, -3]}
            rotation={[0.1, 0.2, -0.1]}
            height={8}
            color={RED}
            intensity={0.5}
          />
          <LightShaft
            position={[-4, 3, -2]}
            rotation={[-0.1, -0.3, 0.15]}
            height={10}
            color={CYAN}
            intensity={0.4}
          />
          <LightShaft
            position={[1, 5, -5]}
            rotation={[0.0, 0.1, 0.0]}
            height={12}
            color={PURPLE}
            intensity={0.3}
          />
        </>
      )}

      {/* Pulse rings from scene center */}
      {isMed && (
        <>
          <PulseRings count={4} color={CYAN}   />
          <group position={[0, -0.1, 0]}>
            <PulseRings count={3} color={RED} />
          </group>
        </>
      )}
    </>
  );
}
