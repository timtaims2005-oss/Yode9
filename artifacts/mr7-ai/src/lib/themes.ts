export type ThemeId =
  | "space"
  | "cyberpunk"
  | "hacker"
  | "earth"
  | "dark"
  | "light"
  | "threatAlert"
  | "aurora";

export interface GlobeThemeColors {
  grid: string;
  glow: string;
  core: string;
  arcs: string[];
  equator: string;
  ambient: string;
}

export interface AppTheme {
  id: ThemeId;
  label: string;
  description: string;
  emoji: string;
  globe: GlobeThemeColors;
  bgCss: string;
  previewGradient: string;
  cssVars: Record<string, string>;
}

export const THEMES: AppTheme[] = [
  {
    id: "space",
    label: "Space",
    description: "فضائي — نجوم ومجرات لا نهائية",
    emoji: "🌌",
    globe: {
      grid:    "#4488ff",
      glow:    "#2255cc",
      core:    "#88aaff",
      equator: "#5599ff",
      ambient: "rgba(34,85,204,0.08)",
      arcs: ["#4488ff","#88ccff","#aa66ff","#66aaff","#ffffff","#ff88aa"],
    },
    bgCss: `
      radial-gradient(ellipse 90% 60% at 20% 30%, rgba(10,0,40,0.98) 0%, transparent 70%),
      radial-gradient(ellipse 70% 50% at 80% 70%, rgba(0,5,30,0.95) 0%, transparent 70%),
      radial-gradient(ellipse 120% 80% at 50% 50%, rgba(2,2,18,1) 40%, rgba(5,0,25,1) 100%)
    `,
    previewGradient: "linear-gradient(135deg,#020212 0%,#0a0050 50%,#000820 100%)",
    cssVars: {
      "--theme-bg": "#020212",
      "--theme-surface": "#080828",
      "--theme-border": "#1a2a6e",
      "--theme-text": "#c8d8ff",
      "--theme-muted": "#4466aa",
      "--theme-globe-opacity": "0.25",
    },
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    description: "سايبربانك — نيون وردي وأزرق مستقبلي",
    emoji: "⚡",
    globe: {
      grid:    "#ff00aa",
      glow:    "#cc0088",
      core:    "#ff66cc",
      equator: "#ff22bb",
      ambient: "rgba(255,0,170,0.08)",
      arcs: ["#ff00aa","#00ffff","#ff00ff","#00eeff","#ff44cc","#44ffff"],
    },
    bgCss: `
      radial-gradient(ellipse 80% 50% at 15% 20%, rgba(40,0,60,0.9) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 85% 80%, rgba(0,10,50,0.9) 0%, transparent 60%),
      radial-gradient(ellipse 100% 100% at 50% 50%, rgba(8,0,20,1) 30%, rgba(5,0,15,1) 100%)
    `,
    previewGradient: "linear-gradient(135deg,#0a0015 0%,#280040 40%,#000a30 100%)",
    cssVars: {
      "--theme-bg": "#080015",
      "--theme-surface": "#120025",
      "--theme-border": "#550066",
      "--theme-text": "#ffccff",
      "--theme-muted": "#aa44cc",
      "--theme-globe-opacity": "0.28",
    },
  },
  {
    id: "hacker",
    label: "Hacker",
    description: "هاكر — أخضر على أسود، شاشة اختراق",
    emoji: "💻",
    globe: {
      grid:    "#00ff41",
      glow:    "#00cc33",
      core:    "#88ff44",
      equator: "#00ff55",
      ambient: "rgba(0,255,65,0.06)",
      arcs: ["#00ff41","#00cc33","#88ff00","#33ff88","#00ffaa","#aaff00"],
    },
    bgCss: `
      radial-gradient(ellipse 80% 60% at 30% 40%, rgba(0,20,0,0.95) 0%, transparent 65%),
      radial-gradient(ellipse 100% 100% at 50% 50%, rgba(0,5,0,1) 40%, rgba(0,3,0,1) 100%)
    `,
    previewGradient: "linear-gradient(135deg,#000500 0%,#001400 50%,#000a00 100%)",
    cssVars: {
      "--theme-bg": "#000500",
      "--theme-surface": "#001000",
      "--theme-border": "#004400",
      "--theme-text": "#00ff41",
      "--theme-muted": "#008822",
      "--theme-globe-opacity": "0.22",
    },
  },
  {
    id: "earth",
    label: "Earth",
    description: "أرضي — طبيعة ومحيطات وغابات",
    emoji: "🌍",
    globe: {
      grid:    "#2288aa",
      glow:    "#1166aa",
      core:    "#44bbdd",
      equator: "#33aacc",
      ambient: "rgba(34,136,170,0.08)",
      arcs: ["#2288aa","#22aa66","#44bbdd","#3388ff","#66cc44","#4499cc"],
    },
    bgCss: `
      radial-gradient(ellipse 90% 60% at 25% 35%, rgba(0,15,30,0.96) 0%, transparent 65%),
      radial-gradient(ellipse 70% 50% at 75% 70%, rgba(0,20,10,0.92) 0%, transparent 65%),
      radial-gradient(ellipse 110% 90% at 50% 50%, rgba(2,8,16,1) 35%, rgba(0,10,8,1) 100%)
    `,
    previewGradient: "linear-gradient(135deg,#020810 0%,#001e0a 45%,#001520 100%)",
    cssVars: {
      "--theme-bg": "#020810",
      "--theme-surface": "#041420",
      "--theme-border": "#0a3344",
      "--theme-text": "#aaddf0",
      "--theme-muted": "#336677",
      "--theme-globe-opacity": "0.24",
    },
  },
  {
    id: "dark",
    label: "Dark",
    description: "داكن — أنيق ومريح للعين",
    emoji: "🌑",
    globe: {
      grid:    "#e21227",
      glow:    "#aa0d1e",
      core:    "#ff2244",
      equator: "#dd1122",
      ambient: "rgba(226,18,39,0.06)",
      arcs: ["#e21227","#ff4455","#00e5ff","#a78bfa","#f97316","#00ff88"],
    },
    bgCss: `
      radial-gradient(ellipse 100% 100% at 50% 50%, rgba(8,8,8,1) 0%, rgba(5,5,5,1) 100%)
    `,
    previewGradient: "linear-gradient(135deg,#080808 0%,#111111 100%)",
    cssVars: {
      "--theme-bg": "#080808",
      "--theme-surface": "#0d0d0d",
      "--theme-border": "#1f1f1f",
      "--theme-text": "#ffffff",
      "--theme-muted": "#555555",
      "--theme-globe-opacity": "0.18",
    },
  },
  {
    id: "light",
    label: "Light",
    description: "فاتح — نظيف وعصري ومريح",
    emoji: "☀️",
    globe: {
      grid:    "#cc1122",
      glow:    "#aa0011",
      core:    "#ee2233",
      equator: "#dd1122",
      ambient: "rgba(200,10,30,0.05)",
      arcs: ["#cc1122","#0066cc","#8833cc","#cc6600","#009966","#cc3366"],
    },
    bgCss: `
      radial-gradient(ellipse 100% 100% at 50% 50%, rgba(248,248,252,1) 0%, rgba(240,240,248,1) 100%)
    `,
    previewGradient: "linear-gradient(135deg,#f8f8fc 0%,#e8e8f0 100%)",
    cssVars: {
      "--theme-bg": "#f8f8fc",
      "--theme-surface": "#ffffff",
      "--theme-border": "#e0e0e8",
      "--theme-text": "#111111",
      "--theme-muted": "#888888",
      "--theme-globe-opacity": "0.12",
    },
  },
  {
    id: "threatAlert",
    label: "Threat Alert",
    description: "تهديد عالمي — أحمر وبرتقالي مشتعل",
    emoji: "🚨",
    globe: {
      grid:    "#ff3300",
      glow:    "#cc2200",
      core:    "#ff5500",
      equator: "#ff4400",
      ambient: "rgba(255,51,0,0.1)",
      arcs: ["#ff3300","#ff6600","#ff0000","#ffaa00","#ff2200","#ff8800"],
    },
    bgCss: `
      radial-gradient(ellipse 80% 60% at 30% 30%, rgba(40,0,0,0.98) 0%, transparent 65%),
      radial-gradient(ellipse 80% 60% at 70% 70%, rgba(30,5,0,0.95) 0%, transparent 65%),
      radial-gradient(ellipse 100% 100% at 50% 50%, rgba(10,0,0,1) 35%, rgba(8,2,0,1) 100%)
    `,
    previewGradient: "linear-gradient(135deg,#0a0000 0%,#280500 45%,#1e0800 100%)",
    cssVars: {
      "--theme-bg": "#0a0000",
      "--theme-surface": "#160000",
      "--theme-border": "#550000",
      "--theme-text": "#ffccaa",
      "--theme-muted": "#883300",
      "--theme-globe-opacity": "0.30",
    },
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "أورورا — شفق قطبي بألوان رائعة",
    emoji: "🌈",
    globe: {
      grid:    "#44ffcc",
      glow:    "#22ccaa",
      core:    "#88ffdd",
      equator: "#55ffbb",
      ambient: "rgba(68,255,204,0.07)",
      arcs: ["#44ffcc","#aa44ff","#00ffaa","#ff44aa","#4488ff","#ffaa44"],
    },
    bgCss: `
      radial-gradient(ellipse 80% 60% at 20% 30%, rgba(0,20,25,0.96) 0%, transparent 60%),
      radial-gradient(ellipse 70% 50% at 80% 65%, rgba(10,0,30,0.92) 0%, transparent 60%),
      radial-gradient(ellipse 100% 100% at 50% 50%, rgba(2,8,12,1) 35%, rgba(5,2,15,1) 100%)
    `,
    previewGradient: "linear-gradient(135deg,#02080c 0%,#001418 40%,#05020f 100%)",
    cssVars: {
      "--theme-bg": "#02080c",
      "--theme-surface": "#081418",
      "--theme-border": "#0a3030",
      "--theme-text": "#ccffee",
      "--theme-muted": "#448866",
      "--theme-globe-opacity": "0.26",
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "dark";

export function getTheme(id: ThemeId): AppTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}
