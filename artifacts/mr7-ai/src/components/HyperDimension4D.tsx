import { useEffect, useRef, useCallback } from "react";

/**
 * HyperDimension4D — True 4D Tesseract (Hypercube) Visualization
 * Projects a 4-dimensional cube into 3D then onto 2D canvas.
 * Real 4D rotation matrices applied across all 6 rotation planes.
 */

const VERTICES_4D: [number, number, number, number][] = [
  [-1,-1,-1,-1],[1,-1,-1,-1],[-1,1,-1,-1],[1,1,-1,-1],
  [-1,-1,1,-1], [1,-1,1,-1], [-1,1,1,-1], [1,1,1,-1],
  [-1,-1,-1,1], [1,-1,-1,1], [-1,1,-1,1], [1,1,-1,1],
  [-1,-1,1,1],  [1,-1,1,1],  [-1,1,1,1],  [1,1,1,1],
];

const EDGES: [number, number][] = [
  [0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15],
  [0,2],[1,3],[4,6],[5,7],[8,10],[9,11],[12,14],[13,15],
  [0,4],[1,5],[2,6],[3,7],[8,12],[9,13],[10,14],[11,15],
  [0,8],[1,9],[2,10],[3,11],[4,12],[5,13],[6,14],[7,15],
];

function rot4D(v: [number,number,number,number], angle: number, plane: [number,number,number,number,number,number]): [number,number,number,number] {
  const [a,b] = [plane[0], plane[1]];
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const res: [number,number,number,number] = [...v] as [number,number,number,number];
  res[a] = v[a] * cos - v[b] * sin;
  res[b] = v[a] * sin + v[b] * cos;
  return res;
}

function project4Dto3D(v: [number,number,number,number], w4: number): [number,number,number] {
  const d = 2;
  const wp = d / (d - v[3] * w4);
  return [v[0] * wp, v[1] * wp, v[2] * wp];
}

function project3Dto2D(v: [number,number,number], cx: number, cy: number, scale: number, fov: number): [number,number,number] {
  const d = 4;
  const zp = d / (d - v[2] * fov);
  return [cx + v[0] * scale * zp, cy + v[1] * scale * zp, zp];
}

interface HyperDimension4DProps {
  size?: number;
  accentColor?: string;
  secondaryColor?: string;
  speed?: number;
  opacity?: number;
  className?: string;
}

export function HyperDimension4D({
  size = 240,
  accentColor = "#e21227",
  secondaryColor = "#00e5ff",
  speed = 0.4,
  opacity = 1,
  className = "",
}: HyperDimension4DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const now = performance.now();
    if (now - lastFrameRef.current < 1000 / 60) { rafRef.current = requestAnimationFrame(draw); return; }
    lastFrameRef.current = now;

    const t = timeRef.current * speed * 0.016;
    timeRef.current++;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * 0.22;

    const rotPlanes: [number,number,number,number,number,number][] = [
      [0,1,0,0,0,0], [0,2,0,0,0,0], [0,3,0,0,0,0],
      [1,2,0,0,0,0], [1,3,0,0,0,0], [2,3,0,0,0,0],
    ];
    const speeds = [0.73, 0.51, 0.37, 0.61, 0.43, 0.29];

    const projected2D: [number, number, number][] = VERTICES_4D.map(v => {
      let rv: [number,number,number,number] = [...v] as [number,number,number,number];
      rotPlanes.forEach((pl, i) => { rv = rot4D(rv, t * speeds[i], pl); });
      const v3 = project4Dto3D(rv, 0.7);
      return project3Dto2D(v3, cx, cy, scale, 0.5);
    });

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return { r, g, b };
    };
    const ac = hexToRgb(accentColor);
    const sc = hexToRgb(secondaryColor);

    EDGES.forEach(([i, j]) => {
      const [x1,y1,z1] = projected2D[i];
      const [x2,y2,z2] = projected2D[j];

      const w4i = VERTICES_4D[i][3];
      const w4j = VERTICES_4D[j][3];
      const blend = (w4i + w4j + 2) / 4;

      const r = Math.round(ac.r * blend + sc.r * (1 - blend));
      const g = Math.round(ac.g * blend + sc.g * (1 - blend));
      const b = Math.round(ac.b * blend + sc.b * (1 - blend));
      const alpha = ((z1 + z2) / 2) * 0.5 + 0.35;
      const lineW = ((z1 + z2) / 2) * 1.5 + 0.5;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(${r},${g},${b},${(alpha * opacity).toFixed(2)})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},${(alpha * opacity * 0.4).toFixed(2)})`);

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW;
      ctx.shadowColor = `rgba(${r},${g},${b},0.6)`;
      ctx.shadowBlur = 8 + blend * 6;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    projected2D.forEach(([x, y, z], i) => {
      const w = VERTICES_4D[i][3];
      const blend = (w + 1) / 2;
      const r = Math.round(ac.r * blend + sc.r * (1 - blend));
      const g = Math.round(ac.g * blend + sc.g * (1 - blend));
      const b = Math.round(ac.b * blend + sc.b * (1 - blend));
      const radius = z * 2.5 + 1.5;

      ctx.beginPath();
      ctx.fillStyle = `rgba(${r},${g},${b},${(opacity * 0.9).toFixed(2)})`;
      ctx.shadowColor = `rgba(${r},${g},${b},1)`;
      ctx.shadowBlur = 12;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    const t2 = timeRef.current * 0.02;
    ctx.save();
    ctx.font = "9px monospace";
    ctx.fillStyle = `rgba(${ac.r},${ac.g},${ac.b},${(0.3 + Math.sin(t2) * 0.1).toFixed(2)})`;
    ctx.textAlign = "center";
    ctx.fillText("4D HYPERCUBE", cx, H - 8);
    ctx.restore();

    rafRef.current = requestAnimationFrame(draw);
  }, [accentColor, secondaryColor, speed, opacity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`gpu-layer ${className}`}
      style={{ display: "block" }}
    />
  );
}
