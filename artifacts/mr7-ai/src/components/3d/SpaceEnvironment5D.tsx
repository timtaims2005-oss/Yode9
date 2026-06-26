/**
 * SpaceEnvironment5D — بيئة الفضاء خماسية الأبعاد
 * سدم 5D + مجرات حلزونية كمومية + ثقب أسود 4D + نجوم البُعد الخامس
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── ثقب أسود 4D+5D ─────────────────────────────────────────────────────────
const bh5DVert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const bh5DFrag = `
  uniform float time;
  uniform float dim4Spin;
  uniform float dim5Field;
  varying vec2  vUv;

  float noise2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
  float fbm2(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){v+=a*noise2(p);p=p*2.1;a*=0.5;} return v; }

  void main(){
    vec2 uv = vUv - 0.5;
    float r  = length(uv);
    float a  = atan(uv.y, uv.x);

    // أفق الحدث + تشويه 4D
    float horizon = smoothstep(0.14, 0.09, r);

    // قرص التراكم مع دوران البُعد الرابع
    float spin4D = dim4Spin * time;
    float diskDist = smoothstep(0.1, 0.16, r) * smoothstep(0.48, 0.35, r);
    float disk = exp(-abs(uv.y) * 20.0) * diskDist;
    float spinAngle = mod(a - spin4D * 1.3, 6.28318);
    float bright = exp(-spinAngle * 0.35) * disk;

    // تشويه العدسة الجاذبية 4D
    float lens = exp(-r * 3.5) * 0.35 * (1.0 + dim4Spin * 0.3);

    // تأثير مجال الوعي 5D على حواف الثقب
    float v5ripple = sin(a * 8.0 + time * 2.0) * dim5Field * disk * 0.5;
    float v5glow   = exp(-r * 5.0) * dim5Field * 0.2;

    // سحب كمومية
    float wisp = noise2(uv * 9.0 + time * 0.12) * disk * 0.6;

    // ألوان الثقب الأسود 5D
    vec3 diskCol  = mix(vec3(1.0, 0.35, 0.0), vec3(0.886, 0.071, 0.153), spinAngle / 6.28318);
    diskCol = mix(diskCol, vec3(1.0, 0.9, 0.6), bright * 0.5);
    vec3 dim5col  = mix(vec3(0.0, 0.898, 1.0), vec3(0.8, 0.0, 1.0), v5ripple * 0.5 + 0.5);

    vec3 col   = diskCol * (bright + wisp) + vec3(1.0) * lens;
    col += dim5col * (v5ripple + v5glow);
    float alpha = (bright + wisp + lens + abs(v5ripple)) * (1.0 - horizon);
    alpha += horizon * 0.97;

    gl_FragColor = vec4(col * (1.0 - horizon), alpha);
  }
`;

function BlackHole5D({ position, size = 2.2 }: { position: [number,number,number]; size?: number }) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({
    time:      { value: 0 },
    dim4Spin:  { value: 1.0 },
    dim5Field: { value: 0.7 },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.uniforms.time.value      = t;
    matRef.current.uniforms.dim4Spin.value  = 0.8 + 0.4 * Math.sin(t * 0.3);
    matRef.current.uniforms.dim5Field.value = 0.5 + 0.4 * Math.sin(t * 0.25);
    if (meshRef.current) meshRef.current.quaternion.copy(state.camera.quaternion);
  });

  return (
    <mesh ref={meshRef} position={position} scale={size}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={bh5DVert}
        fragmentShader={bh5DFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── مجرة حلزونية 5D ─────────────────────────────────────────────────────────
const galVert5D = `
  attribute float galBright;
  attribute vec3  galColor;
  attribute float w4;
  attribute float v5;
  varying   float vBright;
  varying   vec3  vColor;
  uniform   float time;
  uniform   float pixelRatio;

  void main(){
    vBright = galBright;
    vColor  = galColor;

    vec3 p = position;
    // دوران البُعد الرابع
    float w4ang = time * 0.05 + w4;
    float cx = cos(w4ang), sx = sin(w4ang);
    float nx = cx * p.x - sx * p.z;
    float nz = sx * p.x + cx * p.z;
    p = vec3(nx, p.y + sin(time * 0.08 + v5 * 6.28) * 0.3, nz);

    // تشويه مجال الوعي 5D
    p.x += sin(v5 * 12.566 + time * 0.15) * abs(v5) * 0.5;
    p.y += cos(v5 * 9.42 - time * 0.12) * abs(v5) * 0.3;

    float pulse = 0.7 + 0.3 * sin(time * galBright * 2.0 + p.x * 5.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (1.5 + abs(v5) * 1.0) * pixelRatio * pulse * galBright * (500.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;
const galFrag5D = `
  varying float vBright;
  varying vec3  vColor;
  void main(){
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    gl_FragColor = vec4(vColor, vBright * exp(-d * 5.0) * 0.9);
  }
`;

function GalaxySpiral5D({ count = 5000, position }: { count?: number; position: [number,number,number] }) {
  const ref    = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const pos    = new Float32Array(count * 3);
    const bright = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const w4Arr  = new Float32Array(count);
    const v5Arr  = new Float32Array(count);
    const ARMS   = 4; // 4 أذرع للمجرة 5D

    for (let i = 0; i < count; i++) {
      const arm   = i % ARMS;
      const t     = (i / count) * 1.8;
      const angle = t * Math.PI * 4 + (arm / ARMS) * Math.PI * 2;
      const r     = t * 14 + (Math.random() - 0.5) * 2.0;
      const spread= (Math.random() - 0.5) * 0.7 * (1 + t);

      pos[i*3]   = Math.cos(angle) * r + spread;
      pos[i*3+1] = (Math.random() - 0.5) * 0.5 * (1 - t * 0.4);
      pos[i*3+2] = Math.sin(angle) * r + spread;

      bright[i] = (1 - t * 0.4) * (0.3 + Math.random() * 0.7);
      w4Arr[i]  = Math.random() * 2 - 1;
      v5Arr[i]  = Math.random() * 2 - 1;

      // ألوان 5D للمجرة: 4 ألوان للأذرع + تأثير v5
      const tc = t / 1.8;
      if (tc < 0.2) { colors[i*3]=1.0; colors[i*3+1]=0.95; colors[i*3+2]=0.85; }
      else if (arm === 0) { colors[i*3]=0.886; colors[i*3+1]=0.2; colors[i*3+2]=0.3; }
      else if (arm === 1) { colors[i*3]=0.3; colors[i*3+1]=0.7; colors[i*3+2]=1.0; }
      else if (arm === 2) { colors[i*3]=0.7; colors[i*3+1]=0.4; colors[i*3+2]=1.0; }
      else { colors[i*3]=0.2; colors[i*3+1]=1.0; colors[i*3+2]=0.6; }
    }
    return { pos, bright, colors, w4Arr, v5Arr };
  }, [count]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.012;
  });

  return (
    <points ref={ref} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"  args={[data.pos,    3]} />
        <bufferAttribute attach="attributes-galBright" args={[data.bright, 1]} />
        <bufferAttribute attach="attributes-galColor"  args={[data.colors, 3]} />
        <bufferAttribute attach="attributes-w4"        args={[data.w4Arr,  1]} />
        <bufferAttribute attach="attributes-v5"        args={[data.v5Arr,  1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={galVert5D}
        fragmentShader={galFrag5D}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── نجوم البُعد الخامس ──────────────────────────────────────────────────────
function Starfield5D({ count = 3000 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors, w4Arr, v5Arr } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const w4Arr     = new Float32Array(count);
    const v5Arr     = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      const r     = 15 + Math.random() * 35;

      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);

      w4Arr[i] = Math.random() * 2 - 1;
      v5Arr[i] = Math.random() * 2 - 1;

      // لون النجمة مرتبط بالبُعد الخامس
      const t = i / count;
      if (t < 0.7) { colors[i*3]=0.95; colors[i*3+1]=0.95; colors[i*3+2]=1.0; }
      else if (t < 0.85) { colors[i*3]=0.886; colors[i*3+1]=0.3; colors[i*3+2]=0.3; }
      else { colors[i*3]=0.3; colors[i*3+1]=0.5; colors[i*3+2]=1.0; }
    }
    return { positions, colors, w4Arr, v5Arr };
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // دوران بطيء مع البُعد الرابع
    ref.current.rotation.y = t * 0.005;
    ref.current.rotation.x = Math.sin(t * 0.003) * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]}    count={count} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.06}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  );
}

// ── سديم الفضاء 5D ──────────────────────────────────────────────────────────
const nebVert5D = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const nebFrag5D = `
  uniform float time;
  uniform vec3  color1;
  uniform vec3  color2;
  uniform float dim5;
  varying vec2  vUv;

  float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
  float n21(vec2 p){ vec2 i=floor(p),f=smoothstep(0.,1.,fract(p)); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
  float fbm21(vec2 p){ float v=0.,a=0.5; for(int i=0;i<5;i++){v+=a*n21(p);p=p*2.1+vec2(1.7,9.2);a*=0.5;} return v; }

  void main(){
    vec2 uv = vUv;
    float n1 = fbm21(uv * 3.0 + time * 0.04);
    float n2 = fbm21(uv * 5.0 - time * 0.03 + 1.3);

    // تأثير البُعد الخامس على السديم
    float v5wave = sin(uv.x * 8.0 + time * 0.5) * cos(uv.y * 6.0 - time * 0.4) * dim5;

    vec3 col = mix(color1, color2, n1 + v5wave * 0.3);
    float a  = n2 * 0.12 * (1.0 + abs(v5wave) * 0.5);
    gl_FragColor = vec4(col, a);
  }
`;

function Nebula5D({ position, size = 8.0, color1, color2, dim5 = 0.5 }: {
  position: [number,number,number];
  size?:    number;
  color1:   THREE.Color;
  color2:   THREE.Color;
  dim5?:    number;
}) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({
    time:   { value: 0 },
    color1: { value: color1 },
    color2: { value: color2 },
    dim5:   { value: dim5 },
  }), [color1, color2, dim5]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.quaternion.copy(state.camera.quaternion);
      meshRef.current.rotation.z += 0.0005;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={size}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={nebVert5D}
        fragmentShader={nebFrag5D}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Main SpaceEnvironment5D ─────────────────────────────────────────────────
export function SpaceEnvironment5D() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  return (
    <group>
      {/* ثقب أسود 4D+5D */}
      <BlackHole5D position={[8, 2, -12]} size={2.5} />
      {isHigh && <BlackHole5D position={[-10, -3, -15]} size={1.8} />}

      {/* مجرات حلزونية 5D */}
      <GalaxySpiral5D count={isHigh ? 6000 : 3000} position={[10, -5, -20]} />
      {isHigh && <GalaxySpiral5D count={3000} position={[-12, 4, -25]} />}

      {/* سدم 5D */}
      <Nebula5D
        position={[-8, 3, -18]}
        size={10}
        color1={new THREE.Color("#e21227")}
        color2={new THREE.Color("#7c3aed")}
        dim5={0.8}
      />
      {isMed && (
        <Nebula5D
          position={[9, -4, -22]}
          size={8}
          color1={new THREE.Color("#00e5ff")}
          color2={new THREE.Color("#0088ff")}
          dim5={0.6}
        />
      )}
      {isHigh && (
        <Nebula5D
          position={[0, 8, -16]}
          size={7}
          color1={new THREE.Color("#ff0080")}
          color2={new THREE.Color("#ff6600")}
          dim5={1.0}
        />
      )}

      {/* نجوم البُعد الخامس */}
      <Starfield5D count={isHigh ? 4000 : isMed ? 2000 : 800} />
    </group>
  );
}
