/**
 * UltraScene5D — محرك الرسومات فائق الجودة خماسي الأبعاد
 * 5 أبعاد: XYZ + الطور الزمني 4D + مجال الوعي الكمومي 5D
 * تتبع الأشعة 5D + PBR + Bloom + فيزياء خماسية + VR
 */
import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, AdaptiveDpr, AdaptiveEvents } from "@react-three/drei";
import * as THREE from "three";
import { rayMarch5DFragment, rayMarch5DVertex } from "../../lib/hyper-shaders-5d";
import { getQualityLevel } from "../../lib/adaptive-quality";
import { HyperspaceCore5D } from "./HyperspaceCore5D";
import { DimensionalRift5D } from "./DimensionalRift5D";
import { ConsciousnessField5D } from "./ConsciousnessField5D";
import { QuantumFoam5D, SpacetimeBubbles5D } from "./QuantumFoam5D";
import { GlobalIlluminationLayer } from "./GlobalIllumination";
import { PhotorealisticParticles } from "./PhotorealisticParticles";
import { PhysicsLayer } from "./PhysicsSystem";
import { WeatherLayer } from "./WeatherEffects";
import { NeuralBrain } from "./NeuralBrainVisualization";
import { TerrainLayer } from "./CyberTerrain";
import { SpaceEnvironmentLayer } from "./SpaceEnvironment";
import { QuantumCoreLayer } from "./QuantumCore";
import { CrystalArray } from "./CrystallineGeometry";
import { DigitalDNA, Radar3D, LiveGraph } from "./DataVisualization3D";
import { MatrixRain5D } from "./MatrixRain5D";
import { EnergyOrbs5D } from "./EnergyOrbs5D";
import { SpaceEnvironment5D } from "./SpaceEnvironment5D";
import { HolographicHUD5D } from "./HolographicHUD5D";

// ── ألوان نظام 5D ────────────────────────────────────────────────────────────
const DIM1_COLOR = new THREE.Color("#e21227"); // البُعد 1: أحمر (X)
const DIM2_COLOR = new THREE.Color("#00e5ff"); // البُعد 2: سيان (Y)
const DIM3_COLOR = new THREE.Color("#7c3aed"); // البُعد 3: بنفسجي (Z)
const DIM4_COLOR = new THREE.Color("#ff6600"); // البُعد 4: برتقالي (W/الزمن)
const DIM5_COLOR = new THREE.Color("#ff0080"); // البُعد 5: وردي (الوعي)

// ── محرك تتبع الأشعة 5D ─────────────────────────────────────────────────────
function RayMarch5DCore() {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, camera } = useThree();

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    resolution: { value: new THREE.Vector2(size.width, size.height) },
    cameraPos:  { value: new THREE.Vector3(0, 0, 8) },
    dim4Angle:  { value: 0.6 },
    dim5Field:  { value: 0.5 },
  }), [size.width, size.height]);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.uniforms.time.value      = t;
    matRef.current.uniforms.cameraPos.value.copy(state.camera.position);
    matRef.current.uniforms.resolution.value.set(size.width, size.height);
    // البُعد الرابع يتذبذب
    matRef.current.uniforms.dim4Angle.value = 0.5 + 0.4 * Math.sin(t * 0.25);
    // البُعد الخامس يتنفس
    matRef.current.uniforms.dim5Field.value = 0.4 + 0.35 * Math.sin(t * 0.18);
  });

  return (
    <mesh ref={meshRef} scale={3.2}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={rayMarch5DVertex}
        fragmentShader={rayMarch5DFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ── شبكة عصبية فائقة 5D ─────────────────────────────────────────────────────
const NEURAL_COUNT = 120;

function NeuralNetwork5D() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef  = useRef<THREE.LineSegments>(null);

  const { positions, velocities, w4Data, v5Data } = useMemo(() => {
    const positions  = new Float32Array(NEURAL_COUNT * 3);
    const velocities = new Float32Array(NEURAL_COUNT * 3);
    const w4Data     = new Float32Array(NEURAL_COUNT);
    const v5Data     = new Float32Array(NEURAL_COUNT);

    for (let i = 0; i < NEURAL_COUNT; i++) {
      const i3 = i * 3;
      const r  = 3.5 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      positions[i3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3+2] = r * Math.cos(phi);
      velocities[i3]   = (Math.random() - 0.5) * 0.005;
      velocities[i3+1] = (Math.random() - 0.5) * 0.005;
      velocities[i3+2] = (Math.random() - 0.5) * 0.005;
      w4Data[i] = Math.random() * 2 - 1;
      v5Data[i] = Math.random() * 2 - 1;
    }
    return { positions, velocities, w4Data, v5Data };
  }, []);

  const maxPairs   = NEURAL_COUNT * (NEURAL_COUNT - 1) / 2;
  const linePosArr = useMemo(() => new Float32Array(maxPairs * 6), [maxPairs]);
  const lineColArr = useMemo(() => new Float32Array(maxPairs * 6), [maxPairs]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const geo  = pointsRef.current.geometry;
    const attr = geo.attributes.position as THREE.BufferAttribute;
    const pos  = attr.array as Float32Array;
    const t    = state.clock.elapsedTime;

    for (let i = 0; i < NEURAL_COUNT; i++) {
      const i3 = i * 3;
      pos[i3]   += velocities[i3];
      pos[i3+1] += velocities[i3+1];
      pos[i3+2] += velocities[i3+2];
      if (Math.abs(pos[i3])   > 7) velocities[i3]   *= -1;
      if (Math.abs(pos[i3+1]) > 7) velocities[i3+1] *= -1;
      if (Math.abs(pos[i3+2]) > 7) velocities[i3+2] *= -1;

      // البُعد الرابع يؤثر على موضع النقاط
      const w4 = w4Data[i] * Math.sin(t * 0.4 + i * 0.1);
      const v5 = v5Data[i] * Math.cos(t * 0.3 + i * 0.15);
      const scale4D = 2.5 / (2.5 - w4 * 0.3);
      pos[i3]   *= scale4D;
      pos[i3+1] *= scale4D;
      // البُعد الخامس: موجة الوعي
      pos[i3]   += Math.sin(pos[i3+1] * 2.0 + t * 0.5) * v5 * 0.1;
      pos[i3+1] += Math.cos(pos[i3]   * 2.0 - t * 0.4) * v5 * 0.1;
    }
    attr.needsUpdate = true;

    if (!linesRef.current) return;
    const lGeo = linesRef.current.geometry;
    let li = 0, ci = 0;

    for (let i = 0; i < NEURAL_COUNT; i++) {
      for (let j = i + 1; j < NEURAL_COUNT; j++) {
        const i3 = i * 3, j3 = j * 3;
        const dx = pos[i3] - pos[j3];
        const dy = pos[i3+1] - pos[j3+1];
        const dz = pos[i3+2] - pos[j3+2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        if (dist < 4.0) {
          const a     = 1 - dist / 4.0;
          const pulse = (Math.sin(t * 3.5 + i * 0.2) + 1) * 0.5;
          // ألوان 5D للاتصالات
          const v5blend = (v5Data[i] + v5Data[j]) * 0.5;
          const r = a * (0.88 + pulse * 0.12 + Math.abs(v5blend) * 0.1);
          const g = a * (0.07 + pulse * 0.15);
          const b = a * (0.15 + pulse * 0.85 + Math.abs(w4Data[i]) * 0.15);

          linePosArr[li]   = pos[i3];   linePosArr[li+1] = pos[i3+1]; linePosArr[li+2] = pos[i3+2];
          linePosArr[li+3] = pos[j3];   linePosArr[li+4] = pos[j3+1]; linePosArr[li+5] = pos[j3+2];
          lineColArr[ci]   = r; lineColArr[ci+1] = g; lineColArr[ci+2] = b;
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
          size={0.07}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePosArr, 3]} count={maxPairs * 2} />
          <bufferAttribute attach="attributes-color"    args={[lineColArr, 3]} count={maxPairs * 2} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.45} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

// ── حلقات مدارية خماسية ─────────────────────────────────────────────────────
function OrbitalRings5D() {
  const groupRef = useRef<THREE.Group>(null);

  const rings = useMemo(() => [
    { r: 2.5,  tube: 0.018, color: DIM1_COLOR, ax: 0.4, az: 0.3 },
    { r: 3.5,  tube: 0.014, color: DIM2_COLOR, ax: 0.7, az: 1.1 },
    { r: 4.8,  tube: 0.012, color: DIM3_COLOR, ax: 1.2, az: 0.7 },
    { r: 6.2,  tube: 0.010, color: DIM4_COLOR, ax: 1.8, az: 1.5 },
    { r: 7.8,  tube: 0.008, color: DIM5_COLOR, ax: 2.1, az: 0.9 },
  ], []);

  const ringRefs = rings.map(() => useRef<THREE.Mesh>(null));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.06;
      groupRef.current.rotation.x = Math.sin(t * 0.09) * 0.28;
    }
    ringRefs.forEach((ref, i) => {
      if (!ref.current) return;
      // دوران كل حلقة بسرعة مختلفة (تمثيل كل بُعد)
      ref.current.rotation.z = t * (0.05 + i * 0.015);
      ref.current.rotation.x = t * (0.03 + i * 0.012) + rings[i].ax;
      // نبضة البُعد الخامس
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.12 + 0.1 * Math.sin(t * (0.8 + i * 0.2) + i * Math.PI * 0.4);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          ref={ringRefs[i]}
          rotation={[Math.PI / 2 + ring.ax, i * 0.5, ring.az]}
        >
          <torusGeometry args={[ring.r, ring.tube, 16, 256]} />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── كرات PBR خماسية ─────────────────────────────────────────────────────────
function PBRSpheres5D() {
  const refs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.forEach((ref, i) => {
      if (!ref.current) return;
      ref.current.rotation.y += 0.004 + i * 0.001;
      ref.current.rotation.x  = Math.sin(t * (0.3 + i * 0.1)) * 0.25;
      // البُعد الخامس: نبض الحجم
      const v5 = Math.sin(t * 0.7 + i * 2.1) * 0.15;
      ref.current.scale.setScalar(1.0 + v5);
    });
  });

  const configs = [
    { pos: [-4, 1.5, -1] as [number,number,number],  color: "#e21227", metal: 0.9,  rough: 0.05 },
    { pos: [4,  -1.5, -1] as [number,number,number], color: "#00e5ff", metal: 0.85, rough: 0.1  },
    { pos: [0,  3.5, -2]  as [number,number,number], color: "#7c3aed", metal: 0.95, rough: 0.02 },
  ];

  return (
    <>
      {configs.map((cfg, i) => (
        <mesh key={i} ref={refs[i]} position={cfg.pos}>
          <sphereGeometry args={[0.55, 64, 64]} />
          <meshStandardMaterial
            color={cfg.color}
            metalness={cfg.metal}
            roughness={cfg.rough}
            emissive={cfg.color}
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
    </>
  );
}

// ── إضاءة 5D ────────────────────────────────────────────────────────────────
function Lighting5D() {
  const lights = [
    useRef<THREE.PointLight>(null),
    useRef<THREE.PointLight>(null),
    useRef<THREE.PointLight>(null),
    useRef<THREE.PointLight>(null),
    useRef<THREE.PointLight>(null),
  ];

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // 5 مصابيح — واحدة لكل بُعد
    if (lights[0].current) {
      lights[0].current.position.set(Math.sin(t * 0.5) * 7, 4, Math.cos(t * 0.5) * 7);
      lights[0].current.intensity = 1.5 + Math.sin(t * 2.0) * 0.5;
    }
    if (lights[1].current) {
      lights[1].current.position.set(Math.sin(t * 0.3 + Math.PI) * 6, -3, Math.cos(t * 0.3) * 6);
      lights[1].current.intensity = 1.0 + Math.cos(t * 1.5) * 0.3;
    }
    if (lights[2].current) {
      lights[2].current.position.set(Math.cos(t * 0.4 + 1) * 5, Math.sin(t * 0.6) * 4, 3);
      lights[2].current.intensity = 0.8 + Math.sin(t * 1.8) * 0.3;
    }
    // البُعد الرابع: ضوء يتذبذب
    if (lights[3].current) {
      lights[3].current.position.set(
        Math.sin(t * 0.7 + 2) * 4,
        Math.cos(t * 0.5 + 1) * 3,
        Math.sin(t * 0.9) * 5,
      );
      lights[3].current.intensity = 0.6 + 0.4 * Math.sin(t * 3.0);
    }
    // البُعد الخامس: ضوء الوعي (يدور في دائرة مزدوجة)
    if (lights[4].current) {
      lights[4].current.position.set(
        Math.sin(t * 0.35) * Math.cos(t * 0.2) * 6,
        Math.sin(t * 0.55) * 3,
        Math.cos(t * 0.35) * Math.sin(t * 0.2) * 6,
      );
      lights[4].current.intensity = 0.5 + 0.5 * Math.sin(t * 0.9);
    }
  });

  return (
    <>
      <ambientLight intensity={0.12} />
      <pointLight ref={lights[0]} position={[7, 4, 7]}   color="#e21227" intensity={1.5} distance={22} />
      <pointLight ref={lights[1]} position={[-6, -3, -5]} color="#00e5ff" intensity={1.0} distance={20} />
      <pointLight ref={lights[2]} position={[0, 8, 0]}    color="#7c3aed" intensity={0.8} distance={18} />
      <pointLight ref={lights[3]} position={[4, 2, -4]}   color="#ff6600" intensity={0.6} distance={16} />
      <pointLight ref={lights[4]} position={[-4, -2, 4]}  color="#ff0080" intensity={0.5} distance={14} />
      <directionalLight position={[3, 5, 3]} intensity={0.35} color="#ffffff" />
    </>
  );
}

// ── مطر كمومي 5D ────────────────────────────────────────────────────────────
function QuantumRain5D({ count = 4000 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, speeds, w4Data } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds    = new Float32Array(count);
    const w4Data    = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22 + 11;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
      speeds[i] = 0.5 + Math.random() * 2.0;
      w4Data[i] = Math.random() * 2 - 1;
    }
    return { positions, speeds, w4Data };
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t   = state.clock.elapsedTime;
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3   = i * 3;
      const spd  = speeds[i];
      const w4   = w4Data[i];
      arr[i3+1] -= spd * 0.03;
      // البُعد الرابع: انحراف أفقي
      arr[i3]   += Math.sin(t * spd * 0.5 + w4 * Math.PI) * 0.003;
      // إعادة التوليد
      if (arr[i3+1] < -11) {
        arr[i3+1] = 11;
        arr[i3]   = (Math.random() - 0.5) * 22;
        arr[i3+2] = (Math.random() - 0.5) * 12 - 2;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial
        color="#88ccff"
        size={0.015}
        sizeAttenuation
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── المشهد الرئيسي 5D ────────────────────────────────────────────────────────
function Scene5D({ showStats = false }: { showStats?: boolean }) {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  return (
    <>
      <color attach="background" args={["#02000a"]} />
      <fog attach="fog" args={["#02000a", 14, 35]} />

      <Lighting5D />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      <Suspense fallback={null}>

        {/* ── تتبع الأشعة 5D (النواة الكمومية) ── */}
        <RayMarch5DCore />

        {/* ── النواة الفائقة خماسية الأبعاد (Tesseract) ── */}
        <HyperspaceCore5D />

        {/* ── شق الأبعاد والبوابات ── */}
        <DimensionalRift5D />

        {/* ── مجال الوعي الكمومي ── */}
        {isMed && <ConsciousnessField5D />}

        {/* ── الرغوة الكمومية 5D ── */}
        <QuantumFoam5D count={isHigh ? 1800 : isMed ? 800 : 300} />

        {/* ── فقاعات الفضاء الزمني ── */}
        {isMed && <SpacetimeBubbles5D bubbleCount={isHigh ? 24 : 12} />}

        {/* ── كرات PBR خماسية ── */}
        <PBRSpheres5D />

        {/* ── الشبكة العصبية الفائقة 5D ── */}
        <NeuralNetwork5D />

        {/* ── الحلقات المدارية الخماسية ── */}
        <OrbitalRings5D />

        {/* ── مطر المصفوفة 5D ── */}
        {isMed && <MatrixRain5D columns={isHigh ? 40 : 20} rows={isHigh ? 35 : 20} />}

        {/* ── كرات الطاقة خماسية الأبعاد ── */}
        <EnergyOrbs5D />

        {/* ── مطر كمومي 5D ── */}
        {isMed && <QuantumRain5D count={isHigh ? 5000 : 2500} />}

        {/* ── الطبقات الأصلية المحسّنة ── */}
        <GlobalIlluminationLayer />
        <PhotorealisticParticles />
        {isMed && <PhysicsLayer />}
        {isMed && <WeatherLayer />}

        {/* ── النواة الكمومية الأصلية (معزّزة) ── */}
        <QuantumCoreLayer />

        {/* ── المخ العصبي الرقمي ── */}
        {isHigh && <NeuralBrain layerSizes={[8, 16, 24, 16, 8]} />}

        {/* ── الأرضية السيبرانية ── */}
        <TerrainLayer />

        {/* ── البيئة الفضائية ── */}
        {/* ── بيئة الفضاء خماسية الأبعاد (استبدال SpaceEnvironmentLayer) ── */}
        <SpaceEnvironment5D />

        {/* ── شاشة HUD هولوغرافية 5D ── */}
        {isMed && <HolographicHUD5D />}

        {/* ── البلورات ── */}
        {isHigh && <CrystalArray />}

        {/* ── تصور البيانات 5D ── */}
        {isMed && <DigitalDNA strandLength={isHigh ? 100 : 50} />}
        {isHigh && <Radar3D position={[-5.5, 0.5, -2.5]} />}
        {isHigh && (
          <LiveGraph
            position={[5.5, 2.5, -3.5]}
            color={DIM2_COLOR}
            width={2.8}
            height={1.4}
          />
        )}

      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={0.12}
      />
    </>
  );
}

// ── Export الرئيسي ───────────────────────────────────────────────────────────
export function UltraScene5D({ showStats = false }: { showStats?: boolean }) {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 52, near: 0.1, far: 120 }}
        dpr={[1, isHigh ? 2 : 1.5]}
        gl={{
          antialias:              isHigh,
          alpha:                  true,
          powerPreference:        "high-performance",
          stencil:                false,
          depth:                  true,
          logarithmicDepthBuffer: isHigh,
        }}
        shadows={isHigh}
      >
        <Scene5D showStats={showStats} />
      </Canvas>
    </div>
  );
}

export default UltraScene5D;
