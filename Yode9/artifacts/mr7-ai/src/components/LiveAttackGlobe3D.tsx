import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, Wifi, Zap, Globe, Shield, TrendingUp } from "lucide-react";

/* =============================================================================
   LIVE ATTACK GLOBE 3D — v2.0
   Real CISA KEV data · Holographic ticker · Touch support · 3D depth effects
============================================================================= */

interface CountryData {
  name: string; lat: number; lon: number;
  isOrigin?: boolean; isTarget?: boolean;
}

const COUNTRIES: CountryData[] = [
  { name: "China",        lat:  35.86, lon: 104.19, isOrigin: true },
  { name: "Russia",       lat:  61.52, lon: 105.31, isOrigin: true },
  { name: "Iran",         lat:  32.42, lon:  53.68, isOrigin: true },
  { name: "North Korea",  lat:  40.33, lon: 127.51, isOrigin: true },
  { name: "India",        lat:  20.59, lon:  78.96, isOrigin: true, isTarget: true },
  { name: "Brazil",       lat: -14.23, lon: -51.92, isOrigin: true, isTarget: true },
  { name: "UAE",          lat:  23.42, lon:  53.84, isOrigin: true },
  { name: "Saudi Arabia", lat:  23.88, lon:  45.07, isOrigin: true, isTarget: true },
  { name: "Turkey",       lat:  38.96, lon:  35.24, isOrigin: true, isTarget: true },
  { name: "Pakistan",     lat:  30.38, lon:  69.34, isOrigin: true },
  { name: "Vietnam",      lat:  14.05, lon: 108.27, isOrigin: true },
  { name: "USA",          lat:  37.09, lon: -95.71, isTarget: true },
  { name: "UK",           lat:  51.50, lon:  -0.12, isTarget: true },
  { name: "Germany",      lat:  51.16, lon:  10.45, isTarget: true },
  { name: "France",       lat:  46.22, lon:   2.21, isTarget: true },
  { name: "Japan",        lat:  36.20, lon: 138.25, isTarget: true },
  { name: "Australia",    lat: -25.27, lon: 133.77, isTarget: true },
  { name: "South Korea",  lat:  35.90, lon: 127.76, isTarget: true },
  { name: "Canada",       lat:  56.13, lon: -106.34, isTarget: true },
  { name: "Netherlands",  lat:  52.37, lon:   4.90, isTarget: true },
  { name: "Israel",       lat:  31.04, lon:  34.85, isTarget: true },
  { name: "Singapore",    lat:   1.35, lon: 103.81, isTarget: true },
  { name: "Taiwan",       lat:  23.69, lon: 120.96, isTarget: true },
  { name: "Ukraine",      lat:  48.37, lon:  31.16, isTarget: true },
  { name: "Switzerland",  lat:  46.81, lon:   8.22, isTarget: true },
];

interface CVEData {
  id: string;
  product: string;
  vendor: string;
  severity: "critical" | "high" | "medium";
  cvss: number;
  technique: string;
  dateAdded: string;
  ransomware: boolean;
}

const FALLBACK_CVE_POOL: CVEData[] = [
  { id:"CVE-2024-3400",   product:"PAN-OS",               vendor:"Palo Alto",  severity:"critical", cvss:10.0, technique:"OS Command Injection RCE",        dateAdded:"2024-04-12", ransomware:false },
  { id:"CVE-2024-21762",  product:"FortiOS SSL-VPN",      vendor:"Fortinet",   severity:"critical", cvss: 9.6, technique:"Unauthenticated Auth Bypass",     dateAdded:"2024-02-09", ransomware:false },
  { id:"CVE-2023-46805",  product:"Ivanti Connect Secure",vendor:"Ivanti",     severity:"critical", cvss: 8.2, technique:"Auth Bypass via Path Traversal",  dateAdded:"2024-01-19", ransomware:false },
  { id:"CVE-2024-1709",   product:"ScreenConnect",        vendor:"ConnectWise",severity:"critical", cvss:10.0, technique:"CWE-288 Authentication Bypass",    dateAdded:"2024-02-22", ransomware:true  },
  { id:"CVE-2024-47575",  product:"FortiManager",         vendor:"Fortinet",   severity:"critical", cvss: 9.8, technique:"Missing Auth — fgfmsd daemon",   dateAdded:"2024-10-23", ransomware:false },
  { id:"CVE-2024-6387",   product:"OpenSSH glibc",        vendor:"OpenBSD",    severity:"critical", cvss: 8.1, technique:"RegreSSHion Async-Signal RCE",    dateAdded:"2024-07-01", ransomware:false },
  { id:"CVE-2024-27198",  product:"TeamCity",             vendor:"JetBrains",  severity:"critical", cvss: 9.8, technique:"Authentication Bypass Alt Path",   dateAdded:"2024-03-07", ransomware:false },
  { id:"CVE-2023-22527",  product:"Confluence Server",    vendor:"Atlassian",  severity:"critical", cvss:10.0, technique:"Template Injection RCE",           dateAdded:"2024-01-22", ransomware:false },
  { id:"CVE-2024-40711",  product:"Backup & Replication", vendor:"Veeam",      severity:"critical", cvss: 9.8, technique:"Deserialization RCE",              dateAdded:"2024-09-09", ransomware:true  },
  { id:"CVE-2024-28986",  product:"Web Help Desk",        vendor:"SolarWinds", severity:"critical", cvss: 9.8, technique:"Java Deserialization RCE",         dateAdded:"2024-08-21", ransomware:true  },
  { id:"CVE-2024-9463",   product:"Expedition",           vendor:"Palo Alto",  severity:"critical", cvss: 9.9, technique:"Unauthenticated OS Cmd Injection", dateAdded:"2024-11-14", ransomware:false },
  { id:"CVE-2024-23897",  product:"Jenkins Core",         vendor:"Jenkins",    severity:"critical", cvss: 9.8, technique:"Arbitrary File Read → RCE",       dateAdded:"2024-08-19", ransomware:false },
];

const SEVERITY_COLOR: Record<string, number> = { critical: 0xFF1133, high: 0xFF6600, medium: 0xFFAA00 };
const SEVERITY_HEX:   Record<string, string>  = { critical: "#FF1133", high: "#FF6600", medium: "#FFAA00" };

function latLon2Vec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

function arcMid(a: THREE.Vector3, b: THREE.Vector3, lift: number): THREE.Vector3 {
  const m = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return m.add(m.clone().normalize().multiplyScalar(lift));
}

interface AttackArc {
  id: string; line: THREE.Line; head: THREE.Mesh; flash: THREE.Mesh;
  curve: THREE.QuadraticBezierCurve3; pts: THREE.Vector3[];
  progress: number; speed: number; cve: CVEData; origin: CountryData;
  target: CountryData; phase: "travel" | "impact" | "fade"; ttl: number; maxTtl: number;
}

interface FeedEntry {
  id: string; cve: CVEData; origin: string; target: string; ts: string;
}

/* ── Holographic Ticker Item ── */
interface TickerItem {
  cveID: string; vendor: string; product: string; dateAdded: string; ransomware: boolean;
}

function HoloTicker({ items }: { items: TickerItem[] }) {
  if (!items.length) return null;
  const repeated = [...items, ...items];
  return (
    <div className="relative overflow-hidden" style={{ height: 28 }}>
      <div
        className="flex items-center gap-6 whitespace-nowrap"
        style={{ animation: `kev-ticker ${Math.max(30, items.length * 3)}s linear infinite` }}
      >
        {repeated.map((item, i) => (
          <span key={`${item.cveID}-${i}`} className="flex items-center gap-2 text-[9px] font-mono">
            <span style={{ color: "#FF1133" }}>■</span>
            <span style={{ color: "#aaccff", fontWeight: 700 }}>{item.cveID}</span>
            <span style={{ color: "rgba(180,200,255,0.45)" }}>{item.vendor} {item.product}</span>
            <span style={{ color: "rgba(120,140,200,0.4)" }}>{item.dateAdded}</span>
            {item.ransomware && (
              <span style={{ color: "#FF6600", fontSize: 7, fontWeight: 900, letterSpacing: "0.12em",
                background: "rgba(255,102,0,0.12)", padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(255,102,0,0.3)" }}>
                RANSOMWARE
              </span>
            )}
            <span style={{ color: "rgba(100,120,180,0.2)", margin: "0 8px" }}>·····</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function LiveAttackGlobe3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cvePoolRef = useRef<CVEData[]>(FALLBACK_CVE_POOL);

  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, active: 0, kevCount: 0 });
  const [clock, setClock] = useState("");
  const [latestCve, setLatestCve] = useState<CVEData | null>(null);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [dataSource, setDataSource] = useState<"live" | "fallback" | "loading">("loading");

  /* ── Clock ── */
  useEffect(() => {
    const iv = setInterval(() => setClock(new Date().toUTCString().slice(0, 25) + " UTC"), 1000);
    return () => clearInterval(iv);
  }, []);

  /* ── Fetch real CISA KEV data ── */
  const fetchKev = useCallback(async () => {
    try {
      const resp = await fetch("/api/cisa-kev");
      const data = await resp.json() as {
        vulnerabilities?: Array<{
          cveID: string; vendorProject: string; product: string;
          shortDescription: string; dateAdded: string;
          knownRansomwareCampaignUse: string; count?: number;
        }>;
        count?: number;
      };
      if (data.vulnerabilities && data.vulnerabilities.length) {
        const pool: CVEData[] = data.vulnerabilities.slice(-80).map(v => ({
          id: v.cveID,
          product: v.product.slice(0, 40),
          vendor: v.vendorProject.slice(0, 30),
          severity: v.shortDescription.toLowerCase().includes("critical") || v.shortDescription.toLowerCase().includes("remote code") ? "critical" : "high",
          cvss: 9.0,
          technique: v.shortDescription.slice(0, 60),
          dateAdded: v.dateAdded,
          ransomware: v.knownRansomwareCampaignUse === "Known",
        }));
        cvePoolRef.current = pool;

        const ticker: TickerItem[] = data.vulnerabilities.slice(-40).map(v => ({
          cveID: v.cveID,
          vendor: v.vendorProject.slice(0, 20),
          product: v.product.slice(0, 25),
          dateAdded: v.dateAdded,
          ransomware: v.knownRansomwareCampaignUse === "Known",
        }));
        setTickerItems(ticker);
        setStats(s => ({ ...s, kevCount: data.vulnerabilities!.length }));
        setDataSource("live");
      } else {
        setDataSource("fallback");
      }
    } catch {
      setDataSource("fallback");
    }
  }, []);

  useEffect(() => {
    void fetchKev();
    const iv = setInterval(fetchKev, 3600000);
    return () => clearInterval(iv);
  }, [fetchKev]);

  /* ── Three.js globe ── */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 800;
    const H = mount.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camera.position.set(0, 0, 4.8);

    scene.add(new THREE.AmbientLight(0x112255, 5));
    const pl1 = new THREE.PointLight(0x3366ff, 14, 30);
    pl1.position.set(3, 4, 5);
    scene.add(pl1);
    const pl2 = new THREE.PointLight(0xff1133, 6, 20);
    pl2.position.set(-5, -3, -4);
    scene.add(pl2);
    const pl3 = new THREE.PointLight(0x0088ff, 3, 25);
    pl3.position.set(0, -5, 3);
    scene.add(pl3);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    /* Earth */
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x030818, emissive: 0x071830, specular: 0x2244bb, shininess: 80,
    });
    const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 72, 36), earthMat);
    group.add(earthMesh);

    /* Grid wireframe */
    const gridMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.508, 30, 15),
      new THREE.MeshBasicMaterial({ color: 0x0a2a77, wireframe: true, transparent: true, opacity: 0.20 })
    );
    group.add(gridMesh);

    /* Latitude rings */
    for (const lat of [-60, -30, 0, 30, 60]) {
      const phi = (90 - lat) * Math.PI / 180;
      const r2  = 1.51 * Math.sin(phi);
      const y   = 1.51 * Math.cos(phi);
      const ring = new THREE.RingGeometry(r2 - 0.003, r2 + 0.003, 64);
      const rm = new THREE.Mesh(ring,
        new THREE.MeshBasicMaterial({ color: 0x0a2a77, transparent: true, opacity: lat === 0 ? 0.4 : 0.12, side: THREE.DoubleSide, depthWrite: false })
      );
      rm.rotation.x = Math.PI / 2;
      rm.position.y = y;
      group.add(rm);
    }

    /* Atmospheric layers */
    for (const [r, col, op] of [[1.70, 0x0044cc, 0.08], [1.85, 0x002288, 0.04], [2.0, 0x001155, 0.025]] as [number, number, number][]) {
      group.add(new THREE.Mesh(
        new THREE.SphereGeometry(r, 32, 16),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending })
      ));
    }

    /* Country markers */
    COUNTRIES.forEach(c => {
      const pos = latLon2Vec3(c.lat, c.lon, 1.515);
      const col = c.isOrigin && c.isTarget ? 0xaa55ff : c.isOrigin ? 0xff2244 : 0x2299ff;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 6, 6),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
      );
      dot.position.copy(pos);
      group.add(dot);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.028, 0.040, 20),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      group.add(ring);

      /* Pulse ring */
      const pulse = new THREE.Mesh(
        new THREE.RingGeometry(0.040, 0.048, 20),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      pulse.position.copy(pos);
      pulse.lookAt(0, 0, 0);
      group.add(pulse);
    });

    /* Stars */
    const starVerts: number[] = [];
    for (let i = 0; i < 3000; i++) {
      const r2 = 40 + Math.random() * 80;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starVerts.push(r2 * Math.sin(p) * Math.cos(t), r2 * Math.cos(p), r2 * Math.sin(p) * Math.sin(t));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x7788cc, size: 0.10, transparent: true, opacity: 0.55 })));

    /* Attack arc state */
    const arcs: AttackArc[] = [];
    let totalCount = 0, critCount = 0, highCount = 0, lastSpawn = -9999, rafId = 0;

    function spawnArc() {
      const pool   = cvePoolRef.current;
      const origins = COUNTRIES.filter(c => c.isOrigin);
      const targets = COUNTRIES.filter(c => c.isTarget);
      const origin  = origins[Math.floor(Math.random() * origins.length)];
      const target  = targets.filter(t => t.name !== origin.name)[Math.floor(Math.random() * (targets.length - 1))];
      if (!target) return;
      const cve    = pool[Math.floor(Math.random() * pool.length)];
      const colorN = SEVERITY_COLOR[cve.severity] ?? 0xff6600;

      const startPos = latLon2Vec3(origin.lat, origin.lon, 1.52);
      const endPos   = latLon2Vec3(target.lat, target.lon, 1.52);
      const lift     = 0.75 + Math.random() * 1.2;
      const curve    = new THREE.QuadraticBezierCurve3(startPos, arcMid(startPos, endPos, lift), endPos);
      const pts      = curve.getPoints(80);

      const posArr = new Float32Array(80 * 3);
      const geom   = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      geom.setDrawRange(0, 0);
      const lineMat = new THREE.LineBasicMaterial({ color: colorN, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending });
      const line    = new THREE.Line(geom, lineMat);
      group.add(line);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 7, 7),
        new THREE.MeshBasicMaterial({ color: colorN, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending })
      );
      head.position.copy(startPos);
      group.add(head);

      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: colorN, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      flash.position.copy(endPos);
      group.add(flash);

      const id  = `arc-${Date.now()}-${Math.random()}`;
      const ttl = 220 + Math.floor(Math.random() * 120);
      arcs.push({ id, line, head, flash, curve, pts, progress: 0,
        speed: 0.007 + Math.random() * 0.007, cve, origin, target, phase: "travel", ttl, maxTtl: ttl });

      totalCount++;
      if (cve.severity === "critical") critCount++;
      else if (cve.severity === "high")  highCount++;

      const ts = new Date().toISOString().slice(11, 19) + " UTC";
      setFeed(prev => [{ id, cve, origin: origin.name, target: target.name, ts }, ...prev].slice(0, 12));
      setLatestCve(cve);
      setStats(s => ({ ...s, total: totalCount, critical: critCount, high: highCount, active: arcs.length }));
    }

    /* Mouse drag */
    let isDrag = false, mx = 0, my = 0;
    const onDown = (e: MouseEvent) => { isDrag = true; mx = e.clientX; my = e.clientY; };
    const onUp   = () => { isDrag = false; };
    const onMove = (e: MouseEvent) => {
      if (!isDrag) return;
      group.rotation.y += (e.clientX - mx) * 0.005;
      group.rotation.x += (e.clientY - my) * 0.005;
      mx = e.clientX; my = e.clientY;
    };

    /* Touch drag */
    let tx = 0, ty = 0;
    const onTouchStart = (e: TouchEvent) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
    const onTouchMove  = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      group.rotation.y += (e.touches[0].clientX - tx) * 0.005;
      group.rotation.x += (e.touches[0].clientY - ty) * 0.005;
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
    };

    mount.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("mousemove", onMove);
    mount.addEventListener("touchstart", onTouchStart, { passive: true });
    mount.addEventListener("touchmove",  onTouchMove,  { passive: true });

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    function animate(t: number) {
      rafId = requestAnimationFrame(animate);

      if (t - lastSpawn > 1800 + Math.random() * 2000) { spawnArc(); lastSpawn = t; }
      if (!isDrag) group.rotation.y += 0.0005;

      let activeNow = 0;
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        if (arc.phase === "travel") {
          arc.progress = Math.min(1, arc.progress + arc.speed);
          const cnt = Math.max(2, Math.floor(arc.progress * 80));
          const posAttr = arc.line.geometry.attributes.position as THREE.BufferAttribute;
          for (let j = 0; j < cnt; j++) {
            const p = arc.pts[j];
            posAttr.setXYZ(j, p.x, p.y, p.z);
          }
          posAttr.needsUpdate = true;
          arc.line.geometry.setDrawRange(0, cnt);
          arc.head.position.copy(arc.curve.getPoint(arc.progress));
          if (arc.progress >= 1) { arc.phase = "impact"; arc.ttl = 40; }
          activeNow++;
        } else if (arc.phase === "impact") {
          arc.ttl--;
          const f = 1 - arc.ttl / 40;
          (arc.flash.material as THREE.MeshBasicMaterial).opacity = f * (1 - f) * 4 * 0.9;
          arc.flash.scale.setScalar(1 + f * 4);
          arc.head.visible = false;
          if (arc.ttl <= 0) { arc.phase = "fade"; arc.ttl = arc.maxTtl; }
        } else {
          arc.ttl--;
          const alpha = arc.ttl / arc.maxTtl;
          (arc.line.material  as THREE.LineBasicMaterial).opacity   = alpha * 0.65;
          (arc.flash.material as THREE.MeshBasicMaterial).opacity   = 0;
          if (arc.ttl <= 0) {
            group.remove(arc.line, arc.head, arc.flash);
            arc.line.geometry.dispose();
            (arc.line.material  as THREE.Material).dispose();
            arc.head.geometry.dispose();
            (arc.head.material  as THREE.Material).dispose();
            arc.flash.geometry.dispose();
            (arc.flash.material as THREE.Material).dispose();
            arcs.splice(i, 1);
          }
        }
      }

      renderer.render(scene, camera);
    }

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mount.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("mousemove", onMove);
      mount.removeEventListener("touchstart", onTouchStart);
      mount.removeEventListener("touchmove",  onTouchMove);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none" style={{ background: "linear-gradient(180deg,#00010f 0%,#000208 50%,#00010a 100%)" }}>
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* CRT scanlines */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)" }} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,8,0.7) 100%)" }} />

      {/* ── HEADER BAR ── */}
      <div className="absolute top-0 left-0 right-0 z-30"
        style={{ background: "linear-gradient(180deg,rgba(0,0,12,0.97) 0%,rgba(0,0,8,0.8) 100%)", borderBottom: "1px solid rgba(0,100,255,0.18)" }}>
        {/* Title row */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: "0 0 10px #FF1133, 0 0 20px #FF113355" }} />
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(255,17,51,0.4)" }} />
            </div>
            <Globe className="w-3.5 h-3.5" style={{ color: "rgba(100,160,255,0.7)" }} />
            <span className="text-[10px] font-bold tracking-[0.35em] uppercase" style={{ color: "rgba(180,210,255,0.9)" }}>
              Global Cyber Attack Intelligence
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded"
              style={{ background: "rgba(255,17,51,0.1)", border: "1px solid rgba(255,17,51,0.28)" }}>
              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[8px] font-bold tracking-widest" style={{ color: "#FF4466" }}>CISA KEV</span>
              {dataSource === "live" && <span className="text-[7px] font-mono" style={{ color: "#22ff88" }}>LIVE</span>}
              {dataSource === "loading" && <span className="text-[7px] font-mono text-white/30">LOADING</span>}
            </div>
            {stats.kevCount > 0 && (
              <span className="text-[8px] font-mono px-2 py-0.5 rounded"
                style={{ background: "rgba(0,180,100,0.1)", color: "#22ff88", border: "1px solid rgba(0,180,100,0.25)" }}>
                {stats.kevCount.toLocaleString()} KEV
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[8px] font-mono" style={{ color: "rgba(140,160,220,0.4)" }}>{clock}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[8px] font-mono font-bold" style={{ color: "#22ff88" }}>STREAMING</span>
            </div>
          </div>
        </div>

        {/* Holographic KEV ticker */}
        <div className="px-4 pb-1.5"
          style={{ borderTop: "1px solid rgba(0,60,180,0.15)", paddingTop: 5 }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 flex-shrink-0" style={{ color: "#FF4466" }} />
            <span className="text-[7px] font-bold tracking-[0.3em] flex-shrink-0" style={{ color: "rgba(100,140,255,0.6)" }}>KEV TICKER</span>
            <div className="flex-1 overflow-hidden" style={{ mask: "linear-gradient(90deg,transparent,black 40px,black calc(100% - 40px),transparent)" }}>
              {tickerItems.length > 0
                ? <HoloTicker items={tickerItems} />
                : (
                  <HoloTicker items={FALLBACK_CVE_POOL.map(c => ({
                    cveID: c.id, vendor: c.vendor, product: c.product,
                    dateAdded: c.dateAdded, ransomware: c.ransomware,
                  }))} />
                )
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── LEFT: Live Attack Feed ── */}
      <div className="absolute left-2 top-[88px] bottom-14 z-20 w-[200px] overflow-hidden flex flex-col" style={{ pointerEvents: "none" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="w-3 h-3" style={{ color: "rgba(100,140,255,0.5)" }} />
          <span className="text-[7.5px] font-bold tracking-[0.3em]" style={{ color: "rgba(100,140,255,0.5)" }}>LIVE ATTACK FEED</span>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout">
            {feed.map(f => (
              <motion.div key={f.id}
                initial={{ opacity: 0, x: -16, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -12, scale: 0.94 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg px-2.5 py-2"
                style={{
                  background: "linear-gradient(135deg,rgba(0,3,22,0.95),rgba(0,2,15,0.88))",
                  border: `1px solid ${SEVERITY_HEX[f.cve.severity]}22`,
                  backdropFilter: "blur(8px)",
                  boxShadow: `0 0 12px ${SEVERITY_HEX[f.cve.severity]}08`,
                }}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded-sm tracking-widest"
                    style={{ background: `${SEVERITY_HEX[f.cve.severity]}15`, color: SEVERITY_HEX[f.cve.severity], border: `1px solid ${SEVERITY_HEX[f.cve.severity]}30` }}>
                    {f.cve.severity.toUpperCase()}
                  </span>
                  <span className="text-[8.5px] font-mono font-bold" style={{ color: "rgba(200,220,255,0.7)" }}>{f.cve.id}</span>
                </div>
                <div className="text-[7.5px] font-semibold truncate" style={{ color: "rgba(180,200,255,0.45)" }}>{f.cve.product}</div>
                <div className="flex items-center gap-1 text-[7.5px] mt-0.5">
                  <span style={{ color: "#ff4466" }}>{f.origin}</span>
                  <span style={{ color: "rgba(120,140,200,0.3)" }}>——</span>
                  <span style={{ color: "#4499ff" }}>{f.target}</span>
                </div>
                <div className="text-[6.5px] font-mono mt-0.5" style={{ color: "rgba(100,120,180,0.3)" }}>{f.ts}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT: Stats + Latest KEV ── */}
      <div className="absolute right-2 top-[88px] z-20 w-[175px] flex flex-col gap-2" style={{ pointerEvents: "none" }}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Shield className="w-3 h-3" style={{ color: "rgba(100,140,255,0.5)" }} />
          <span className="text-[7.5px] font-bold tracking-[0.3em]" style={{ color: "rgba(100,140,255,0.5)" }}>THREAT METRICS</span>
        </div>
        {([
          { label: "Detected",   val: stats.total,    color: "#aabbff", Icon: Activity },
          { label: "Critical",   val: stats.critical, color: "#FF1133", Icon: AlertTriangle },
          { label: "High",       val: stats.high,     color: "#FF6600", Icon: Zap },
          { label: "Active",     val: stats.active,   color: "#00aaff", Icon: Wifi },
        ] as const).map(row => (
          <div key={row.label}
            className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
            style={{
              background: "linear-gradient(135deg,rgba(0,3,22,0.95),rgba(0,2,15,0.88))",
              border: `1px solid ${row.color}18`,
              backdropFilter: "blur(8px)",
              boxShadow: `0 0 10px ${row.color}06`,
            }}>
            <div className="flex items-center gap-1.5">
              <row.Icon className="w-3 h-3" style={{ color: row.color, opacity: 0.7 }} />
              <span className="text-[7.5px] font-mono" style={{ color: "rgba(140,165,220,0.55)" }}>{row.label}</span>
            </div>
            <span className="text-[13px] font-bold font-mono tabular-nums" style={{ color: row.color, textShadow: `0 0 12px ${row.color}88` }}>
              {String(row.val).padStart(4, "0")}
            </span>
          </div>
        ))}

        {latestCve && (
          <motion.div key={latestCve.id}
            initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            className="rounded-xl p-3 mt-1"
            style={{
              background: "linear-gradient(135deg,rgba(0,3,22,0.97),rgba(0,2,15,0.92))",
              border: `1px solid ${SEVERITY_HEX[latestCve.severity]}28`,
              backdropFilter: "blur(8px)",
              boxShadow: `0 0 20px ${SEVERITY_HEX[latestCve.severity]}10, inset 0 1px 0 rgba(255,255,255,0.04)`,
            }}>
            <div className="text-[7px] font-bold tracking-[0.3em] mb-1.5" style={{ color: "rgba(100,140,255,0.45)" }}>LATEST KEV ENTRY</div>
            <div className="text-[11px] font-mono font-black mb-0.5"
              style={{ color: SEVERITY_HEX[latestCve.severity], textShadow: `0 0 10px ${SEVERITY_HEX[latestCve.severity]}88` }}>
              {latestCve.id}
            </div>
            <div className="text-[8.5px] font-semibold truncate mb-0.5" style={{ color: "rgba(180,200,255,0.6)" }}>{latestCve.vendor}</div>
            <div className="text-[8px] truncate mb-1.5" style={{ color: "rgba(140,160,220,0.4)" }}>{latestCve.product}</div>
            <div className="text-[7.5px] truncate mb-2" style={{ color: "rgba(120,140,200,0.35)" }}>{latestCve.technique}</div>
            <div className="flex items-center justify-between">
              <span className="text-[7.5px] font-bold px-2 py-0.5 rounded"
                style={{ background: `${SEVERITY_HEX[latestCve.severity]}12`, color: SEVERITY_HEX[latestCve.severity], border: `1px solid ${SEVERITY_HEX[latestCve.severity]}35` }}>
                CVSS {latestCve.cvss.toFixed(1)}
              </span>
              {latestCve.ransomware && (
                <span className="text-[6.5px] font-black px-1.5 py-0.5 rounded tracking-widest"
                  style={{ color: "#FF6600", background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.3)" }}>
                  RANSOMWARE
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── BOTTOM LEGEND ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 py-2.5"
        style={{ background: "linear-gradient(0deg,rgba(0,0,10,0.95) 0%,transparent 100%)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { label: "CRITICAL", color: "#FF1133" },
              { label: "HIGH",     color: "#FF6600" },
              { label: "MEDIUM",   color: "#FFAA00" },
              { label: "ORIGIN",   color: "#ff2244" },
              { label: "TARGET",   color: "#2299ff" },
              { label: "DUAL",     color: "#aa55ff" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: l.color, boxShadow: `0 0 5px ${l.color}` }} />
                <span className="text-[6.5px] font-mono tracking-widest" style={{ color: "rgba(120,145,210,0.45)" }}>{l.label}</span>
              </div>
            ))}
          </div>
          <span className="text-[6.5px] font-mono" style={{ color: "rgba(80,100,160,0.3)" }}>
            DRAG/TOUCH TO ROTATE · CISA KEV {dataSource === "live" ? "LIVE" : "CACHE"} · AUTO-STREAM
          </span>
        </div>
      </div>
    </div>
  );
}
