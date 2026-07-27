/**
 * ConsciousnessField5D — مجال الوعي الكمومي خماسي الأبعاد
 * موجات الوعي + تشابك كمومي 5D + أعمدة بيانات الوعي الجماعي
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── موجات الوعي الكمومي 5D ──────────────────────────────────────────────────
const waveVert5D = `
  attribute float phase5;
  attribute float freq5;
  attribute vec3  baseCol;
  varying   vec3  vColor;
  varying   float vAlpha;
  uniform   float time;
  uniform   float consciousnessLevel;
  uniform   float pixelRatio;

  // دالة الموجة الكمومية 5D (Ψ)
  float psi5(vec3 p, float w4, float v5, float t) {
    float r = length(p);
    return exp(-r * 0.5) * sin(r * 5.0 - t * 2.5 + w4 * 3.0) * cos(v5 * 6.28);
  }

  void main() {
    float t  = time;
    vec3  p  = position;

    // إحداثيات البُعد الرابع والخامس
    float w4 = sin(phase5 + t * freq5 * 0.7);
    float v5 = cos(phase5 * 1.618 + t * freq5 * 0.5);

    // دالة احتمال الوعي الكمومي
    float psi = psi5(p, w4, v5, t);

    // تشويه الموضع بناءً على الوعي
    float str = consciousnessLevel * 0.6;
    p.x += psi * sin(t * freq5 + phase5) * str;
    p.y += psi * cos(t * freq5 * 0.8 - phase5) * str;
    p.z += psi * sin(t * freq5 * 0.6 + phase5 * 2.0) * str;

    // نفق كمومي
    float tunnel = step(0.65, abs(psi) * consciousnessLevel);
    p += normalize(p + 0.001) * tunnel * 0.25 * sin(t * 3.5 + phase5);

    vAlpha = abs(psi) * (0.5 + 0.5 * sin(t * freq5 * 2.0 + phase5));
    vColor = mix(baseCol,
               mix(vec3(0.0, 0.898, 1.0), vec3(1.0, 0.0, 0.8), v5 * 0.5 + 0.5),
               abs(psi) * 0.7);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (3.0 + abs(psi) * 4.0) * pixelRatio * (220.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const waveFrag5D = `
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float core = exp(-d * 7.0);
    float halo = exp(-d * 2.5) * 0.4;
    float rim  = exp(-abs(d - 0.42) * 28.0) * vAlpha;
    gl_FragColor = vec4(vColor, (core + halo + rim) * vAlpha * 0.85);
  }
`;

export function ConsciousnessWaves5D({ count = 600 }: { count?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, phases, freqs, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases    = new Float32Array(count);
    const freqs     = new Float32Array(count);
    const colors    = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // توزيع غاوسي متمركز
      const sigma = 3.0;
      positions[i * 3]     = (Math.random() + Math.random() + Math.random() - 1.5) * sigma;
      positions[i * 3 + 1] = (Math.random() + Math.random() + Math.random() - 1.5) * sigma;
      positions[i * 3 + 2] = (Math.random() + Math.random() + Math.random() - 1.5) * sigma;
      phases[i] = Math.random() * Math.PI * 2;
      freqs[i]  = 0.3 + Math.random() * 1.2;

      const t = i / count;
      // تدرج لوني 5D: أحمر→سيان→بنفسجي→وردي
      if (t < 0.25) {
        colors[i*3] = 0.886; colors[i*3+1] = 0.071; colors[i*3+2] = 0.153;
      } else if (t < 0.5) {
        colors[i*3] = 0.0;   colors[i*3+1] = 0.898; colors[i*3+2] = 1.0;
      } else if (t < 0.75) {
        colors[i*3] = 0.55;  colors[i*3+1] = 0.0;   colors[i*3+2] = 1.0;
      } else {
        colors[i*3] = 1.0;   colors[i*3+1] = 0.0;   colors[i*3+2] = 0.8;
      }
    }
    return { positions, phases, freqs, colors };
  }, [count]);

  const uniforms = useMemo(() => ({
    time:               { value: 0 },
    consciousnessLevel: { value: 1.0 },
    pixelRatio:         { value: Math.min(window.devicePixelRatio, 2) },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    // مستوى الوعي يتذبذب ببطء
    matRef.current.uniforms.consciousnessLevel.value =
      0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 0.4);
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
        <bufferAttribute attach="attributes-phase5"   args={[phases, 1]}    count={count} />
        <bufferAttribute attach="attributes-freq5"    args={[freqs, 1]}     count={count} />
        <bufferAttribute attach="attributes-baseCol"  args={[colors, 3]}    count={count} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={waveVert5D}
        fragmentShader={waveFrag5D}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── خيوط الوعي المتشابكة (Consciousness Threads) ─────────────────────────────
export function ConsciousnessThreads5D({ threadCount = 40 }: { threadCount?: number }) {
  const linesRef  = useRef<THREE.LineSegments>(null);
  const SEGMENTS  = 30;
  const totalVerts = threadCount * SEGMENTS;

  const { positions, colors, threadData } = useMemo(() => {
    const positions = new Float32Array(totalVerts * 2 * 3);
    const colors    = new Float32Array(totalVerts * 2 * 3);
    const threadData = Array.from({ length: threadCount }, (_, i) => ({
      phase: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.8,
      r:     2.0 + Math.random() * 4.0,
      hue:   i / threadCount,
      w4:    Math.random() * 2 - 1,
    }));
    return { positions, colors, threadData };
  }, [threadCount, totalVerts]);

  useFrame((state) => {
    if (!linesRef.current) return;
    const t   = state.clock.elapsedTime;
    const geo = linesRef.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const col = geo.attributes.color    as THREE.BufferAttribute;
    const pa  = pos.array as Float32Array;
    const ca  = col.array as Float32Array;

    let vi = 0;
    threadData.forEach((thread) => {
      const c = new THREE.Color().setHSL(
        (thread.hue + t * 0.05) % 1.0, 0.9, 0.6
      );

      for (let s = 0; s < SEGMENTS - 1; s++) {
        const t1 = s / SEGMENTS;
        const t2 = (s + 1) / SEGMENTS;

        // دوران خيط الوعي في 4D+5D
        const w4a = thread.w4 * Math.sin(t1 * Math.PI + t * thread.speed * 0.3);
        const w4b = thread.w4 * Math.sin(t2 * Math.PI + t * thread.speed * 0.3);
        const scale4Da = 2.5 / (2.5 - w4a * 0.5);
        const scale4Db = 2.5 / (2.5 - w4b * 0.5);

        const theta1 = t1 * Math.PI * 4 + thread.phase + t * thread.speed;
        const theta2 = t2 * Math.PI * 4 + thread.phase + t * thread.speed;
        const phi1   = Math.sin(t1 * Math.PI * 2 + t * 0.3 + thread.phase) * Math.PI;
        const phi2   = Math.sin(t2 * Math.PI * 2 + t * 0.3 + thread.phase) * Math.PI;

        const r1 = thread.r * scale4Da, r2 = thread.r * scale4Db;
        const v5 = Math.cos(t * 0.4 + thread.phase);

        pa[vi * 3]     = r1 * Math.sin(phi1) * Math.cos(theta1) + v5 * 0.3;
        pa[vi * 3 + 1] = r1 * Math.sin(phi1) * Math.sin(theta1) + v5 * 0.2;
        pa[vi * 3 + 2] = r1 * Math.cos(phi1);
        pa[(vi+1)*3]   = r2 * Math.sin(phi2) * Math.cos(theta2) + v5 * 0.3;
        pa[(vi+1)*3+1] = r2 * Math.sin(phi2) * Math.sin(theta2) + v5 * 0.2;
        pa[(vi+1)*3+2] = r2 * Math.cos(phi2);

        const alpha = 0.3 + 0.4 * Math.sin(t1 * Math.PI);
        ca[vi * 3] = c.r * alpha; ca[vi * 3 + 1] = c.g * alpha; ca[vi * 3 + 2] = c.b * alpha;
        ca[(vi+1)*3] = c.r * alpha; ca[(vi+1)*3+1] = c.g * alpha; ca[(vi+1)*3+2] = c.b * alpha;
        vi += 2;
      }
    });

    pos.needsUpdate = true;
    col.needsUpdate = true;
    geo.setDrawRange(0, vi);
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={totalVerts * 2} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]}    count={totalVerts * 2} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.6} depthWrite={false} />
    </lineSegments>
  );
}

// ── عمود بيانات الوعي (Consciousness Data Pillars) ──────────────────────────
function ConsciousnessPillars5D({ count = 24 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const pillars = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const r = 5.0 + (i % 3) * 1.5;
    return {
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      height: 0.5 + Math.random() * 3.0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      hue: i / count,
    };
  }), [count]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const pillar = pillars[i];
      if (!pillar) return;
      const group = child as THREE.Group;

      // ارتفاع العمود يتغير مع الوعي 5D
      const w4    = Math.sin(t * pillar.speed * 0.6 + pillar.phase);
      const v5    = Math.cos(t * pillar.speed * 0.4 + pillar.phase * 1.618);
      const h     = pillar.height * (0.3 + 0.7 * Math.abs(Math.sin(t * pillar.speed + pillar.phase)));
      const scale = 1.0 + w4 * 0.3 + v5 * 0.2;

      group.scale.set(scale, h, scale);
      group.position.y = h * 0.5 - 3.0;

      // لون مرتبط بالبُعد الخامس
      const mesh = group.children[0] as THREE.Mesh;
      if (mesh) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.setHSL((pillar.hue + t * 0.03 + v5 * 0.1) % 1.0, 0.95, 0.5);
        mat.opacity = 0.1 + 0.2 * Math.abs(v5);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {pillars.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh>
            <boxGeometry args={[0.08, 1, 0.08]} />
            <meshBasicMaterial
              transparent
              opacity={0.15}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── نبضة الوعي المركزية ──────────────────────────────────────────────────────
function ConsciousnessPulse5D() {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringRefs  = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (sphereRef.current) {
      const mat = sphereRef.current.material as THREE.MeshBasicMaterial;
      // نبضة الوعي 5D
      const pulse5 = 0.4 + 0.3 * Math.sin(t * 1.5) + 0.15 * Math.sin(t * 3.7);
      const scale5 = 1.0 + 0.5 * Math.sin(t * 0.8);
      sphereRef.current.scale.setScalar(scale5);
      mat.opacity = pulse5 * 0.25;
    }

    ringRefs.forEach((ref, i) => {
      if (!ref.current) return;
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      // حلقات التموج
      const scale = 1.0 + ((t * 0.5 + i * 0.5) % 2.0);
      ref.current.scale.setScalar(scale * (0.8 + i * 0.3));
      mat.opacity = Math.max(0, 0.4 - (scale - 1.0) * 0.25);
    });
  });

  return (
    <group>
      {/* كرة الوعي المركزية */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          wireframe
        />
      </mesh>

      {/* حلقات تموج الوعي */}
      {ringRefs.map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[Math.PI / 2 + i * 0.5, 0, i * 0.7]}>
          <torusGeometry args={[0.8, 0.012, 16, 128]} />
          <meshBasicMaterial
            color={i === 0 ? "#e21227" : i === 1 ? "#00e5ff" : "#7c3aed"}
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Main ConsciousnessField5D ────────────────────────────────────────────────
export function ConsciousnessField5D() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  return (
    <group>
      {/* موجات الوعي الكمومي */}
      <ConsciousnessWaves5D count={isHigh ? 800 : isMed ? 400 : 150} />

      {/* خيوط الوعي المتشابكة */}
      {isMed && <ConsciousnessThreads5D threadCount={isHigh ? 60 : 30} />}

      {/* أعمدة بيانات الوعي */}
      {isMed && <ConsciousnessPillars5D count={isHigh ? 36 : 18} />}

      {/* نبضة الوعي المركزية */}
      <ConsciousnessPulse5D />
    </group>
  );
}
