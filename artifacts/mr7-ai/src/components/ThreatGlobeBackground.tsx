import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { getTheme } from "@/lib/themes";
import { Globe, MessageSquare } from "lucide-react";

type Arc = {
  lat1: number; lon1: number;
  lat2: number; lon2: number;
  t: number; speed: number; color: string;
};

function lerpLatLon(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  t: number
): [number, number] {
  const v1x = Math.cos(lat1) * Math.sin(lon1);
  const v1y = Math.sin(lat1);
  const v1z = Math.cos(lat1) * Math.cos(lon1);
  const v2x = Math.cos(lat2) * Math.sin(lon2);
  const v2y = Math.sin(lat2);
  const v2z = Math.cos(lat2) * Math.cos(lon2);
  const dot = Math.max(-1, Math.min(1, v1x * v2x + v1y * v2y + v1z * v2z));
  const omega = Math.acos(dot);
  if (Math.abs(omega) < 0.001) return [lat1, lon1];
  const s = Math.sin(omega);
  const f1 = Math.sin((1 - t) * omega) / s;
  const f2 = Math.sin(t * omega) / s;
  const vx = f1 * v1x + f2 * v2x;
  const vy = f1 * v1y + f2 * v2y;
  const vz = f1 * v1z + f2 * v2z;
  return [
    Math.asin(Math.max(-1, Math.min(1, vy))),
    Math.atan2(vx, vz),
  ];
}

export function GlobeToggleButton() {
  const { state, dispatch } = useStore();
  const visible = state.globeVisible ?? true;

  return (
    <button
      onClick={() => dispatch({ type: "TOGGLE_GLOBE" })}
      title={visible ? "إخفاء الكرة — إظهار المحادثة" : "إظهار الكرة الأرضية"}
      style={{
        position: "fixed",
        bottom: "76px",
        right: "16px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        borderRadius: "999px",
        border: "1px solid",
        borderColor: visible ? "rgba(226,18,39,0.5)" : "rgba(255,255,255,0.15)",
        background: visible
          ? "rgba(226,18,39,0.15)"
          : "rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: visible ? "#e21227" : "rgba(255,255,255,0.7)",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.05em",
        cursor: "pointer",
        transition: "all 0.25s ease",
        boxShadow: visible
          ? "0 0 14px rgba(226,18,39,0.25), 0 2px 8px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.4)",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      {visible ? (
        <>
          <MessageSquare style={{ width: 13, height: 13 }} />
          <span>وضع المحادثة</span>
        </>
      ) : (
        <>
          <Globe style={{ width: 13, height: 13 }} />
          <span>الكرة الأرضية</span>
        </>
      )}
    </button>
  );
}

export function ThreatGlobeBackground() {
  const { state } = useStore();
  const theme = getTheme(state.activeGlobeTheme ?? "dark");
  const visible = state.globeVisible ?? true;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const rotRef    = useRef(0);
  const arcsRef   = useRef<Arc[]>([]);
  const colorsRef = useRef(theme.globe);
  const starsRef  = useRef<{ x: number; y: number; r: number; a: number; blink: number }[]>([]);

  colorsRef.current = theme.globe;

  const spawnArc = useCallback(() => {
    const colors = colorsRef.current.arcs;
    arcsRef.current.push({
      lat1:  (Math.random() - 0.5) * Math.PI * 0.85,
      lon1:  (Math.random() - 0.5) * Math.PI * 2,
      lat2:  (Math.random() - 0.5) * Math.PI * 0.85,
      lon2:  (Math.random() - 0.5) * Math.PI * 2,
      t:     0,
      speed: 0.004 + Math.random() * 0.006,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
    if (arcsRef.current.length > 10) arcsRef.current.shift();
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function buildStars(W: number, H: number) {
      const count = Math.floor((W * H) / 3500);
      starsRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.3 + Math.random() * 1.2,
        a: 0.2 + Math.random() * 0.7,
        blink: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      cv.width  = W * DPR;
      cv.height = H * DPR;
      cv.style.width  = W + "px";
      cv.style.height = H + "px";
      buildStars(W * DPR, H * DPR);
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(document.documentElement);

    const arcSpawn = setInterval(spawnArc, 800);
    spawnArc(); spawnArc(); spawnArc();

    function draw(ts: number) {
      rafRef.current = requestAnimationFrame(draw);
      rotRef.current += 0.0025;
      const rot = rotRef.current;
      const ctx = cv.getContext("2d")!;
      const W = cv.width;
      const H = cv.height;
      const cx = W / 2;
      const cy = H / 2;
      const R  = Math.min(W, H) * 0.38;

      const colors = colorsRef.current;

      ctx.clearRect(0, 0, W, H);

      /* ── Stars ─────────────────────────────────────────── */
      starsRef.current.forEach((s) => {
        const blink = 0.5 + 0.5 * Math.sin(ts / 1000 * 0.8 + s.blink);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a * blink})`;
        ctx.fill();
      });

      /* ── Globe outer glow ──────────────────────────────── */
      const outerGrd = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 1.6);
      outerGrd.addColorStop(0, colors.ambient);
      outerGrd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = outerGrd;
      ctx.fill();

      function project(lat: number, lon: number, rotY: number): [number, number, number] {
        const x3 = Math.cos(lat) * Math.sin(lon + rotY);
        const y3 = Math.sin(lat);
        const z3 = Math.cos(lat) * Math.cos(lon + rotY);
        return [cx + x3 * R, cy - y3 * R, z3];
      }

      /* ── Latitude rings ─────────────────────────────────── */
      for (let lat = -Math.PI / 2.2; lat <= Math.PI / 2.2 + 0.01; lat += Math.PI / 4.5) {
        const yLat = cy - Math.sin(lat) * R;
        for (let lon = 0; lon <= Math.PI * 2; lon += 0.07) {
          const z3 = Math.cos(lat) * Math.cos(lon + rot);
          if (z3 < -0.05) continue;
          const alpha = (0.03 + z3 * 0.09) * 0.8;
          const px    = cx + Math.cos(lat) * Math.sin(lon + rot) * R;
          ctx.beginPath();
          ctx.arc(px, yLat, 0.8, 0, Math.PI * 2);
          const hex = colors.grid.replace("#", "");
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.fill();
        }
      }

      /* ── Longitude meridians ────────────────────────────── */
      for (let lon = 0; lon < Math.PI * 2; lon += Math.PI / 6) {
        for (let lat2 = -Math.PI / 2; lat2 <= Math.PI / 2; lat2 += 0.055) {
          const z3 = Math.cos(lat2) * Math.cos(lon + rot);
          if (z3 < 0) continue;
          const alpha = (0.025 + z3 * 0.075) * 0.75;
          const px    = cx + Math.cos(lat2) * Math.sin(lon + rot) * R;
          const py    = cy - Math.sin(lat2) * R;
          const hex = colors.grid.replace("#", "");
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          ctx.beginPath();
          ctx.arc(px, py, 0.65, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.fill();
        }
      }

      /* ── Attack arcs ────────────────────────────────────── */
      arcsRef.current.forEach((arc) => {
        arc.t = Math.min(1, arc.t + arc.speed);
        const steps = 32;
        let prevPx = 0, prevPy = 0, prevZ = 0;
        for (let i = 0; i <= Math.floor(arc.t * steps); i++) {
          const ti = i / steps;
          const [lat, lon] = lerpLatLon(arc.lat1, arc.lon1, arc.lat2, arc.lon2, ti);
          const [px, py, pz] = project(lat, lon, rot);
          if (pz < 0) { prevPx = px; prevPy = py; prevZ = pz; continue; }
          if (i > 0 && prevZ >= 0) {
            const alpha = (0.35 + pz * 0.5) * (arc.t >= 1 ? Math.max(0, (1.5 - arc.t) * 2) : 1);
            ctx.beginPath();
            ctx.moveTo(prevPx, prevPy);
            ctx.lineTo(px, py);
            const aHex = Math.round(Math.max(0, alpha) * 220).toString(16).padStart(2, "0");
            ctx.strokeStyle = arc.color + aHex;
            ctx.lineWidth = 1.8;
            ctx.stroke();
            if (i === Math.floor(arc.t * steps)) {
              const grd2 = ctx.createRadialGradient(px, py, 0, px, py, 7);
              grd2.addColorStop(0, arc.color + "cc");
              grd2.addColorStop(1, arc.color + "00");
              ctx.fillStyle = grd2;
              ctx.beginPath();
              ctx.arc(px, py, 7, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          prevPx = px; prevPy = py; prevZ = pz;
        }
        if (arc.t >= 1) arc.t = 1.5;
      });
      arcsRef.current = arcsRef.current.filter((a) => a.t <= 1.4);

      /* ── Equator glow ring ──────────────────────────────── */
      const eGrd = ctx.createRadialGradient(cx, cy, R - 2, cx, cy, R + 6);
      eGrd.addColorStop(0, colors.equator + "44");
      eGrd.addColorStop(1, colors.equator + "00");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = eGrd;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      /* ── Center core pulse ──────────────────────────────── */
      const pulse = 0.6 + Math.sin(ts / 1000 * 1.4) * 0.3;
      const cGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
      cGrd.addColorStop(0, colors.core + Math.round(pulse * 180).toString(16).padStart(2, "0"));
      cGrd.addColorStop(1, colors.core + "00");
      ctx.fillStyle = cGrd;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(arcSpawn);
      ro.disconnect();
    };
  }, [spawnArc]);

  const themeId = state.activeGlobeTheme ?? "dark";
  const opacity = parseFloat((theme.cssVars["--theme-globe-opacity"] ?? "0.20") as string);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: visible ? theme.bgCss : "transparent",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease, background 0.5s ease",
      }}
      aria-hidden="true"
      data-theme={themeId}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          opacity: visible ? opacity : 0,
          transition: "opacity 0.5s ease",
        }}
      />
    </div>
  );
}
