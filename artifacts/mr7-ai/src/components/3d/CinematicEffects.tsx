/**
 * Cinematic Effects — تأثيرات سينمائية
 * Depth of Field + Motion Blur + Lens Flare + Anamorphic Streaks
 */
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ── Lens Flare ─────────────────────────────────────────────────────────────
const flareVert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

const flareFrag = `
  uniform float time;
  uniform vec3  color;
  uniform float intensity;
  varying vec2  vUv;

  void main() {
    vec2  uv   = vUv - 0.5;
    float d    = length(uv);

    // Central glow
    float glow = exp(-d * 8.0) * 0.9;

    // Anamorphic horizontal streak
    float streak = exp(-abs(uv.y) * 60.0) * exp(-abs(uv.x) * 0.3) * 0.6;

    // Secondary flares along streak axis
    float sf1 = exp(-abs(length(uv - vec2(-0.15, 0.0))) * 20.0) * 0.3;
    float sf2 = exp(-abs(length(uv - vec2( 0.20, 0.0))) * 18.0) * 0.25;
    float sf3 = exp(-abs(length(uv - vec2(-0.30, 0.0))) * 16.0) * 0.2;

    // Ring diffraction
    float ring1 = exp(-abs(d - 0.12) * 40.0) * 0.15;
    float ring2 = exp(-abs(d - 0.22) * 35.0) * 0.10;

    // Flicker
    float flicker = 0.85 + 0.15 * sin(time * 23.7 + 1.4);

    float total = (glow + streak + sf1 + sf2 + sf3 + ring1 + ring2) * intensity * flicker;
    gl_FragColor = vec4(color * total, total * 0.8);
  }
`;

export function LensFlare({
  position, color, size = 1.5, intensity = 0.6,
}: {
  position: [number, number, number];
  color: THREE.Color;
  size?: number;
  intensity?: number;
}) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const uniforms = useMemo(() => ({
    time:      { value: 0 },
    color:     { value: color },
    intensity: { value: intensity },
  }), [color, intensity]);

  useFrame((state) => {
    if (!matRef.current || !meshRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    // Always face camera (billboard)
    meshRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <mesh ref={meshRef} position={position} scale={size}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={flareVert}
        fragmentShader={flareFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Anamorphic Streak (شريط أنامورفيك أفقي) ───────────────────────────────
const streakVert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const streakFrag = `
  uniform float time;
  uniform vec3  color;
  uniform float length_;
  varying vec2  vUv;

  void main() {
    vec2 uv = vUv - 0.5;

    // Very thin horizontal streak
    float streak = exp(-abs(uv.y) * 120.0);
    // Fade on edges
    float edgeFade = smoothstep(0.5, 0.0, abs(uv.x));
    // Moving shimmer
    float shimmer = 0.7 + 0.3 * sin(uv.x * 30.0 + time * 5.0);

    float a = streak * edgeFade * shimmer * 0.5;
    gl_FragColor = vec4(color, a);
  }
`;

export function AnamorphicStreak({
  position, color, width = 6.0,
}: {
  position: [number, number, number];
  color: THREE.Color;
  width?: number;
}) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const uniforms = useMemo(() => ({
    time:    { value: 0 },
    color:   { value: color },
    length_: { value: width },
  }), [color, width]);

  useFrame((state) => {
    if (!matRef.current || !meshRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    meshRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <mesh ref={meshRef} position={position} scale={[width, 0.3, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={streakVert}
        fragmentShader={streakFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Film Grain Overlay (حبوب الفيلم) ─────────────────────────────────────
export function FilmGrainOverlay({ strength = 0.025 }: { strength?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = Math.floor(window.innerWidth  / 2);
      canvas.height = Math.floor(window.innerHeight / 2);
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      frame++;
      if (frame % 2 !== 0) return; // 30fps grain

      const { width: W, height: H } = canvas;
      const img  = ctx.createImageData(W, H);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() - 0.5) * 255 * strength * 2;
        data[i] = data[i+1] = data[i+2] = 128 + v;
        data[i+3] = 12;
      }
      ctx.putImageData(img, 0, 0);
    };
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [strength]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[15] opacity-60"
      style={{ imageRendering: "pixelated", width: "100%", height: "100%" }}
      aria-hidden
    />
  );
}

// ── Chromatic Aberration Border ────────────────────────────────────────────
export function ChromaticAberrationBorder({ strength = 6 }: { strength?: number }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[16]"
      style={{
        boxShadow: [
          `inset ${strength}px 0 0 rgba(226,18,39,0.12)`,
          `inset -${strength}px 0 0 rgba(0,229,255,0.10)`,
          `inset 0 ${strength}px 0 rgba(124,58,237,0.08)`,
          `inset 0 -${strength}px 0 rgba(0,229,255,0.08)`,
        ].join(", "),
      }}
      aria-hidden
    />
  );
}

// ── Composite Cinematic Layer ─────────────────────────────────────────────
export function CinematicLayer() {
  const CYAN   = new THREE.Color("#00e5ff");
  const RED    = new THREE.Color("#e21227");
  const WHITE  = new THREE.Color("#ffffff");

  return (
    <>
      {/* Lens flares around light sources */}
      <LensFlare position={[6, 5, -3]}   color={RED}   size={1.8} intensity={0.5} />
      <LensFlare position={[-6, -3, -2]} color={CYAN}  size={1.4} intensity={0.4} />
      <LensFlare position={[0, 8, -6]}   color={WHITE} size={1.0} intensity={0.3} />

      {/* Anamorphic streaks from main light */}
      <AnamorphicStreak position={[6, 5, -3]}   color={RED}  width={8} />
      <AnamorphicStreak position={[-6, -3, -2]} color={CYAN} width={6} />
    </>
  );
}
