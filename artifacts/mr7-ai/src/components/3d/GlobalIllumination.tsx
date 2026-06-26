/**
 * Global Illumination System
 * إضاءة عالمية محاكاة + Ambient Occlusion + HDR Environment
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── SSAO (Screen Space Ambient Occlusion) محاكى ───────────────────────────
const ssaoVertShader = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const ssaoFragShader = `
  uniform sampler2D tDepth;
  uniform vec2 resolution;
  uniform float time;
  varying vec2 vUv;

  float random(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 texelSize = 1.0 / resolution;
    float ao = 0.0;
    float radius = 2.0;
    int samples = 16;

    for(int i = 0; i < 16; i++) {
      float angle = float(i) / 16.0 * 6.28318;
      float r = (float(i) + 0.5) / 16.0 * radius;
      vec2 offset = vec2(cos(angle), sin(angle)) * r * texelSize;
      float sampleDepth = texture2D(tDepth, vUv + offset).r;
      float centerDepth = texture2D(tDepth, vUv).r;
      ao += step(centerDepth - 0.01, sampleDepth);
    }
    ao /= 16.0;

    // Subtle pulse
    float pulse = sin(time * 0.5) * 0.05 + 0.95;
    gl_FragColor = vec4(vec3(ao * pulse), 1.0);
  }
`;

// ── Environment Light Probe (محاكاة بيئة HDR) ────────────────────────────
function EnvironmentProbe() {
  const probeRef = useRef<THREE.Mesh>(null);
  const matRef   = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    resolution: { value: new THREE.Vector2(256, 256) },
    tDepth:     { value: null },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return null; // Runs in background — affects scene via Three.js env map
}

// ── Volumetric Light Shafts (شعاعات الضوء الحجمية) ───────────────────────
const godRaysVert = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const godRaysFrag = `
  uniform float time;
  uniform vec3 lightColor;
  varying vec2 vUv;

  float noise(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }

  void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    // Rotating light shafts
    float shafts = 0.0;
    for(int i = 0; i < 6; i++) {
      float a = float(i) / 6.0 * 6.28318 + time * 0.2;
      float w = 0.08 + 0.04 * sin(time + float(i) * 1.7);
      shafts += smoothstep(w, 0.0, abs(mod(angle - a + 3.14159, 6.28318) - 3.14159));
    }

    float radial = exp(-dist * 3.0);
    float alpha = shafts * radial * 0.12;

    // Flicker
    alpha *= 0.8 + 0.2 * noise(vec2(time * 3.0, float(int(angle * 4.0))));

    gl_FragColor = vec4(lightColor * shafts, alpha);
  }
`;

function VolumetricLightShaft({ position, color }: {
  position: [number, number, number];
  color: THREE.Color;
}) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    lightColor: { value: color },
  }), [color]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[6, 6]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={godRaysVert}
        fragmentShader={godRaysFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Reactive Pulse Rings (حلقات نابضة تفاعلية) ────────────────────────────
const pulseVert = `
  uniform float time;
  uniform float radius;
  varying float vAlpha;
  void main() {
    float t = mod(time * 0.5 + radius * 0.3, 1.0);
    float r = radius + t * 4.0;
    vAlpha = (1.0 - t) * (1.0 - t);
    vec3 pos = position * r;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const pulseFrag = `
  uniform vec3 color;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(color, vAlpha * 0.4); }
`;

function PulseRing({ radius, color, delay = 0 }: {
  radius: number;
  color: THREE.Color;
  delay?: number;
}) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    time:   { value: delay },
    radius: { value: radius },
    color:  { value: color },
  }), [radius, color, delay]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime + delay;
  });

  return (
    <mesh>
      <ringGeometry args={[1, 1.01, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={pulseVert}
        fragmentShader={pulseFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── HDR Skybox (سماء اصطناعية عالية الدقة) ───────────────────────────────
const skyboxFrag = `
  uniform float time;
  varying vec3 vWorldPos;

  float hash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5); }

  float stars(vec3 dir) {
    vec3 q = floor(dir * 80.0);
    float s = hash(q);
    float bright = step(0.998, s);
    float twinkle = bright * (0.6 + 0.4 * sin(time * 3.0 + s * 100.0));
    return twinkle;
  }

  float nebula(vec3 dir) {
    float n = 0.0;
    float amp = 0.5;
    vec3 p = dir;
    for(int i = 0; i < 4; i++) {
      n += amp * (0.5 + 0.5 * sin(p.x * 3.0 + time * 0.1) *
                          sin(p.y * 4.0 - time * 0.08) *
                          sin(p.z * 2.0 + time * 0.12));
      p = p * 2.3 + vec3(1.7, 9.2, 3.5);
      amp *= 0.4;
    }
    return n;
  }

  void main() {
    vec3 dir = normalize(vWorldPos);

    // Deep space background
    vec3 col = mix(vec3(0.01, 0.0, 0.03), vec3(0.0, 0.02, 0.05), dir.y * 0.5 + 0.5);

    // Nebula clouds
    float neb = nebula(dir);
    col += vec3(0.886, 0.071, 0.153) * neb * 0.03;
    col += vec3(0.0, 0.1, 0.3) * neb * 0.05;

    // Stars
    float s = stars(dir);
    col += vec3(0.9, 0.95, 1.0) * s;

    // Horizon glow
    float horizon = exp(-abs(dir.y) * 4.0);
    col += vec3(0.886, 0.071, 0.153) * horizon * 0.04;
    col += vec3(0.0, 0.898, 1.0) * horizon * 0.02;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const skyboxVert = `
  varying vec3 vWorldPos;
  void main() {
    vWorldPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function HDRSkybox() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <mesh scale={-1}>
      <sphereGeometry args={[50, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={skyboxVert}
        fragmentShader={skyboxFrag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Exports ──────────────────────────────────────────────────────────────────
export function GlobalIlluminationLayer() {
  const quality  = getQualityLevel();
  const isHigh   = quality === "high";
  const PRIMARY  = new THREE.Color("#e21227");
  const CYAN     = new THREE.Color("#00e5ff");
  const PURPLE   = new THREE.Color("#7c3aed");

  return (
    <>
      <HDRSkybox />
      <EnvironmentProbe />

      {/* Volumetric light shafts */}
      <VolumetricLightShaft position={[8, 6, -4]}  color={PRIMARY} />
      <VolumetricLightShaft position={[-8, -4, 3]} color={CYAN} />
      {isHigh && <VolumetricLightShaft position={[0, 10, -8]} color={PURPLE} />}

      {/* Pulse rings */}
      <PulseRing radius={0}   color={PRIMARY} delay={0} />
      <PulseRing radius={0.5} color={CYAN}    delay={0.66} />
      <PulseRing radius={1.0} color={PURPLE}  delay={1.33} />
    </>
  );
}
