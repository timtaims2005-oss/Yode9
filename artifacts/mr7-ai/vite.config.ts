import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay({ hmrOverlay: false }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    target: "es2022",
    chunkSizeWarningLimit: 900,
    minify: "esbuild",
    cssMinify: true,
    cssCodeSplit: true,
    reportCompressedSize: false,
    sourcemap: false,
    rollupOptions: {
      treeshake: { moduleSideEffects: "no-external" },
      output: {
        // Keep each chunk small — lazy-loaded heavy modules get their own chunk
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          // ── Vendor: React core (must be a single chunk) ──────────────────
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          // ── Vendor: Framer Motion (large, lazy-load candidate) ───────────
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-framer";
          }
          // ── Vendor: Three.js + R3F (very large, async only) ─────────────
          if (id.includes("node_modules/three") || id.includes("node_modules/@react-three")) {
            return "vendor-three";
          }
          // ── Vendor: Radix UI (shared by many modals) ─────────────────────
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          // ── Vendor: TanStack Query ────────────────────────────────────────
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-tanstack";
          }
          // ── Vendor: Lucide icons (icon font — medium) ────────────────────
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-lucide";
          }
          // ── Vendor: Wouter router ─────────────────────────────────────────
          if (id.includes("node_modules/wouter")) {
            return "vendor-wouter";
          }
          // ── Vendor: Xterm terminal ────────────────────────────────────────
          if (id.includes("node_modules/@xterm") || id.includes("node_modules/xterm")) {
            return "vendor-xterm";
          }
          // ── Vendor: Monaco editor ─────────────────────────────────────────
          if (id.includes("node_modules/monaco-editor") || id.includes("node_modules/@monaco-editor")) {
            return "vendor-monaco";
          }
            // ── App: 3D components — isolated chunk (always async) ───────────
          if (id.includes("/components/3d/") || id.includes("/components/FuturisticBackground")) {
            return "app-3d";
          }
          // NOTE: modals are already lazy() in App.tsx — do NOT force them
          // into a single chunk here. Let Vite split them by dynamic import
          // boundary naturally (~20-80 KB each, loaded on demand).
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "framer-motion",
      "lucide-react",
      "@tanstack/react-query",
      "three",
      "wouter",
      "@radix-ui/react-dialog",
      "@radix-ui/react-tooltip",
    ],
    exclude: [
      "@monaco-editor/react",
    ],
  },
  esbuild: {
    target: "es2022",
    logOverride: { "this-is-undefined-in-esm": "silent" },
    legalComments: "none",
    treeShaking: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/components/ChatView.tsx",
        "./src/components/TopBar.tsx",
        "./src/components/Sidebar.tsx",
      ],
    },
    hmr: { timeout: 5000 },
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
