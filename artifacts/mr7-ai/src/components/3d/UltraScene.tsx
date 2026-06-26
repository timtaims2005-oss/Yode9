/**
 * UltraScene — محرك الرسومات فائق الجودة
 * Ray Marching + PBR + Bloom + Rain + Smoke + VR Support
 */
import { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stats, AdaptiveDpr, AdaptiveEvents } from "@react-three/drei";
import * as THREE from "three";
import {
  rayMarchVertexShader,
  rayMarchFragmentShader,
  smokeVertexShader,
  smokeFragmentShader,
  rainVertexShader,
  rainFragmentShader,
  chromeVertexShader,
  chromeFragmentShader,
  pbrFragmentShader,
  ultraVertexShader,
} from "../../lib/ultra-shaders";
import { getQualityLevel } from "../../lib/adaptive-quality";
import { GlobalIlluminationLayer } from "./GlobalIllumination";
import { PhotorealisticParticles } from "./PhotorealisticParticles";

const PRIMARY   = new THREE.Color("#e21227");
const SECONDARY = new THREE.Color("#00e5ff");
const ACCENT    = new THREE.Color("#7c3aed");

// ── Ray Marching Scene (الكرة الرئيسية بتتبع الأشعة) ──────────────────────
function RayMarchCore() {
  const meshRef  = useRef<THREE.Mesh>(null);
  const matRef   = useRef<THREE.ShaderMaterial>(null);
  const { size, camera } = useThree();

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    resolution: { value: new THREE.Vector2(size.width, size.height) },
    cameraPos:  { value: new THREE.Vector3(0, 0, 5) },
    quality:    { value: 1.0 },
  }), [size.width, size.height]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    matRef.current.uniforms.cameraPos.value.copy(state.camera.position);
    matRef.current.uniforms.resolution.value.set(size.width, size.height);
  });

  return (
    <mesh ref={meshRef} scale={3}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={rayMarchVertexShader}
        fragmentShader={rayMarchFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ── PBR Metallic Sphere ────────────────────────────────────────────────────
function PBRSphere({ position, color, metalness = 0.9, roughness = 0.1 }: {
  position: [number, number, number];
  color: THREE.Color;
  metalness?: number;
  roughness?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({
    time:            { value: 0 },
    baseColor:       { value: color },
    metalness:       { value: metalness },
    roughness:       { value: roughness },
    emissiveStrength:{ value: 0.3 },
    lightPos:        { value: [
      new THREE.Vector3(5, 5, 5),
      new THREE.Vector3(-5, 3, -3),
      new THREE.Vector3(0, -5, 5),
      new THREE.Vector3(3, 0, -5),
    ]},
    lightColor: { value: [
      new THREE.Vector3(1.0, 0.9, 0.8),
      new THREE.Vector3(0.0, 0.898, 1.0),
      new THREE.Vector3(0.886, 0.071, 0.153),
      new THREE.Vector3(0.5, 0.0, 1.0),
    ]},
  }), [color, metalness, roughness]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.5, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={ultraVertexShader}
        fragmentShader={pbrFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// ── Chrome / Mirror Object ─────────────────────────────────────────────────
function ChromeObject({ position }: { position: [number, number, number] }) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.008;
      meshRef.current.rotation.z += 0.004;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusKnotGeometry args={[0.4, 0.15, 128, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={chromeVertexShader}
        fragmentShader={chromeFragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}

// ── Rain System ────────────────────────────────────────────────────────────
function RainSystem({ count = 3000 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef    = useRef<THREE.ShaderMaterial>(null);

  const { positions, speeds, opacities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds    = new Float32Array(count);
    const opacities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20 + 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      speeds[i]    = 0.5 + Math.random() * 1.5;
      opacities[i] = 0.3 + Math.random() * 0.7;
    }
    return { positions, speeds, opacities };
  }, [count]);

  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-speed"    args={[speeds, 1]} />
        <bufferAttribute attach="attributes-opacity"  args={[opacities, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={rainVertexShader}
        fragmentShader={rainFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Volumetric Smoke System ────────────────────────────────────────────────
function SmokeSystem({ count = 200 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef    = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const lives     = new Float32Array(count);
    const colors    = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.5;
      positions[i * 3]     = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.random() * 4 - 2;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      sizes[i]  = 0.3 + Math.random() * 0.7;
      lives[i]  = Math.random();
      const t = Math.random();
      colors[i * 3]     = 0.886 * (1 - t);
      colors[i * 3 + 1] = 0.071 * (1 - t) + 0.898 * t;
      colors[i * 3 + 2] = 0.153 * (1 - t) + 1.0 * t;
    }
    return { positions, sizes, lives, colors };
  }, [count]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: window.devicePixelRatio },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.001;
    }
    // animate lives
    const lifeAttr = pointsRef.current?.geometry.attributes.life as THREE.BufferAttribute;
    if (lifeAttr) {
      const arr = lifeAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i] += 0.002;
        if (arr[i] > 1) arr[i] = 0;
      }
      lifeAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} position={[0, -2, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-size"     args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-life"     args={[data.lives, 1]} />
        <bufferAttribute attach="attributes-color"    args={[data.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={smokeVertexShader}
        fragmentShader={smokeFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Neural Network (محسّن) ─────────────────────────────────────────────────
const NODE_COUNT = 80;

function NeuralNetworkUltra() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef  = useRef<THREE.LineSegments>(null);

  const { positions, velocities } = useMemo(() => {
    const positions  = new Float32Array(NODE_COUNT * 3);
    const velocities = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      const i3 = i * 3;
      const r = 3 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      positions[i3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3+2] = r * Math.cos(phi);
      velocities[i3]   = (Math.random() - 0.5) * 0.004;
      velocities[i3+1] = (Math.random() - 0.5) * 0.004;
      velocities[i3+2] = (Math.random() - 0.5) * 0.004;
    }
    return { positions, velocities };
  }, []);

  const maxPairs = NODE_COUNT * (NODE_COUNT - 1) / 2;
  const linePosArr = useMemo(() => new Float32Array(maxPairs * 6), [maxPairs]);
  const lineColArr = useMemo(() => new Float32Array(maxPairs * 6), [maxPairs]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const geo  = pointsRef.current.geometry;
    const attr = geo.attributes.position as THREE.BufferAttribute;
    const pos  = attr.array as Float32Array;
    const t    = state.clock.elapsedTime;

    for (let i = 0; i < NODE_COUNT; i++) {
      const i3 = i * 3;
      pos[i3]   += velocities[i3];
      pos[i3+1] += velocities[i3+1];
      pos[i3+2] += velocities[i3+2];
      if (Math.abs(pos[i3])   > 6) velocities[i3]   *= -1;
      if (Math.abs(pos[i3+1]) > 6) velocities[i3+1] *= -1;
      if (Math.abs(pos[i3+2]) > 6) velocities[i3+2] *= -1;
    }
    attr.needsUpdate = true;

    if (!linesRef.current) return;
    const lGeo = linesRef.current.geometry;
    let li = 0, ci = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const i3 = i * 3, j3 = j * 3;
        const dx = pos[i3] - pos[j3], dy = pos[i3+1] - pos[j3+1], dz = pos[i3+2] - pos[j3+2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < 3.5) {
          const a = 1 - dist / 3.5;
          const pulse = (Math.sin(t * 3 + i * 0.2) + 1) * 0.5;
          linePosArr[li] = pos[i3];   linePosArr[li+1] = pos[i3+1]; linePosArr[li+2] = pos[i3+2];
          linePosArr[li+3] = pos[j3]; linePosArr[li+4] = pos[j3+1]; linePosArr[li+5] = pos[j3+2];
          const r = a * (0.88 + pulse * 0.12), g = a * 0.07, b = a * (0.15 + pulse * 0.85);
          lineColArr[ci] = r; lineColArr[ci+1] = g; lineColArr[ci+2] = b;
          lineColArr[ci+3] = r; lineColArr[ci+4] = g; lineColArr[ci+5] = b;
          li += 6; ci += 6;
        }
      }
    }
    (lGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (lGeo.attributes.color    as THREE.BufferAttribute).needsUpdate = true;
    lGeo.setDrawRange(0, li / 3);
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#00e5ff"
          size={0.06}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePosArr, 3]} count={maxPairs * 2} />
          <bufferAttribute attach="attributes-color"    args={[lineColArr, 3]} count={maxPairs * 2} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.5} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

// ── Orbit Rings (حلقات ثلاثية الأبعاد) ────────────────────────────────────
function OrbitalRings() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.3;
  });

  return (
    <group ref={groupRef}>
      {[2.5, 3.5, 5.0, 6.5].map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.4, i * 0.7, i * 0.3]}>
          <torusGeometry args={[r, 0.015, 16, 128]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? PRIMARY : (i % 3 === 0 ? ACCENT : SECONDARY)}
            transparent
            opacity={0.25 - i * 0.03}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Environment Lighting ───────────────────────────────────────────────────
function Lighting() {
  const light1 = useRef<THREE.PointLight>(null);
  const light2 = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (light1.current) {
      light1.current.position.x = Math.sin(t * 0.5) * 6;
      light1.current.position.z = Math.cos(t * 0.5) * 6;
      light1.current.intensity  = 1.5 + Math.sin(t * 2) * 0.5;
    }
    if (light2.current) {
      light2.current.position.x = Math.sin(t * 0.3 + Math.PI) * 5;
      light2.current.position.z = Math.cos(t * 0.3 + Math.PI) * 5;
      light2.current.intensity  = 1.0 + Math.cos(t * 1.5) * 0.3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight ref={light1} position={[6, 4, 6]}  color="#e21227" intensity={1.5} distance={20} />
      <pointLight ref={light2} position={[-5, -3, -5]} color="#00e5ff" intensity={1.0} distance={20} />
      <pointLight position={[0, 8, 0]} color="#7c3aed" intensity={0.8} distance={15} />
      <directionalLight position={[3, 5, 3]} intensity={0.4} color="#ffffff" />
    </>
  );
}

// ── FPS Display ────────────────────────────────────────────────────────────
function FPSMeter() {
  const { gl } = useThree();
  useFrame(() => {});
  return null;
}

// ── Main Ultra Scene ───────────────────────────────────────────────────────
export function UltraScene({ showStats = false }: { showStats?: boolean }) {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  const rainCount  = isHigh ? 4000 : isMed ? 2000 : 800;
  const smokeCount = isHigh ? 300  : isMed ? 150  : 60;

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 55, near: 0.1, far: 100 }}
        dpr={[1, isHigh ? 2 : 1.5]}
        gl={{
          antialias:        isHigh,
          alpha:            true,
          powerPreference:  "high-performance",
          stencil:          false,
          depth:            true,
          logarithmicDepthBuffer: isHigh,
        }}
        shadows={isHigh}
      >
        <color attach="background" args={["#050508"]} />
        <fog attach="fog" args={["#050508", 12, 30]} />

        <Lighting />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />

        <Suspense fallback={null}>
          {/* الكرة الرئيسية بتتبع الأشعة */}
          <RayMarchCore />

          {/* كرات PBR معدنية */}
          <PBRSphere position={[-4, 1.5, -1]} color={PRIMARY}   metalness={0.9} roughness={0.05} />
          <PBRSphere position={[4, -1.5, -1]} color={SECONDARY}  metalness={0.8} roughness={0.1} />
          <PBRSphere position={[0, 3.5, -2]}  color={ACCENT}     metalness={0.95} roughness={0.02} />

          {/* Chrome / Mirror objects */}
          {isHigh && <ChromeObject position={[-3, -2, 1]} />}
          {isMed  && <ChromeObject position={[3, 2, 1]}  />}

          {/* الشبكة العصبية */}
          <NeuralNetworkUltra />

          {/* حلقات مدارية */}
          <OrbitalRings />

          {/* مطر */}
          {isMed && <RainSystem count={rainCount} />}

          {/* دخان حجمي */}
          {isMed && <SmokeSystem count={smokeCount} />}

          {/* إضاءة عالمية + سماء HDR */}
          <GlobalIlluminationLayer />

          {/* جسيمات فوتوريالية */}
          <PhotorealisticParticles />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
          autoRotate
          autoRotateSpeed={0.15}
        />

        {showStats && <Stats />}
      </Canvas>
    </div>
  );
}
