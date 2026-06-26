/**
 * Energy Orbs — كرات طاقة ثلاثية الأبعاد
 * كرات بلازما + توهج + أبعاد كمومية
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

const orbVert = `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec2 vUv;
  void main(){
    vNormal = normalize(normalMatrix * normal);
    vPos    = (modelViewMatrix * vec4(position,1.0)).xyz;
    vUv     = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const orbFrag = `
  uniform float time;
  uniform vec3  color;
  uniform float energy;
  varying vec3  vNormal;
  varying vec3  vPos;
  varying vec2  vUv;

  float noise(vec3 p){
    return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5);
  }
  float smoothNoise(vec3 p){
    vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(noise(i),noise(i+vec3(1,0,0)),f.x),mix(noise(i+vec3(0,1,0)),noise(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(noise(i+vec3(0,0,1)),noise(i+vec3(1,0,1)),f.x),mix(noise(i+vec3(0,1,1)),noise(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){v+=a*smoothNoise(p);p=p*2.1;a*=0.5;} return v; }

  void main(){
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vPos);
    float fresnel = pow(1.0 - abs(dot(N, V)), 2.5);

    // Plasma surface
    vec3 p = vPos * 2.0 + vec3(time * 0.3);
    float plasma = fbm(p);
    plasma = smoothstep(0.3, 0.7, plasma);

    // Energy pulse rings
    float uvRadius = length(vUv - 0.5);
    float pulse = sin(uvRadius * 20.0 - time * 3.0) * 0.5 + 0.5;
    pulse = smoothstep(0.4, 0.6, pulse) * energy;

    vec3 col = color * (plasma * 0.6 + 0.4);
    col += color * fresnel * 1.5;
    col += color * pulse * 0.5;

    float a = fresnel * 0.7 + plasma * 0.3 + pulse * 0.2 + 0.15;
    gl_FragColor = vec4(col, a * energy);
  }
`;

// Glow halo around orb
const haloVert = `
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const haloFrag = `
  uniform vec3  color;
  uniform float intensity;
  varying vec2  vUv;
  void main(){
    vec2  uv = vUv - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float a  = (1.0 - d * 2.0) * (1.0 - d * 2.0) * intensity * 0.6;
    gl_FragColor = vec4(color, a);
  }
`;

function EnergyOrb({
  position, color, radius = 0.35, energy = 1.0,
}: {
  position: [number, number, number];
  color: THREE.Color;
  radius?: number;
  energy?: number;
}) {
  const meshRef  = useRef<THREE.Mesh>(null);
  const haloRef  = useRef<THREE.Mesh>(null);
  const matRef   = useRef<THREE.ShaderMaterial>(null);
  const hMatRef  = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useRef<any>({ camera: null }).current ?? {};

  const orbUniforms = useMemo(() => ({
    time:   { value: 0 },
    color:  { value: color },
    energy: { value: energy },
  }), [color, energy]);

  const haloUniforms = useMemo(() => ({
    color:     { value: color },
    intensity: { value: 0.8 },
  }), [color]);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.uniforms.time.value = t;

    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.007;
      const pulse = 1 + Math.sin(t * 2 + position[0]) * 0.05;
      meshRef.current.scale.setScalar(radius * pulse);
    }
    if (haloRef.current) {
      haloRef.current.quaternion.copy(state.camera.quaternion);
      const hPulse = 1 + Math.sin(t * 1.5 + position[0] * 0.5) * 0.15;
      haloRef.current.scale.setScalar(radius * 3.5 * hPulse);
    }
    if (hMatRef.current) {
      hMatRef.current.uniforms.intensity.value = 0.5 + Math.sin(t * 2) * 0.2;
    }
  });

  return (
    <group position={position}>
      {/* Core orb */}
      <mesh ref={meshRef} scale={radius}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={orbVert}
          fragmentShader={orbFrag}
          uniforms={orbUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Glow halo (billboard) */}
      <mesh ref={haloRef} scale={radius * 3.5}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={hMatRef}
          vertexShader={haloVert}
          fragmentShader={haloFrag}
          uniforms={haloUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ── Energy Arc Between Orbs ────────────────────────────────────────────────
const arcVert = `
  attribute float arcT;
  varying   float vArcT;
  uniform   float time;
  uniform   vec3  posA;
  uniform   vec3  posB;

  void main(){
    vArcT = arcT;
    // Quadratic Bezier: A → mid → B
    vec3 mid = mix(posA, posB, 0.5);
    mid.y += 1.5; // arc height

    float t  = arcT;
    vec3 pos = (1.0-t)*(1.0-t)*posA + 2.0*(1.0-t)*t*mid + t*t*posB;

    // Jitter for lightning effect
    float jitter = sin(arcT * 30.0 + time * 15.0) * 0.05;
    pos.x += jitter;
    pos.y += jitter * 0.5;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const arcFrag = `
  varying float vArcT;
  uniform vec3  colorA;
  uniform vec3  colorB;
  uniform float time;
  void main(){
    vec3  col = mix(colorA, colorB, vArcT);
    float flicker = 0.4 + 0.6 * fract(sin(time * 50.3 + vArcT * 20.0) * 43758.5);
    float a = sin(vArcT * 3.14159) * flicker * 0.7;
    gl_FragColor = vec4(col, a);
  }
`;

function EnergyArc({
  from, to, colorA, colorB,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  colorA: THREE.Color;
  colorB: THREE.Color;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const SEGMENTS = 40;
  const arcT = useMemo(() => {
    const arr = new Float32Array(SEGMENTS + 1);
    for (let i = 0; i <= SEGMENTS; i++) arr[i] = i / SEGMENTS;
    return arr;
  }, []);
  const pos = useMemo(() => new Float32Array((SEGMENTS + 1) * 3), []);

  const uniforms = useMemo(() => ({
    time:   { value: 0 },
    posA:   { value: from },
    posB:   { value: to },
    colorA: { value: colorA },
    colorB: { value: colorB },
  }), [from, to, colorA, colorB]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <line_>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} count={SEGMENTS + 1} />
        <bufferAttribute attach="attributes-arcT"     args={[arcT, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={arcVert}
        fragmentShader={arcFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </line_>
  );
}

// ── Composite Energy Layer ─────────────────────────────────────────────────
export function EnergyOrbsLayer() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  const CYAN   = new THREE.Color("#00e5ff");
  const RED    = new THREE.Color("#e21227");
  const PURPLE = new THREE.Color("#7c3aed");
  const GOLD   = new THREE.Color("#f59e0b");

  const orbDefs = [
    { pos: [-4,  1.5, -1] as [number,number,number], color: RED,    radius: 0.4  },
    { pos: [ 4, -1.5, -1] as [number,number,number], color: CYAN,   radius: 0.35 },
    { pos: [ 0,  3.5, -2] as [number,number,number], color: PURPLE, radius: 0.3  },
    ...(isMed ? [
      { pos: [-2, -2, 1]  as [number,number,number], color: GOLD,   radius: 0.25 },
      { pos: [ 3,  2, 1]  as [number,number,number], color: CYAN,   radius: 0.28 },
    ] : []),
    ...(isHigh ? [
      { pos: [-6, -1, -3] as [number,number,number], color: RED,    radius: 0.2  },
      { pos: [ 6,  2, -3] as [number,number,number], color: PURPLE, radius: 0.22 },
    ] : []),
  ];

  return (
    <>
      {orbDefs.map((orb, i) => (
        <EnergyOrb key={i} position={orb.pos} color={orb.color} radius={orb.radius} />
      ))}

      {/* Energy arcs between pairs */}
      {isHigh && orbDefs.length >= 2 && (
        <>
          <EnergyArc
            from={new THREE.Vector3(...orbDefs[0].pos)}
            to={new THREE.Vector3(...orbDefs[1].pos)}
            colorA={RED}
            colorB={CYAN}
          />
          <EnergyArc
            from={new THREE.Vector3(...orbDefs[1].pos)}
            to={new THREE.Vector3(...orbDefs[2].pos)}
            colorA={CYAN}
            colorB={PURPLE}
          />
        </>
      )}
    </>
  );
}
