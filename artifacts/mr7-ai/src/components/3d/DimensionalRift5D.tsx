/**
 * DimensionalRift5D — شق بين الأبعاد الخمسة
 * بوابات كمومية + تشويه الفضاء الزمني + تأثير الثقب الدودي 5D
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { riftVertex5D, riftFragment5D } from "../../lib/hyper-shaders-5d";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── شق بوابة بين الأبعاد ────────────────────────────────────────────────────
function PortalRift({
  position,
  rotation,
  size = 1.2,
  riftIntensity = 1.0,
  dim5Depth = 0.8,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size?: number;
  riftIntensity?: number;
  dim5Depth?: number;
}) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({
    time:          { value: 0 },
    resolution:    { value: new THREE.Vector2(512, 512) },
    riftIntensity: { value: riftIntensity },
    dim5Depth:     { value: dim5Depth },
  }), [riftIntensity, dim5Depth]);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.uniforms.time.value = t;
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.003;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <planeGeometry args={[size * 2, size * 2, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={riftVertex5D}
        fragmentShader={riftFragment5D}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── حلقة الثقب الدودي (Wormhole Ring) ───────────────────────────────────────
function WormholeRing5D({
  position,
  radius = 1.0,
  speed = 0.5,
}: {
  position: [number, number, number];
  radius?: number;
  speed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringsCount = 8;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const phase = (i / ringsCount) * Math.PI * 2;
      // دوران البوابة مع تأثير 4D
      mesh.rotation.x = t * speed * 0.7 + phase;
      mesh.rotation.y = t * speed * 0.5;

      // تأثير النفق: الحلقات تتقلص وتتمدد
      const scale = 0.3 + 0.7 * Math.abs(Math.sin(t * speed + phase));
      mesh.scale.setScalar(scale);

      // لون يتغير مع البُعد الرابع
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        const hue = ((t * speed * 0.1 + i / ringsCount) % 1.0);
        mat.color.setHSL(hue, 1.0, 0.6);
        mat.opacity = 0.15 + 0.2 * scale;
      }
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: ringsCount }, (_, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * (Math.PI / ringsCount), 0, i * 0.5]}>
          <torusGeometry args={[radius, radius * 0.03, 16, 128]} />
          <meshBasicMaterial
            transparent
            opacity={0.2}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── جسيمات تتسرب من الشق ─────────────────────────────────────────────────────
function RiftParticles5D({
  position,
  count = 100,
  dim5Color = "#00e5ff",
}: {
  position: [number, number, number];
  count?: number;
  dim5Color?: string;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const baseColor = new THREE.Color(dim5Color);

  const { positions, velocities, phases } = useMemo(() => {
    const positions  = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases     = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.5;
      positions[i * 3]     = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.sin(angle) * r;
      positions[i * 3 + 2] = 0;
      // السرعة: تتسرب إلى الخارج + الأعلى
      velocities[i * 3]     = (Math.random() - 0.5) * 0.04;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions, velocities, phases };
  }, [count]);

  const posArr = useMemo(() => new Float32Array(positions), [positions]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t   = state.clock.elapsedTime;
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      arr[i3]     += velocities[i3]     * (1 + Math.sin(t + phases[i]));
      arr[i3 + 1] += velocities[i3 + 1] * (1 + Math.cos(t + phases[i] * 1.3));
      arr[i3 + 2] += velocities[i3 + 2];

      // إعادة التوليد عند الابتعاد
      const dist = Math.sqrt(arr[i3]**2 + arr[i3+1]**2 + arr[i3+2]**2);
      if (dist > 3.0) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.2;
        arr[i3]     = Math.cos(angle) * r;
        arr[i3 + 1] = Math.sin(angle) * r;
        arr[i3 + 2] = 0;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posArr, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial
        color={baseColor}
        size={0.04}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── شبكة تشويه الفضاء 5D ────────────────────────────────────────────────────
function SpacetimeGrid5D() {
  const gridRef = useRef<THREE.LineSegments>(null);
  const SIZE    = 12;
  const DIVS    = 20;

  const { positions, colors } = useMemo(() => {
    const lines = DIVS * 2 * 2; // أفقية + عمودية
    const positions = new Float32Array(lines * 2 * 3);
    const colors    = new Float32Array(lines * 2 * 3);
    let idx = 0;

    const step = SIZE / DIVS;
    const half = SIZE / 2;

    // خطوط أفقية
    for (let i = 0; i <= DIVS; i++) {
      const x = -half + i * step;
      positions[idx * 3]     = x; positions[idx * 3 + 1] = 0; positions[idx * 3 + 2] = -half;
      positions[(idx+1)*3]   = x; positions[(idx+1)*3+1] = 0; positions[(idx+1)*3+2] = half;
      const t = i / DIVS;
      colors[idx * 3] = t * 0.886; colors[idx * 3 + 1] = 0.071; colors[idx * 3 + 2] = 1.0 - t;
      colors[(idx+1)*3] = t * 0.886; colors[(idx+1)*3+1] = 0.898 * (1-t); colors[(idx+1)*3+2] = 1.0 - t;
      idx += 2;
    }
    // خطوط عمودية
    for (let i = 0; i <= DIVS; i++) {
      const z = -half + i * step;
      positions[idx * 3]     = -half; positions[idx * 3 + 1] = 0; positions[idx * 3 + 2] = z;
      positions[(idx+1)*3]   = half;  positions[(idx+1)*3+1] = 0; positions[(idx+1)*3+2] = z;
      const t = i / DIVS;
      colors[idx * 3] = 0.0; colors[idx * 3 + 1] = 0.898 * t; colors[idx * 3 + 2] = 1.0;
      colors[(idx+1)*3] = 0.886 * t; colors[(idx+1)*3+1] = 0.071; colors[(idx+1)*3+2] = 1.0 - t;
      idx += 2;
    }
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (!gridRef.current) return;
    const t   = state.clock.elapsedTime;
    const geo = gridRef.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const totalVerts = arr.length / 3;

    for (let i = 0; i < totalVerts; i++) {
      const x = arr[i * 3];
      const z = arr[i * 3 + 2];
      // تشويه الشبكة: موجة 5D تشوه الفضاء حول نقاط الشق
      const dist1 = Math.sqrt(x**2 + z**2);
      const warp  = Math.sin(dist1 * 1.5 - t * 1.5) * 0.4 / (1.0 + dist1 * 0.3);
      // البُعد الرابع يضيف تشويهاً إضافياً
      const w4 = Math.sin(x * 0.5 + z * 0.3 + t * 0.4) * 0.3;
      // البُعد الخامس: تشويه الوعي
      const v5 = Math.cos(x * 0.4 - z * 0.5 + t * 0.3) * w4;
      arr[i * 3 + 1] = warp + v5;
    }
    pos.needsUpdate = true;
  });

  return (
    <lineSegments ref={gridRef} position={[0, -3, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.25} depthWrite={false} />
    </lineSegments>
  );
}

// ── Main Dimensional Rift 5D ─────────────────────────────────────────────────
export function DimensionalRift5D() {
  const quality  = getQualityLevel();
  const isHigh   = quality === "high";
  const isMed    = quality !== "low";

  return (
    <group>
      {/* شق البوابة الرئيسية */}
      <PortalRift
        position={[-5.5, 1.0, -3]}
        rotation={[0, 0.4, 0]}
        size={1.4}
        riftIntensity={1.2}
        dim5Depth={1.0}
      />

      {/* شق بوابة ثانوية */}
      {isMed && (
        <PortalRift
          position={[5.5, -1.5, -4]}
          rotation={[0, -0.5, 0.2]}
          size={1.0}
          riftIntensity={0.8}
          dim5Depth={0.6}
        />
      )}

      {/* حلقات الثقب الدودي */}
      <WormholeRing5D position={[-5.5, 1.0, -3]} radius={1.0} speed={0.4} />
      {isHigh && <WormholeRing5D position={[5.5, -1.5, -4]} radius={0.7} speed={0.6} />}

      {/* جسيمات تتسرب من الشقوق */}
      <RiftParticles5D position={[-5.5, 1.0, -3]} count={isHigh ? 200 : 80} dim5Color="#e21227" />
      {isMed && (
        <RiftParticles5D position={[5.5, -1.5, -4]} count={isHigh ? 150 : 60} dim5Color="#7c3aed" />
      )}

      {/* شبكة تشويه الفضاء-الزمن */}
      <SpacetimeGrid5D />
    </group>
  );
}
