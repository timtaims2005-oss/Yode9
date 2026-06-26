import { useEffect, useRef } from "react";

/**
 * WebGLParticleField — GPU-first particle system with automatic 2D fallback
 * - Primary: WebGL POINTS primitive + GLSL vertex/fragment shaders (5000 particles, zero CPU loop)
 * - Fallback: Canvas 2D with 800 particles, delta-time 144fps loop, additive composite
 * Detects WebGL support at runtime and silently degrades.
 */

/* ── GLSL Shaders ─────────────────────────────────────────────────────────── */
const VERT = `
  precision mediump float;
  attribute vec2  a_pos;
  attribute vec2  a_vel;
  attribute vec3  a_color;
  attribute float a_size;
  attribute float a_phase;
  uniform   float u_time;
  uniform   vec2  u_mouse;
  varying   vec3  v_color;
  varying   float v_alpha;
  void main() {
    vec2 pos   = fract(a_pos + a_vel * u_time * 0.08);
    vec2 diff  = pos - u_mouse;
    float dist = length(diff);
    float push = smoothstep(0.18, 0.0, dist);
    pos += normalize(diff + vec2(0.0001)) * push * 0.06;
    pos  = clamp(pos, 0.0, 1.0);
    float z    = fract(a_phase + u_time * 0.018);
    float scale = 0.25 + z * 1.6;
    v_alpha = smoothstep(0.0, 0.12, z) * smoothstep(1.0, 0.72, z);
    v_color = mix(a_color, vec3(1.0), z * 0.28);
    vec2 clip  = (pos * 2.0 - 1.0) * vec2(1.0, -1.0);
    gl_Position  = vec4(clip, 0.0, 1.0);
    gl_PointSize = a_size * scale;
  }
`;
const FRAG = `
  precision mediump float;
  varying vec3  v_color;
  varying float v_alpha;
  void main() {
    vec2  coord = gl_PointCoord - 0.5;
    float d     = length(coord);
    if (d > 0.5) discard;
    float glow   = pow(1.0 - d * 2.0, 2.2);
    float corona = smoothstep(0.5, 0.32, d) - smoothstep(0.32, 0.10, d);
    vec3  col    = v_color * glow + v_color * corona * 0.45;
    float alpha  = v_alpha * (glow + corona * 0.35);
    gl_FragColor = vec4(col, alpha);
  }
`;

const PALETTE = [
  [0.886, 0.071, 0.153],
  [1.000, 0.239, 0.239],
  [0.000, 0.898, 1.000],
  [0.655, 0.545, 0.980],
  [0.133, 0.773, 0.369],
  [0.984, 0.627, 0.000],
  [1.000, 0.420, 0.192],
  [0.235, 0.741, 0.933],
  [1.000, 1.000, 1.000],
];
const PALETTE_HEX = [
  "#e21227","#ff3d3d","#00e5ff","#a78bfa","#22c55e","#fba000","#ff6b31","#3cbdee","#ffffff"
];

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src); gl.compileShader(s);
  return s;
}

/* ── WebGL renderer ─────────────────────────────────────────────────────── */
function startWebGL(canvas: HTMLCanvasElement, count: number): (() => void) | null {
  const gl = canvas.getContext("webgl", {
    alpha: true, premultipliedAlpha: false,
    antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false,
  }) as WebGLRenderingContext | null;
  if (!gl) return null;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);

  const aPos = gl.getAttribLocation(prog, "a_pos");
  const aVel = gl.getAttribLocation(prog, "a_vel");
  const aColor = gl.getAttribLocation(prog, "a_color");
  const aSize = gl.getAttribLocation(prog, "a_size");
  const aPhase = gl.getAttribLocation(prog, "a_phase");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uMouse = gl.getUniformLocation(prog, "u_mouse");

  const pos = new Float32Array(count * 2), vel = new Float32Array(count * 2);
  const color = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i*2] = Math.random(); pos[i*2+1] = Math.random();
    const ang = Math.random()*Math.PI*2, spd = 0.005+Math.random()*0.025;
    vel[i*2] = Math.cos(ang)*spd; vel[i*2+1] = Math.sin(ang)*spd;
    const c = PALETTE[Math.floor(Math.random()*PALETTE.length)];
    color[i*3]=c[0]; color[i*3+1]=c[1]; color[i*3+2]=c[2];
    size[i] = 1.5+Math.random()*4.5; phase[i] = Math.random();
  }

  function mkBuf(data: Float32Array) {
    const b = gl!.createBuffer()!;
    gl!.bindBuffer(gl!.ARRAY_BUFFER, b); gl!.bufferData(gl!.ARRAY_BUFFER, data, gl!.STATIC_DRAW); return b;
  }
  const bPos = mkBuf(pos), bVel = mkBuf(vel), bColor = mkBuf(color), bSize = mkBuf(size), bPhase = mkBuf(phase);
  function bind(buf: WebGLBuffer, loc: number, sz: number) {
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buf); gl!.enableVertexAttribArray(loc); gl!.vertexAttribPointer(loc, sz, gl!.FLOAT, false, 0, 0);
  }
  bind(bPos,aPos,2); bind(bVel,aVel,2); bind(bColor,aColor,3); bind(bSize,aSize,1); bind(bPhase,aPhase,1);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.disable(gl.DEPTH_TEST); gl.clearColor(0,0,0,0);

  let W=0, H=0;
  function resize() { W=canvas.offsetWidth; H=canvas.offsetHeight; canvas.width=W; canvas.height=H; gl!.viewport(0,0,W,H); }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  const mouse = { x:0.5, y:0.5 };
  function onMouse(e: MouseEvent) { mouse.x=e.clientX/window.innerWidth; mouse.y=e.clientY/window.innerHeight; }
  window.addEventListener("mousemove", onMouse, { passive: true });

  let hidden = false;
  function onVis() { hidden = document.hidden; }
  document.addEventListener("visibilitychange", onVis);

  const t0 = performance.now(); let raf = 0;
  function draw() {
    raf = requestAnimationFrame(draw);
    if (hidden) return;
    const t = (performance.now()-t0)/1000;
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.uniform1f(uTime, t); gl!.uniform2f(uMouse, mouse.x, 1-mouse.y);
    gl!.drawArrays(gl!.POINTS, 0, count);
  }
  draw();
  return () => {
    cancelAnimationFrame(raf); ro.disconnect();
    window.removeEventListener("mousemove", onMouse);
    document.removeEventListener("visibilitychange", onVis);
    [bPos,bVel,bColor,bSize,bPhase].forEach(b => gl!.deleteBuffer(b));
    gl.deleteProgram(prog);
  };
}

/* ── Canvas 2D fallback (800 particles, delta-time, additive composite) ─── */
interface P2D { x:number; y:number; vx:number; vy:number; r:number; alpha:number; color:string; z:number; }

function startCanvas2D(canvas: HTMLCanvasElement, count: number): () => void {
  const ctx = canvas.getContext("2d")!;
  let W = 0, H = 0;

  function resize() { W=canvas.offsetWidth; H=canvas.offsetHeight; canvas.width=W; canvas.height=H; }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  const N = Math.min(count, 800);
  const particles: P2D[] = Array.from({ length: N }, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random()-.5)*0.0006, vy: (Math.random()-.5)*0.0006,
    r: 1+Math.random()*3.5, alpha: .2+Math.random()*.7,
    color: PALETTE_HEX[Math.floor(Math.random()*PALETTE_HEX.length)],
    z: Math.random(),
  }));

  const mouse = { x:-999, y:-999 };
  function onMouse(e: MouseEvent) { mouse.x=e.clientX/window.innerWidth; mouse.y=e.clientY/window.innerHeight; }
  window.addEventListener("mousemove", onMouse, { passive: true });

  let hidden=false;
  function onVis() { hidden=document.hidden; }
  document.addEventListener("visibilitychange", onVis);

  let prev=0, raf=0;
  function draw(ts: number) {
    raf = requestAnimationFrame(draw);
    if (hidden) return;
    const dt = prev ? Math.min((ts-prev)/1000, 0.05) : 1/144;
    prev = ts;

    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation = "lighter";

    for (const p of particles) {
      p.x = (p.x + p.vx*dt*60 + 1) % 1;
      p.y = (p.y + p.vy*dt*60 + 1) % 1;

      // Mouse repulsion
      const dx=p.x-mouse.x, dy=p.y-mouse.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if (dist < 0.12 && dist > 0) { const f=(0.12-dist)/0.12*0.004; p.vx+=dx/dist*f; p.vy+=dy/dist*f; }
      p.vx *= 0.99; p.vy *= 0.99;

      const px = p.x*W, py = p.y*H;
      const depth = 0.3 + p.z * 1.4;
      const r = Math.max(0.5, p.r * depth);
      const a = p.alpha * Math.min(1, depth * 0.8);

      ctx.globalAlpha = a;
      const grd = ctx.createRadialGradient(px, py, 0, px, py, r*4);
      grd.addColorStop(0, p.color);
      grd.addColorStop(0.4, p.color+"66");
      grd.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(px, py, r*4, 0, Math.PI*2);
      ctx.fillStyle = grd; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2);
      ctx.fillStyle = "#fff"; ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  raf = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(raf); ro.disconnect();
    window.removeEventListener("mousemove", onMouse);
    document.removeEventListener("visibilitychange", onVis);
  };
}

/* ── React component ─────────────────────────────────────────────────────── */
interface Props { count?: number; opacity?: number; className?: string; }

export function WebGLParticleField({ count = 5000, opacity = 1, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Try WebGL first; fall back to Canvas 2D silently
    const cleanup = startWebGL(canvas, count) ?? startCanvas2D(canvas, count);
    return cleanup;
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0, opacity,
        willChange: "contents", transform: "translateZ(0)",
      }}
    />
  );
}
