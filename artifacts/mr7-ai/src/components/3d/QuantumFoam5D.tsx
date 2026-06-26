/**
 * QuantumFoam5D — الرغوة الكمومية خماسية الأبعاد
 * طوبولوجيا بلانك + فقاعات الفضاء الزمني + تذبذب الفراغ الكمومي
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

const foamVert5D = `
  attribute float foamPhase;
  attribute vec3  foamColor;
  attribute float foamSize;
  attribute float w4;
  attribute float v5;
  varying   vec3  vColor;
  varying   float vFoam;
  varying   float vDim5;
  uniform   float time;
  uniform   float foamChaos;
  uniform   float pixelRatio;

  float qhash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  // دوران 4D المدمج
  vec3 warp4D5D(vec3 p, float w, float v, float t) {
    // دوران XW
    float a1 = t * 0.3 + w * 2.0;
    float c1 = cos(a1), s1 = sin(a1);
    float nx = c1 * p.x - s1 * w;
    float nw = s1 * p.x + c1 * w;

    // دوران YW
    float a2 = t * 0.2 + v * 1.5;
    float c2 = cos(a2), s2 = sin(a2);
    float ny = c2 * p.y - s2 * nw;

    // إسقاط 4D→3D
    float wDist = 2.8;
    float scale = wDist / (wDist - nw * 0.5);

    // البُعد الخامس: اضطراب الفراغ
    float v5warp = sin(v * 6.28 + t * 0.8) * foamChaos * 0.3;

    return vec3(nx * scale + v5warp, ny * scale, p.z * scale + v5warp * 0.5);
  }

  void main() {
    float t = time;
    vec3 p = position;

    // اضطراب الرغوة الكمومية 5D
    float f1 = qhash(p * 3.7 + t * 0.2 + foamPhase);
    float f2 = qhash(p * 7.3 - t * 0.15 + foamPhase * 1.7);
    float f3 = qhash(p * 1.9 + t * 0.3 + foamPhase * 0.3);

    p += vec3(
      (f1 - 0.5) * foamChaos * (1.0 + v5 * 0.5),
      (f2 - 0.5) * foamChaos * (1.0 + w4 * 0.3),
      (f3 - 0.5) * foamChaos
    );

    // تطبيق التشويه 4D+5D
    p = warp4D5D(p, w4, v5, t);

    vFoam = qhash(position + t * 0.05 + foamPhase);
    vDim5 = abs(v5);
    vColor = mix(foamColor, vec3(1.0) - foamColor * 0.3, vFoam * 0.4);

    float pulsate = 0.4 + 0.6 * abs(sin(t * 5.0 + foamPhase * 20.0 + w4 * 3.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = foamSize * pulsate * pixelRatio * (180.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const foamFrag5D = `
  varying vec3  vColor;
  varying float vFoam;
  varying float vDim5;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float core  = exp(-d * 12.0) * (0.5 + vFoam * 0.5);
    float shell = exp(-abs(d - 0.35) * 22.0) * vDim5 * 0.9;
    float glow  = exp(-d * 3.5) * 0.15;
    vec3  col5  = mix(vColor, vec3(0.8, 0.2, 1.0), vDim5 * 0.35);
    gl_FragColor = vec4(col5, (core + shell + glow) * 0.75);
  }
`;

export function QuantumFoam5D({ count = 1200 }: { count?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const foamPhase = new Float32Array(count);
    const foamColor = new Float32Array(count * 3);
    const foamSize  = new Float32Array(count);
    const w4Arr     = new Float32Array(count);
    const v5Arr     = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // توزيع موحد في كرة
      const u = Math.random(), v = Math.random(), w = Math.random();
      const theta = 2 * Math.PI * u;
      const phi   = Math.acos(2 * v - 1);
      const r     = 6.0 * Math.cbrt(w);

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      foamPhase[i] = Math.random() * Math.PI * 2;
      foamSize[i]  = 1.0 + Math.random() * 3.5;

      // إحداثيات الأبعاد الإضافية
      w4Arr[i] = Math.random() * 2 - 1;
      v5Arr[i] = Math.random() * 2 - 1;

      // ألوان الرغوة: تدرج 5 ألوان للأبعاد الخمسة
      const t = i / count;
      const seg = Math.floor(t * 5);
      switch (seg) {
        case 0: foamColor[i*3] = 0.886; foamColor[i*3+1] = 0.071; foamColor[i*3+2] = 0.153; break;
        case 1: foamColor[i*3] = 0.0;   foamColor[i*3+1] = 0.898; foamColor[i*3+2] = 1.0;   break;
        case 2: foamColor[i*3] = 0.55;  foamColor[i*3+1] = 0.0;   foamColor[i*3+2] = 1.0;   break;
        case 3: foamColor[i*3] = 1.0;   foamColor[i*3+1] = 0.5;   foamColor[i*3+2] = 0.0;   break;
        default: foamColor[i*3] = 0.0;  foamColor[i*3+1] = 1.0;   foamColor[i*3+2] = 0.5;
      }
    }
    return { positions, foamPhase, foamColor, foamSize, w4Arr, v5Arr };
  }, [count]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    foamChaos:  { value: 0.8 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.uniforms.time.value = t;
    // الفوضى تتذبذب ببطء
    matRef.current.uniforms.foamChaos.value = 0.5 + 0.4 * Math.sin(t * 0.3);
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"  args={[data.positions, 3]} count={count} />
        <bufferAttribute attach="attributes-foamPhase" args={[data.foamPhase, 1]} count={count} />
        <bufferAttribute attach="attributes-foamColor" args={[data.foamColor, 3]} count={count} />
        <bufferAttribute attach="attributes-foamSize"  args={[data.foamSize,  1]} count={count} />
        <bufferAttribute attach="attributes-w4"        args={[data.w4Arr,     1]} count={count} />
        <bufferAttribute attach="attributes-v5"        args={[data.v5Arr,     1]} count={count} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={foamVert5D}
        fragmentShader={foamFrag5D}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── فقاعات الفضاء الزمني ────────────────────────────────────────────────────
export function SpacetimeBubbles5D({ bubbleCount = 16 }: { bubbleCount?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const bubbles = useMemo(() => Array.from({ length: bubbleCount }, (_, i) => ({
    position: new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 8,
    ),
    baseRadius: 0.2 + Math.random() * 0.6,
    speed:  0.2 + Math.random() * 0.8,
    phase:  Math.random() * Math.PI * 2,
    hue:    i / bubbleCount,
    w4:     Math.random() * 2 - 1,
    v5:     Math.random() * 2 - 1,
  })), [bubbleCount]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    groupRef.current.children.forEach((child, i) => {
      const bubble = bubbles[i];
      if (!bubble) return;
      const group = child as THREE.Group;

      // حركة الفقاعة في 4D+5D
      const w4 = bubble.w4 * Math.sin(t * bubble.speed * 0.5 + bubble.phase);
      const v5 = bubble.v5 * Math.cos(t * bubble.speed * 0.4 + bubble.phase * 1.618);
      const scale4D = 2.0 / (2.0 - w4 * 0.4);

      group.position.set(
        bubble.position.x + Math.sin(t * bubble.speed + bubble.phase) * 0.8 * scale4D + v5 * 0.3,
        bubble.position.y + Math.cos(t * bubble.speed * 0.7 + bubble.phase) * 0.5,
        bubble.position.z + Math.sin(t * bubble.speed * 0.9 + bubble.phase * 2) * 0.6,
      );

      // حجم الفقاعة يتذبذب مع البُعد الخامس
      const pulseSize = bubble.baseRadius * (0.6 + 0.4 * Math.sin(t * bubble.speed * 2 + bubble.phase));
      const dim5Size  = pulseSize * (1.0 + Math.abs(v5) * 0.5);
      group.scale.setScalar(dim5Size);

      // لون يتغير مع 4D+5D
      const mesh = group.children[0] as THREE.Mesh;
      if (mesh) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.setHSL((bubble.hue + t * 0.02 + v5 * 0.1 + w4 * 0.05) % 1.0, 0.9, 0.6);
        mat.opacity = 0.08 + 0.12 * Math.abs(v5);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {bubbles.map((b, i) => (
        <group key={i} position={[b.position.x, b.position.y, b.position.z]}>
          <mesh>
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial
              transparent
              opacity={0.1}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              wireframe
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
