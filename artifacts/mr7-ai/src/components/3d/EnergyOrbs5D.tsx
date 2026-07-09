/**
 * EnergyOrbs5D — كرات الطاقة خماسية الأبعاد
 * بلازما 5D + حلقات كمومية + مدارات البُعد الخامس
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

const orbVert5D = `
  varying vec3  vNormal;
  varying vec3  vPos;
  varying vec2  vUv;
  uniform float time;
  uniform float w4Phase;
  uniform float v5Level;

  void main(){
    vNormal = normalize(normalMatrix * normal);
    vUv     = uv;

    vec3 p = position;
    // تشويه سطح الكرة بالبُعد الرابع
    float w4deform = sin(p.x * 4.0 + time * w4Phase) * cos(p.y * 3.0 - time * w4Phase * 0.7) * 0.12;
    // التشويه الكمومي 5D
    float v5deform = cos(p.z * 5.0 + time * v5Level) * sin(p.x * 3.5 + time * 0.6) * 0.08 * v5Level;
    p += vNormal * (w4deform + v5deform);

    vPos = (modelViewMatrix * vec4(p, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const orbFrag5D = `
  uniform float time;
  uniform vec3  color;
  uniform vec3  dim5Color;
  uniform float energy;
  uniform float w4Phase;
  uniform float v5Level;
  varying vec3  vNormal;
  varying vec3  vPos;
  varying vec2  vUv;

  float noise3(vec3 p){
    return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5);
  }
  float fbm3(vec3 p){
    float v=0.0,a=0.5;
    for(int i=0;i<5;i++){
      vec3 i3=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
      v+=a*mix(mix(mix(noise3(i3),noise3(i3+vec3(1,0,0)),f.x),
                   mix(noise3(i3+vec3(0,1,0)),noise3(i3+vec3(1,1,0)),f.x),f.y),
               mix(mix(noise3(i3+vec3(0,0,1)),noise3(i3+vec3(1,0,1)),f.x),
                   mix(noise3(i3+vec3(0,1,1)),noise3(i3+vec3(1,1,1)),f.x),f.y),f.z);
      p=p*2.1; a*=0.5;
    }
    return v;
  }

  void main(){
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vPos);
    float fresnel = pow(1.0 - abs(dot(N, V)), 2.5);

    // بلازما 5D
    vec3 pPos = vPos * 2.0 + vec3(time * 0.3);
    float plasma = fbm3(pPos);

    // البُعد الرابع: تموج الطاقة
    float w4wave  = sin(vUv.y * 12.0 * 3.14159 - time * w4Phase * 3.0) * 0.5 + 0.5;
    float w4pulse = smoothstep(0.4, 0.6, w4wave) * energy * 0.6;

    // البُعد الخامس: حلقات الوعي الكمومي
    float uvR  = length(vUv - 0.5);
    float ring5 = abs(sin(uvR * 25.0 - time * v5Level * 4.0)) * v5Level;
    ring5 = smoothstep(0.3, 0.7, ring5) * energy * 0.5;

    // دمج ألوان الأبعاد
    vec3 col = mix(color, dim5Color, abs(v5Level) * 0.5);
    col = col * (plasma * 0.5 + 0.5);
    col += color * fresnel * 1.8;
    col += dim5Color * w4pulse * 0.4;
    col += mix(color, vec3(1.0), ring5 * 0.5) * ring5 * 0.6;

    float a = fresnel * 0.65 + plasma * 0.25 + w4pulse * 0.15 + ring5 * 0.2 + 0.1;
    gl_FragColor = vec4(col, a * energy);
  }
`;

function EnergyOrb5D({
  position,
  color,
  dim5Color,
  radius   = 0.4,
  energy   = 1.0,
  w4Phase  = 1.0,
  v5Level  = 0.7,
  orbitRadius = 0,
  orbitSpeed  = 0,
  orbitPhase  = 0,
}: {
  position:    [number, number, number];
  color:       THREE.Color;
  dim5Color:   THREE.Color;
  radius?:     number;
  energy?:     number;
  w4Phase?:    number;
  v5Level?:    number;
  orbitRadius?: number;
  orbitSpeed?:  number;
  orbitPhase?:  number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef  = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    time:      { value: 0 },
    color:     { value: color },
    dim5Color: { value: dim5Color },
    energy:    { value: energy },
    w4Phase:   { value: w4Phase },
    v5Level:   { value: v5Level },
  }), [color, dim5Color, energy, w4Phase, v5Level]);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.uniforms.time.value = t;

    // تحديث البُعد الرابع والخامس ديناميكياً
    matRef.current.uniforms.w4Phase.value = w4Phase * (0.8 + 0.4 * Math.sin(t * 0.5));
    matRef.current.uniforms.v5Level.value = v5Level * (0.6 + 0.4 * Math.cos(t * 0.4));

    if (meshRef.current && orbitRadius > 0) {
      const angle = t * orbitSpeed + orbitPhase;
      // مدار 4D: يضيف تأثير البُعد الرابع
      const w4orbit = Math.sin(t * orbitSpeed * 0.5 + orbitPhase) * 0.5;
      const scale4D = 2.0 / (2.0 - w4orbit * 0.4);
      meshRef.current.position.set(
        position[0] + Math.cos(angle) * orbitRadius * scale4D,
        position[1] + Math.sin(t * orbitSpeed * 0.6 + orbitPhase) * orbitRadius * 0.4,
        position[2] + Math.sin(angle) * orbitRadius * scale4D,
      );
    }
    // نبضة الحجم 5D
    const v5pulse = 1.0 + 0.2 * Math.sin(t * v5Level * 2.5 + orbitPhase);
    meshRef.current!.scale.setScalar(v5pulse);
  });

  return (
    <mesh ref={meshRef} position={orbitRadius > 0 ? undefined : position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={orbVert5D}
        fragmentShader={orbFrag5D}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// ── طبقة كرات الطاقة 5D الكاملة ──────────────────────────────────────────────
export function EnergyOrbs5D() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  const orbConfigs = useMemo(() => [
    // كرات رئيسية ثابتة
    { pos: [0,    0,    0]    as [number,number,number], color: "#e21227", dim5: "#ff6600", r: 0.5,  en: 1.2, w4: 1.5, v5: 1.0 },
    { pos: [-5,   2,   -2]   as [number,number,number], color: "#00e5ff", dim5: "#0088ff", r: 0.4,  en: 0.9, w4: 1.2, v5: 0.8 },
    { pos: [5,   -2,   -2]   as [number,number,number], color: "#7c3aed", dim5: "#ff00ff", r: 0.45, en: 1.0, w4: 0.8, v5: 1.2 },
    { pos: [0,    4,   -3]   as [number,number,number], color: "#ff6600", dim5: "#ffcc00", r: 0.35, en: 0.85,w4: 2.0, v5: 0.6 },
    { pos: [-3,  -3.5, -1]   as [number,number,number], color: "#00ff88", dim5: "#00ffcc", r: 0.3,  en: 0.8, w4: 1.0, v5: 1.5 },
    // كرات مدارية (تدور حول المركز)
    { pos: [0, 0, 0] as [number,number,number], color: "#e21227", dim5: "#ff0080", r: 0.2, en: 0.7, w4: 2.5, v5: 0.9, orbitR: 3.5, orbitS: 0.3, orbitP: 0 },
    { pos: [0, 0, 0] as [number,number,number], color: "#00e5ff", dim5: "#7c3aed", r: 0.2, en: 0.7, w4: 1.8, v5: 1.1, orbitR: 3.5, orbitS: 0.3, orbitP: 2.09 },
    { pos: [0, 0, 0] as [number,number,number], color: "#7c3aed", dim5: "#00ff88", r: 0.2, en: 0.7, w4: 1.3, v5: 0.7, orbitR: 3.5, orbitS: 0.3, orbitP: 4.19 },
  ], []);

  return (
    <group>
      {orbConfigs.map((cfg, i) => (
        <EnergyOrb5D
          key={i}
          position={cfg.pos}
          color={new THREE.Color(cfg.color)}
          dim5Color={new THREE.Color(cfg.dim5)}
          radius={cfg.r}
          energy={cfg.en}
          w4Phase={cfg.w4}
          v5Level={cfg.v5}
          orbitRadius={(cfg as any).orbitR ?? 0}
          orbitSpeed={(cfg as any).orbitS ?? 0}
          orbitPhase={(cfg as any).orbitP ?? 0}
        />
      ))}
    </group>
  );
}
