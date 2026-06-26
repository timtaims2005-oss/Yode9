import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Holographic4DPanel — Full-screen 4D holographic overlay.
 * Uses WebGL canvas with GLSL for true GPU-accelerated 4D depth effects.
 * Simulates light-field display with chromatic aberration + depth-of-field.
 */

const VERT_SHADER = `
attribute vec4 position;
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = position;
}`;

const FRAG_SHADER = `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float intensity;
varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

vec3 palette(float t) {
  vec3 a = vec3(0.5), b = vec3(0.5);
  vec3 c = vec3(1.0, 1.0, 0.5);
  vec3 d = vec3(0.8, 0.9, 0.3);
  return a + b * cos(TAU * (c * t + d));
}

void main() {
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0);
  float t = time * 0.3;

  float w = sin(uv.x * 3.0 + t) * 0.5 + sin(uv.y * 2.5 - t * 0.7) * 0.5;
  float w4 = fbm(uv * 2.0 + t * 0.1) * 2.0 - 1.0;
  float chromatic = 0.002 + 0.001 * sin(t);
  
  float rVal = fbm(uv * 3.0 + vec2(chromatic, 0.0) + t * 0.05 + w4 * 0.1);
  float gVal = fbm(uv * 3.0 + t * 0.05 + w4 * 0.08);
  float bVal = fbm(uv * 3.0 - vec2(chromatic, 0.0) + t * 0.05 + w4 * 0.12);

  vec3 col = vec3(rVal, gVal, bVal);
  col = mix(col, palette(fbm(uv + t * 0.02) + w4 * 0.3), 0.4);
  
  float scan = sin(uv.y * 120.0 + t * 8.0) * 0.5 + 0.5;
  scan = pow(scan, 12.0) * 0.15;
  col += scan * vec3(0.0, 0.9, 1.0);
  
  float vignette = 1.0 - smoothstep(0.5, 1.4, length(uv));
  float glow = 0.05 / (length(uv - vec2(sin(t * 0.3), cos(t * 0.2)) * 0.3) + 0.1);
  col += glow * vec3(0.8, 0.1, 0.1) * 0.5;

  float grid = max(
    abs(sin(uv.x * 20.0) * sin(uv.x * 20.0 + 0.05)),
    abs(sin(uv.y * 20.0) * sin(uv.y * 20.0 + 0.05))
  );
  col += smoothstep(0.95, 1.0, grid) * vec3(0.0, 0.3, 0.4) * 0.3;

  col *= vignette;
  col = pow(max(col, 0.0), vec3(0.85));
  
  float alpha = (length(col) * 0.4 + glow * 0.3) * intensity * vignette;
  gl_FragColor = vec4(col * intensity, alpha * 0.4);
}`;

interface Holographic4DPanelProps {
  intensity?: number;
  className?: string;
}

export function Holographic4DPanel({ intensity = 0.6, className = "" }: Holographic4DPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const startRef = useRef(performance.now());
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) { setSupported(false); return; }
    glRef.current = gl;

    const compileShader = (src: string, type: number) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("[Holo4D] Shader error:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vert = compileShader(VERT_SHADER, gl.VERTEX_SHADER);
    const frag = compileShader(FRAG_SHADER, gl.FRAGMENT_SHADER);
    if (!vert || !frag) { setSupported(false); return; }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setSupported(false); return;
    }
    progRef.current = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const resize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = w * dpr; canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    const draw = () => {
      if (document.hidden) { rafRef.current = requestAnimationFrame(draw); return; }
      const t = (performance.now() - startRef.current) / 1000;
      const timeLoc = gl.getUniformLocation(prog, "time");
      const resLoc = gl.getUniformLocation(prog, "resolution");
      const intLoc = gl.getUniformLocation(prog, "intensity");
      gl.uniform1f(timeLoc, t);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(intLoc, intensity);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [intensity]);

  if (!supported) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`gpu-layer ${className}`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

export function HoloBorderEffect({ children, color = "#00e5ff", className = "" }: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(function tick() {
      setPhase(p => (p + 1) % 360);
      requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const a = (phase * Math.PI) / 180;
  const x1 = 50 + 50 * Math.cos(a), y1 = 50 + 50 * Math.sin(a);
  const x2 = 50 + 50 * Math.cos(a + Math.PI), y2 = 50 + 50 * Math.sin(a + Math.PI);

  return (
    <div className={`relative ${className}`}
      style={{
        borderRadius: "inherit",
        padding: "1px",
        background: `linear-gradient(${phase}deg, ${color}00, ${color}cc, ${color}00, ${color}44)`,
      }}>
      <div className="relative w-full h-full" style={{ borderRadius: "inherit", background: "black" }}>
        {children}
      </div>
    </div>
  );
}

export function ScanlineOverlay({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${opacity}) 2px, rgba(0,0,0,${opacity}) 4px)`,
        backgroundSize: "100% 4px",
      }} />
    </div>
  );
}

export function HoloGlitch({ active = false, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      animate={active ? {
        x: [0, -2, 2, -1, 1, 0],
        filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(-90deg)", "hue-rotate(0deg)"],
      } : {}}
      transition={{ duration: 0.2, ease: "linear" }}>
      {children}
    </motion.div>
  );
}
