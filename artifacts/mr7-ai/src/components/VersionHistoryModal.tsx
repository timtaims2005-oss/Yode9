import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, History, RotateCcw, GitCompare, Check } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface VersionSummary {
  id: number;
  versionNumber: number;
  createdAt: string;
  size: number;
  lines: number;
  preview: string;
}

interface DiffChange {
  count?: number;
  added?: boolean;
  removed?: boolean;
  value: string;
}

interface VersionHistoryModalProps {
  projectId: string;
  filename: string;
  onClose: () => void;
  onRestored: (content: string) => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

export function VersionHistoryModal({ projectId, filename, onClose, onRestored }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);
  const [diff, setDiff] = useState<DiffChange[] | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [restoredMsg, setRestoredMsg] = useState<string | null>(null);

  const encodedName = encodeURIComponent(filename);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${encodedName}/versions`);
      if (!res.ok) throw new Error((await res.json()).error ?? "فشل تحميل سجل النسخ");
      const data = await res.json();
      setVersions(data.versions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setLoading(false);
    }
  }, [projectId, encodedName]);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  const toggleCompare = useCallback((versionNumber: number) => {
    setDiff(null);
    if (compareA === versionNumber) { setCompareA(null); return; }
    if (compareB === versionNumber) { setCompareB(null); return; }
    if (compareA === null) { setCompareA(versionNumber); return; }
    if (compareB === null) { setCompareB(versionNumber); return; }
    // both slots full — replace the first
    setCompareA(versionNumber);
    setCompareB(null);
  }, [compareA, compareB]);

  const runDiff = useCallback(async () => {
    if (compareA === null || compareB === null) return;
    const from = Math.min(compareA, compareB);
    const to = Math.max(compareA, compareB);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${encodedName}/diff?from=${from}&to=${to}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "فشل حساب الفرق");
      const data = await res.json();
      setDiff(data.changes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    }
  }, [projectId, encodedName, compareA, compareB]);

  const restore = useCallback(async (versionNumber: number) => {
    setRestoring(versionNumber);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${encodedName}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "فشل الاستعادة");
      const data = await res.json();
      onRestored(data.content);
      setRestoredMsg(`تمت الاستعادة كنسخة جديدة (v${data.newVersionNumber})`);
      await loadVersions();
      setTimeout(() => setRestoredMsg(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setRestoring(null);
    }
  }, [projectId, encodedName, onRestored, loadVersions]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col rounded-xl border overflow-hidden"
        style={{
          width: "min(720px, 92vw)",
          maxHeight: "80vh",
          background: "linear-gradient(180deg, rgba(10,12,24,0.99) 0%, rgba(6,8,16,0.99) 100%)",
          borderColor: "rgba(139,92,246,0.25)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 flex-shrink-0" style={{ color: "#a78bfa" }} />
            <span className="font-mono text-xs text-white/80 truncate">سجل النسخ — {filename}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
              {versions.length}/50
            </span>
          </div>
          <button onClick={onClose} className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-500/20 hover:text-red-400" style={{ color: "rgba(255,255,255,0.4)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b text-[10px] font-mono" style={{ borderColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
          <span>اختر نسختين للمقارنة (فرق)، أو اضغط استعادة لإرجاع نسخة كحالية</span>
          <button
            onClick={runDiff}
            disabled={compareA === null || compareB === null}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 disabled:opacity-40"
            style={{ color: "#60a5fa" }}
          >
            <GitCompare className="w-3 h-3" /> عرض الفرق
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading && <div className="text-white/30 text-xs font-mono text-center py-6">جارٍ التحميل…</div>}
          {error && <div className="text-red-400 text-xs font-mono py-2">{error}</div>}
          {restoredMsg && (
            <div className="flex items-center gap-1 text-green-400 text-xs font-mono py-1">
              <Check className="w-3 h-3" /> {restoredMsg}
            </div>
          )}

          {!loading && versions.length === 0 && (
            <div className="text-white/30 text-xs font-mono text-center py-6">لا توجد نسخ محفوظة لهذا الملف بعد</div>
          )}

          {!loading && versions.map((v) => {
            const selected = compareA === v.versionNumber || compareB === v.versionNumber;
            return (
              <div
                key={v.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
                style={{
                  borderColor: selected ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.06)",
                  background: selected ? "rgba(96,165,250,0.08)" : "rgba(255,255,255,0.02)",
                }}
              >
                <button onClick={() => toggleCompare(v.versionNumber)} className="flex-1 text-right min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span style={{ color: "#a78bfa" }}>v{v.versionNumber}</span>
                    <span className="text-white/40">{formatTime(v.createdAt)}</span>
                    <span className="text-white/30">· {v.lines} سطر · {v.size} حرف</span>
                  </div>
                  <div className="text-[11px] text-white/50 truncate mt-0.5 font-mono">{v.preview || "(ملف فارغ)"}</div>
                </button>
                <button
                  onClick={() => restore(v.versionNumber)}
                  disabled={restoring === v.versionNumber}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono hover:bg-white/10 disabled:opacity-40 flex-shrink-0"
                  style={{ color: "#22c55e" }}
                  title="استعادة هذه النسخة كنسخة جديدة"
                >
                  <RotateCcw className="w-3 h-3" />
                  {restoring === v.versionNumber ? "…" : "استعادة"}
                </button>
              </div>
            );
          })}

          {diff && (
            <div className="mt-3 rounded-lg border p-3 font-mono text-[11px] leading-relaxed" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)" }}>
              {diff.map((c, i) => (
                <div
                  key={i}
                  style={{
                    color: c.added ? "#22c55e" : c.removed ? "#f87171" : "rgba(255,255,255,0.4)",
                    background: c.added ? "rgba(34,197,94,0.08)" : c.removed ? "rgba(248,113,113,0.08)" : "transparent",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {c.added ? "+ " : c.removed ? "- " : "  "}
                  {c.value}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
