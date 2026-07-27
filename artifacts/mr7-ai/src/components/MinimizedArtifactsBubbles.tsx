/**
 * MinimizedArtifactsBubbles
 * Renders a floating pill for each minimized artifact (bottom-left, above chat HUD).
 * Clicking a pill re-opens the full ArtifactPage with the exact saved state.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { useMinimizedArtifacts, type MinimizedArtifact } from "@/state/minimizedArtifacts";
import { ArtifactPage } from "@/components/ArtifactPanel-v3";

// Same colour map as ArtifactPanel-v3 (duplicated to avoid coupling)
const LANG_META: Record<string, { color: string; bg: string; symbol: string; label: string }> = {
  html:       { color: "#e34c26", bg: "rgba(227,76,38,.18)",  symbol: "⟨/⟩", label: "HTML"       },
  react:      { color: "#61dafb", bg: "rgba(97,218,251,.15)", symbol: "⚛",   label: "React"      },
  javascript: { color: "#f7df1e", bg: "rgba(247,223,30,.15)", symbol: "JS",  label: "JavaScript" },
};

const C = {
  panel:   "#13112a",
  borderHi:"#3d3870",
  text:    "#f0ecff",
  muted:   "#7368a0",
  teal:    "#2dd4bf",
  accent:  "#8b5cf6",
};

// CSS once
if (typeof document !== "undefined") {
  const id = "__mab_css";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @keyframes mab-in{from{opacity:0;transform:translateY(14px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
      .mab-pill{animation:mab-in .22s cubic-bezier(.34,1.56,.64,1) both;transition:box-shadow .18s,transform .18s}
      .mab-pill:hover{box-shadow:0 12px 40px rgba(139,92,246,.35),0 0 0 1px #8b5cf6!important;transform:translateY(-2px)}
      .mab-x:hover{background:rgba(248,113,113,.18)!important;color:#f87171!important}
    `;
    document.head.appendChild(s);
  }
}

function Pill({ item }: { item: MinimizedArtifact }) {
  const { minimize, remove } = useMinimizedArtifacts();
  const [open, setOpen] = useState(false);
  const m = LANG_META[item.language] ?? LANG_META.html;

  const handleRestore = () => setOpen(true);

  const handleClose = () => {
    // "Close" from restored ArtifactPage = final close → remove from store
    setOpen(false);
    remove(item.artifactId);
  };

  const handleMinimizeAgain = (updated: MinimizedArtifact) => {
    // ArtifactPage calls this before calling onClose — update the stored state
    minimize(updated);
    setOpen(false);
  };

  return (
    <>
      {/* The floating pill bubble */}
      <button
        className="mab-pill"
        onClick={handleRestore}
        title={`استعادة: ${item.title}`}
        style={{
          display:"flex", alignItems:"center", gap:8,
          background:C.panel,
          border:`1px solid ${C.borderHi}`,
          borderRadius:50, padding:"8px 12px 8px 10px",
          cursor:"pointer", outline:"none",
          boxShadow:`0 6px 24px rgba(0,0,0,.55), 0 0 0 1px ${C.accent}22`,
          maxWidth:220, flexShrink:0,
        }}
      >
        {/* Lang badge */}
        <div style={{
          width:28, height:28, borderRadius:"50%", flexShrink:0,
          background:m.bg, border:`1px solid ${m.color}44`,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:m.color, fontSize:12, fontWeight:700,
        }}>{m.symbol}</div>

        {/* Title */}
        <div style={{ minWidth:0, textAlign:"right", flex:1 }}>
          <div style={{
            color:C.text, fontSize:11, fontWeight:600,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            maxWidth:110,
          }}>{item.title}</div>
          <div style={{ color:C.muted, fontSize:9 }}>{m.label} · انقر للاستعادة</div>
        </div>

        {/* X button (stop propagation so it doesn't restore) */}
        <button
          className="mab-x"
          onClick={e => { e.stopPropagation(); remove(item.artifactId); }}
          title="إغلاق نهائي"
          style={{
            width:18, height:18, borderRadius:"50%", flexShrink:0,
            border:"none", background:"transparent", cursor:"pointer",
            color:C.muted, fontSize:12, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all .15s",
          }}
        >✕</button>
      </button>

      {/* Restored full-screen overlay */}
      {open && (
        <ArtifactPage
          title={item.title}
          language={item.language}
          code={item.editCode}
          artifactId={item.artifactId}
          initialEditCode={item.editCode}
          initialView={item.view}
          onClose={handleClose}
          onMinimize={handleMinimizeAgain}
        />
      )}
    </>
  );
}

export function MinimizedArtifactsBubbles() {
  const { minimized } = useMinimizedArtifacts();
  if (minimized.length === 0) return null;

  return createPortal(
    <div style={{
      position:"fixed",
      bottom:20, left:16,
      zIndex:9000, // above chat HUD (z-85/90), below ArtifactPage overlay (9999)
      display:"flex", flexDirection:"column", gap:8,
      alignItems:"flex-start",
      pointerEvents:"none", // let children handle their own clicks
    }}>
      {minimized.map(item => (
        <div key={item.artifactId} style={{ pointerEvents:"auto" }}>
          <Pill item={item} />
        </div>
      ))}
    </div>,
    document.body,
  );
}
