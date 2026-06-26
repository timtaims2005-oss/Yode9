/**
 * HolographicHUD5D — شاشة HUD هولوغرافية خماسية الأبعاد
 * واجهة تحكم متعددة الأبعاد: XYZ + طور زمني 4D + مؤشرات الوعي الكمومي 5D
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── Panel HUD 5D ──────────────────────────────────────────────────────────────
const hudPanelVert5D = `
  varying vec2  vUv;
  varying float vEdge;
  uniform float time;
  uniform float dim4Phase;
  uniform float dim5Field;

  void main(){
    vUv  = uv;
    vec3 p = position;
    // تموج البُعد الرابع على حواف اللوحة
    float w4rip = sin(p.x * 4.0 + time * dim4Phase) * 0.015 * dim4Phase;
    // نبضة البُعد الخامس على كامل اللوحة
    float v5pul = cos(time * dim5Field * 2.0) * 0.008 * dim5Field;
    p.z += w4rip + v5pul;

    // حساب مدى قرب الحواف للتوهج
    vec2 edge = abs(vUv - 0.5) * 2.0;
    vEdge = max(edge.x, edge.y);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const hudPanelFrag5D = `
  varying vec2  vUv;
  varying float vEdge;
  uniform float time;
  uniform vec3  color;
  uniform vec3  dim5Color;
  uniform float dim4Phase;
  uniform float dim5Field;
  uniform float opacity;

  float scanLine(float y, float t){
    return step(0.996, sin(y * 80.0 - t * 1.5)) * 0.4;
  }

  void main(){
    vec2 uv = vUv;

    // خطوط المسح
    float scan = scanLine(uv.y, time);

    // حواف HUD المتوهجة
    float edgeGlow = pow(vEdge, 4.0) * 1.5;
    edgeGlow += pow(vEdge, 12.0) * 3.0;

    // شبكة HUD
    vec2  grid   = fract(uv * 12.0);
    float gridL  = max(
      smoothstep(0.96, 1.0, grid.x) + smoothstep(0.04, 0.0, grid.x),
      smoothstep(0.96, 1.0, grid.y) + smoothstep(0.04, 0.0, grid.y)
    );
    float gridLine = gridL * 0.15;

    // مؤشر البُعد الرابع (نبضة أفقية)
    float w4bar = smoothstep(0.48, 0.5, abs(uv.y - 0.5 - sin(time * dim4Phase * 0.8) * 0.3));
    float w4    = (1.0 - w4bar) * 0.08 * dim4Phase;

    // مؤشر البُعد الخامس (موجة قطرية)
    float diagAng = uv.x + uv.y;
    float v5wave  = sin(diagAng * 8.0 - time * dim5Field * 3.0) * 0.5 + 0.5;
    float v5ring  = exp(-abs(v5wave - 0.5) * 15.0) * 0.1 * dim5Field;

    // اللون النهائي
    vec3 col = color * (scan + edgeGlow + gridLine + w4);
    col += dim5Color * v5ring;
    col += color * 0.04;

    float a = (edgeGlow * 0.5 + scan * 0.6 + gridLine + w4 + v5ring + 0.05) * opacity;
    gl_FragColor = vec4(col, clamp(a, 0.0, 0.85));
  }
`;

function HUDPanel5D({
  position,
  rotation  = [0, 0, 0],
  size      = [1.6, 1.0],
  color,
  dim5Color,
  dim4Phase = 1.0,
  dim5Field = 0.7,
  opacity   = 0.8,
}: {
  position:  [number, number, number];
  rotation?: [number, number, number];
  size?:     [number, number];
  color:     THREE.Color;
  dim5Color: THREE.Color;
  dim4Phase?: number;
  dim5Field?: number;
  opacity?:   number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    time:      { value: 0 },
    color:     { value: color },
    dim5Color: { value: dim5Color },
    dim4Phase: { value: dim4Phase },
    dim5Field: { value: dim5Field },
    opacity:   { value: opacity },
  }), [color, dim5Color, dim4Phase, dim5Field, opacity]);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.uniforms.time.value      = t;
    matRef.current.uniforms.dim4Phase.value = dim4Phase * (0.7 + 0.3 * Math.sin(t * 0.4));
    matRef.current.uniforms.dim5Field.value = dim5Field * (0.6 + 0.4 * Math.cos(t * 0.35));
  });

  return (
    <mesh position={position} rotation={rotation as any}>
      <planeGeometry args={[size[0], size[1], 16, 16]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={hudPanelVert5D}
        fragmentShader={hudPanelFrag5D}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── مؤشر الوعي الكمومي (Consciousness Gauge) ─────────────────────────────────
const gaugeVert5D = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const gaugeFrag5D = `
  uniform float time;
  uniform float level;
  uniform float dim5;
  uniform vec3  color;
  varying vec2 vUv;

  void main(){
    vec2 uv = vUv;
    float r = length(uv - 0.5);
    float a = atan(uv.y - 0.5, uv.x - 0.5);

    // دائرة المقياس
    float ring = exp(-abs(r - 0.42) * 30.0) * 0.9;

    // مستوى الوعي مع تأثير 5D
    float levelAng = -3.14159 * 0.75 + level * 3.14159 * 1.5;
    float levelArc = step(mod(a - (-3.14159 * 0.75), 6.28318), mod(levelAng - (-3.14159 * 0.75), 6.28318));
    float arc = exp(-abs(r - 0.36) * 20.0) * levelArc * 1.2;

    // نبضة كمومية 5D
    float v5pulse = sin(a * 8.0 + time * dim5 * 3.0) * dim5 * 0.3;
    float v5ring  = exp(-abs(r - 0.3 + v5pulse) * 25.0) * dim5 * 0.6;

    float alpha = (ring + arc + v5ring) * smoothstep(0.5, 0.45, r);
    gl_FragColor = vec4(color * (1.0 + arc * 0.5), alpha);
  }
`;

function ConsciousnessGauge5D({ position, level, dim5 }: {
  position: [number, number, number];
  level:    number;
  dim5:     number;
}) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    time:  { value: 0 },
    level: { value: level },
    dim5:  { value: dim5 },
    color: { value: new THREE.Color("#00e5ff") },
  }), [level, dim5]);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.uniforms.time.value  = t;
    matRef.current.uniforms.level.value = 0.5 + 0.4 * Math.sin(t * 0.6);
    matRef.current.uniforms.dim5.value  = dim5 * (0.6 + 0.4 * Math.sin(t * 0.8));
  });

  return (
    <mesh position={position} scale={0.4}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={gaugeVert5D}
        fragmentShader={gaugeFrag5D}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── الـ HUD الكامل خماسي الأبعاد ─────────────────────────────────────────────
export function HolographicHUD5D() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  const hudGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!hudGroupRef.current) return;
    const t = state.clock.elapsedTime;
    // طفو خفيف في البُعد الرابع
    hudGroupRef.current.position.y = Math.sin(t * 0.4) * 0.08;
    hudGroupRef.current.rotation.y = Math.sin(t * 0.15) * 0.03;
  });

  return (
    <group ref={hudGroupRef}>
      {/* لوحات HUD الرئيسية */}
      <HUDPanel5D
        position={[-3.5, 0.5, -4]}
        rotation={[0, 0.3, 0]}
        size={[1.6, 1.0]}
        color={new THREE.Color("#e21227")}
        dim5Color={new THREE.Color("#ff6600")}
        dim4Phase={1.2}
        dim5Field={0.8}
      />
      <HUDPanel5D
        position={[3.5, 0.5, -4]}
        rotation={[0, -0.3, 0]}
        size={[1.6, 1.0]}
        color={new THREE.Color("#00e5ff")}
        dim5Color={new THREE.Color("#7c3aed")}
        dim4Phase={0.8}
        dim5Field={1.0}
      />
      {isMed && (
        <HUDPanel5D
          position={[0, 2.5, -5]}
          rotation={[0.15, 0, 0]}
          size={[2.2, 0.5]}
          color={new THREE.Color("#7c3aed")}
          dim5Color={new THREE.Color("#ff00ff")}
          dim4Phase={1.5}
          dim5Field={0.6}
          opacity={0.6}
        />
      )}

      {/* مقاييس الوعي الكمومي */}
      <ConsciousnessGauge5D position={[-3.5, -0.7, -4]} level={0.7} dim5={0.8} />
      {isMed && <ConsciousnessGauge5D position={[3.5, -0.7, -4]} level={0.5} dim5={1.0} />}

      {/* لوحات HUD إضافية للجودة العالية */}
      {isHigh && (
        <>
          <HUDPanel5D
            position={[-4.5, -1.5, -5]}
            rotation={[0, 0.5, 0]}
            size={[1.0, 0.6]}
            color={new THREE.Color("#00ff88")}
            dim5Color={new THREE.Color("#00ffcc")}
            dim4Phase={2.0}
            dim5Field={0.5}
            opacity={0.5}
          />
          <HUDPanel5D
            position={[4.5, -1.5, -5]}
            rotation={[0, -0.5, 0]}
            size={[1.0, 0.6]}
            color={new THREE.Color("#ff6600")}
            dim5Color={new THREE.Color("#ffcc00")}
            dim4Phase={1.0}
            dim5Field={1.2}
            opacity={0.5}
          />
        </>
      )}
    </group>
  );
}
