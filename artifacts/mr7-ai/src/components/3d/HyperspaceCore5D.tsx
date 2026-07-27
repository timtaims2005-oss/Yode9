/**
 * HyperspaceCore5D — النواة الفائقة خماسية الأبعاد
 * تيسيراكت (Tesseract/Hypercube) + دورانات 4D حقيقية
 * البُعد الخامس = مجال الوعي الكمومي
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { tesseractVertex5D, tesseractFragment5D } from "../../lib/hyper-shaders-5d";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── Tesseract Geometry Generator ────────────────────────────────────────────
function buildTesseractGeometry(size = 1.5): { positions: Float32Array; indices: Uint16Array } {
  const s = size;
  // 16 رأس للهايبركيوب (Tesseract): كل رأس له 4 إحداثيات (±s)
  const verts4D: [number, number, number, number][] = [];
  for (let i = 0; i < 16; i++) {
    verts4D.push([
      (i & 1) ? s : -s,
      (i & 2) ? s : -s,
      (i & 4) ? s : -s,
      (i & 8) ? s : -s,
    ]);
  }

  // 32 حافة: كل حافة تربط رأسين يختلفان بإحداثية واحدة فقط
  const edges: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      let diff = 0;
      for (let k = 0; k < 4; k++) {
        if (verts4D[i][k] !== verts4D[j][k]) diff++;
      }
      if (diff === 1) edges.push([i, j]);
    }
  }

  // بناء geometry من نقاط (سنرسم كـ points + lines)
  const positions = new Float32Array(16 * 3);
  // نبدأ بإسقاط منظوري مبسط من 4D→3D
  for (let i = 0; i < 16; i++) {
    const [x, y, z, w] = verts4D[i];
    const wScale = 2.0 / (2.0 - w * 0.5);
    positions[i * 3]     = x * wScale;
    positions[i * 3 + 1] = y * wScale;
    positions[i * 3 + 2] = z * wScale;
  }

  // بناء indices للحواف
  const indices = new Uint16Array(edges.length * 2);
  edges.forEach(([a, b], i) => {
    indices[i * 2]     = a;
    indices[i * 2 + 1] = b;
  });

  return { positions, indices };
}

// ── 4D Rotation Matrices ────────────────────────────────────────────────────
function rotateXW(pos4D: number[][], angle: number): number[][] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return pos4D.map(([x, y, z, w]) => [c * x - s * w, y, z, s * x + c * w]);
}
function rotateYZ(pos4D: number[][], angle: number): number[][] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return pos4D.map(([x, y, z, w]) => [x, c * y - s * z, s * y + c * z, w]);
}
function rotateXY(pos4D: number[][], angle: number): number[][] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return pos4D.map(([x, y, z, w]) => [c * x - s * y, s * x + c * y, z, w]);
}
function rotateZW(pos4D: number[][], angle: number): number[][] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return pos4D.map(([x, y, z, w]) => [x, y, c * z - s * w, s * z + c * w]);
}
function rotateYW(pos4D: number[][], angle: number): number[][] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return pos4D.map(([x, y, z, w]) => [x, c * y - s * w, z, s * y + c * w]);
}

// إسقاط منظوري من 4D إلى 3D (الإسقاط الصحيح)
function project4Dto3D(pos4D: number[][], wDist = 2.5): THREE.Vector3[] {
  return pos4D.map(([x, y, z, w]) => {
    const scale = wDist / (wDist - w);
    return new THREE.Vector3(x * scale, y * scale, z * scale);
  });
}

// ── Animated Tesseract Component ─────────────────────────────────────────────
function AnimatedTesseract({ size = 1.5, speed = 1.0 }: { size?: number; speed?: number }) {
  const linesRef  = useRef<THREE.LineSegments>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // 16 رأس التيسيراكت بإحداثيات 4D
  const verts4D_base = useMemo<number[][]>(() => {
    const v: number[][] = [];
    for (let i = 0; i < 16; i++) {
      v.push([
        (i & 1) ? size : -size,
        (i & 2) ? size : -size,
        (i & 4) ? size : -size,
        (i & 8) ? size : -size,
      ]);
    }
    return v;
  }, [size]);

  // 32 حافة
  const edges = useMemo<[number, number][]>(() => {
    const e: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        let diff = 0;
        for (let k = 0; k < 4; k++) {
          if (verts4D_base[i][k] !== verts4D_base[j][k]) diff++;
        }
        if (diff === 1) e.push([i, j]);
      }
    }
    return e;
  }, [verts4D_base]);

  // Arrays للرسم
  const linePositions  = useMemo(() => new Float32Array(edges.length * 6), [edges]);
  const lineColors     = useMemo(() => new Float32Array(edges.length * 6), [edges]);
  const pointPositions = useMemo(() => new Float32Array(16 * 3), []);
  const pointColors    = useMemo(() => new Float32Array(16 * 3), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;

    // تطبيق دورانات 4D مزدوجة (البُعد الرابع يدور)
    let verts = rotateXW(verts4D_base, t * 0.31);
    verts     = rotateYZ(verts, t * 0.23);
    verts     = rotateXY(verts, t * 0.17);
    verts     = rotateZW(verts, t * 0.13);
    verts     = rotateYW(verts, t * 0.19);

    // إسقاط 4D→3D مع البُعد الخامس (تذبذب الوعي)
    const v5Offset = Math.sin(t * 0.5) * 0.3;
    const projected = verts.map(([x, y, z, w]) => {
      const wWithV5 = w + v5Offset;
      const scale = 2.8 / (2.8 - wWithV5 * 0.6);
      return new THREE.Vector3(x * scale, y * scale, z * scale);
    });

    // تحديث نقاط الرؤوس
    if (pointsRef.current) {
      const pAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const cAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < 16; i++) {
        pAttr.setXYZ(i, projected[i].x, projected[i].y, projected[i].z);
        const wNorm = (verts[i][3] + size) / (2 * size);
        cAttr.setXYZ(i,
          0.886 * (1 - wNorm) + 0.0 * wNorm,
          0.071 * (1 - wNorm) + 0.898 * wNorm,
          0.153 * (1 - wNorm) + 1.0 * wNorm
        );
      }
      pAttr.needsUpdate = true;
      cAttr.needsUpdate = true;
    }

    // تحديث حواف التيسيراكت
    if (linesRef.current) {
      const pAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const cAttr = linesRef.current.geometry.attributes.color as THREE.BufferAttribute;
      edges.forEach(([a, b], i) => {
        const pa = projected[a], pb = projected[b];
        pAttr.setXYZ(i * 2,     pa.x, pa.y, pa.z);
        pAttr.setXYZ(i * 2 + 1, pb.x, pb.y, pb.z);
        const wA = (verts[a][3] + size) / (2 * size);
        const wB = (verts[b][3] + size) / (2 * size);
        const pulse = (Math.sin(t * 2.5 + i * 0.3) + 1) * 0.5;
        const alpha = 0.4 + pulse * 0.4;
        cAttr.setXYZ(i * 2,     0.886 * (1-wA), 0.898 * wA, 1.0 * alpha);
        cAttr.setXYZ(i * 2 + 1, 0.886 * (1-wB), 0.898 * wB, 1.0 * alpha);
      });
      pAttr.needsUpdate = true;
      cAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* حواف التيسيراكت */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} count={edges.length * 2} />
          <bufferAttribute attach="attributes-color"    args={[lineColors, 3]}    count={edges.length * 2} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.8} depthWrite={false} />
      </lineSegments>

      {/* رؤوس التيسيراكت */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pointPositions, 3]} count={16} />
          <bufferAttribute attach="attributes-color"    args={[pointColors, 3]}    count={16} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={0.12}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// ── 5D Hyperspace Rings (حلقات الفضاء الخامس) ───────────────────────────────
function HyperspaceRings5D() {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(() => [
    { r: 2.2, tube: 0.018, speed: 0.18, color: "#e21227" },
    { r: 3.2, tube: 0.014, speed: 0.12, color: "#00e5ff" },
    { r: 4.5, tube: 0.011, speed: 0.09, color: "#7c3aed" },
    { r: 5.8, tube: 0.009, speed: 0.07, color: "#ff0080" },
    { r: 7.0, tube: 0.007, speed: 0.05, color: "#00ff88" },
  ], []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.07;
    groupRef.current.rotation.x = Math.sin(t * 0.11) * 0.25;
    groupRef.current.rotation.z = Math.cos(t * 0.08) * 0.15;
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <RingWithAnimation key={i} {...ring} index={i} />
      ))}
    </group>
  );
}

function RingWithAnimation({
  r, tube, speed, color, index,
}: { r: number; tube: number; speed: number; color: string; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef  = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // كل حلقة تدور بطريقة مختلفة في 4D
    meshRef.current.rotation.x = t * speed * 0.7 + index * 0.6;
    meshRef.current.rotation.z = t * speed * 0.5 + index * 1.1;
    meshRef.current.rotation.y = t * speed * 0.3 + index * 0.4;
    // تأثير الوعي 5D: النبض
    if (matRef.current) {
      const pulse = 0.15 + 0.1 * Math.sin(t * speed * 3.0 + index * 1.5);
      matRef.current.opacity = pulse;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2 + index * 0.4, index * 0.7, index * 0.3]}>
      <torusGeometry args={[r, tube, 16, 256]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.2}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── 5D Energy Streams (تيارات الطاقة الخماسية) ──────────────────────────────
function EnergyStreams5D({ count = 200 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, phases, speeds, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases    = new Float32Array(count);
    const speeds    = new Float32Array(count);
    const colors    = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      const r     = 2.0 + Math.random() * 5.0;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.3 + Math.random() * 1.2;
      const t = i / count;
      colors[i * 3]     = t < 0.33 ? 0.886 : t < 0.66 ? 0.0 : 0.8;
      colors[i * 3 + 1] = t < 0.33 ? 0.071 : t < 0.66 ? 0.898 : 0.0;
      colors[i * 3 + 2] = t < 0.33 ? 0.153 : t < 0.66 ? 1.0 : 1.0;
    }
    return { positions, phases, speeds, colors };
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t   = state.clock.elapsedTime;
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3    = i * 3;
      const phase = phases[i];
      const spd   = speeds[i];

      // حركة 4D: دوران في XW مع الزمن
      const w4 = Math.sin(t * spd * 0.5 + phase) * 1.5;
      const r  = Math.sqrt(arr[i3]**2 + arr[i3+1]**2 + arr[i3+2]**2);
      const theta = t * spd * 0.3 + phase;
      const phi   = Math.sin(t * spd * 0.2 + phase) * Math.PI;
      const scale4D = 2.5 / (2.5 - w4 * 0.4);

      arr[i3]     = r * Math.sin(phi) * Math.cos(theta) * scale4D;
      arr[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * scale4D;
      arr[i3 + 2] = r * Math.cos(phi) * scale4D;

      // البُعد الخامس: موجة الوعي
      const v5 = Math.cos(t * spd * 0.4 + phase * 1.618) * 0.5;
      arr[i3]     += Math.sin(arr[i3+1] * 2.0 + t + v5) * 0.15;
      arr[i3 + 1] += Math.cos(arr[i3]   * 2.0 - t + v5) * 0.15;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]}    count={count} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── 5D Orbital Nodes (عقد مدارية خماسية) ────────────────────────────────────
function OrbitalNodes5D({ nodeCount = 12 }: { nodeCount?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const nodes = useMemo(() => Array.from({ length: nodeCount }, (_, i) => ({
    radius:  1.5 + (i % 3) * 1.8,
    speed:   0.15 + i * 0.02,
    phase:   (i / nodeCount) * Math.PI * 2,
    y:       Math.sin((i / nodeCount) * Math.PI * 4) * 1.5,
    color:   new THREE.Color().setHSL(i / nodeCount, 0.9, 0.6),
    size:    0.06 + (i % 4) * 0.025,
    dim4:    (i % 2 === 0) ? 1 : -1,
  })), [nodeCount]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t  = state.clock.elapsedTime;
    nodes.forEach((node, i) => {
      const child = groupRef.current!.children[i] as THREE.Mesh;
      if (!child) return;
      // دوران 4D مع البُعد الخامس
      const w4 = Math.sin(t * node.speed * 0.6 + node.phase) * node.dim4;
      const scale4D = 2.0 / (2.0 - w4 * 0.5);
      const theta   = t * node.speed + node.phase;
      child.position.set(
        node.radius * Math.cos(theta) * scale4D,
        node.y + Math.sin(t * node.speed * 0.5 + node.phase) * 0.8,
        node.radius * Math.sin(theta) * scale4D,
      );
      // البُعد الخامس: نبض الوعي يغير الحجم
      const v5     = Math.cos(t * node.speed * 0.8 + node.phase * 1.618);
      const sScale = 1.0 + v5 * 0.4;
      child.scale.setScalar(sScale);
    });
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <mesh key={i}>
          <sphereGeometry args={[node.size, 16, 16]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={0.85}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Main HyperspaceCore5D Export ──────────────────────────────────────────────
export function HyperspaceCore5D() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  return (
    <group>
      {/* التيسيراكت الرئيسي */}
      <AnimatedTesseract size={1.5} speed={isHigh ? 1.0 : 0.7} />

      {/* طبقة ثانية: تيسيراكت داخلي أصغر */}
      {isHigh && <AnimatedTesseract size={0.8} speed={1.6} />}

      {/* حلقات الفضاء الخماسي */}
      <HyperspaceRings5D />

      {/* تيارات الطاقة */}
      <EnergyStreams5D count={isHigh ? 300 : isMed ? 150 : 60} />

      {/* عقد مدارية */}
      <OrbitalNodes5D nodeCount={isHigh ? 20 : isMed ? 12 : 6} />
    </group>
  );
}
