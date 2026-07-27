/**
 * ProjectSwitcher — واجهة إدارة المشاريع (مساحات العمل المنفصلة)
 * يظهر كـ modal يتيح: إنشاء / تبديل / تعديل / حذف المشاريع
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, Check, FolderOpen, FolderClosed, ChevronRight, Settings, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
export type Project = {
  id: string;
  name: string;
  system_instructions: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_COLORS = ["#e21227", "#00e5ff", "#a78bfa", "#22c55e", "#f59e0b", "#f97316", "#ec4899", "#06b6d4"];

// ── API helpers ───────────────────────────────────────────────────────────────
const DEVICE_ID = (() => {
  let id = localStorage.getItem("mr7-device-id");
  if (!id) { id = `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem("mr7-device-id", id); }
  return id;
})();

const headers = { "Content-Type": "application/json", "x-device-id": DEVICE_ID };

async function fetchProjects(): Promise<Project[]> {
  const r = await fetch("/api/projects", { headers });
  if (!r.ok) throw new Error("Failed to load projects");
  const d = await r.json() as { projects: Project[] };
  return d.projects;
}
async function createProject(data: { name: string; system_instructions: string; color: string }): Promise<Project> {
  const r = await fetch("/api/projects", { method: "POST", headers, body: JSON.stringify(data) });
  if (!r.ok) throw new Error("Failed to create project");
  const d = await r.json() as { project: Project };
  return d.project;
}
async function updateProject(id: string, data: Partial<{ name: string; system_instructions: string; color: string }>): Promise<Project> {
  const r = await fetch(`/api/projects/${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
  if (!r.ok) throw new Error("Failed to update project");
  const d = await r.json() as { project: Project };
  return d.project;
}
async function deleteProject(id: string): Promise<void> {
  await fetch(`/api/projects/${id}`, { method: "DELETE", headers });
}

// ── Component ─────────────────────────────────────────────────────────────────
interface ProjectSwitcherProps {
  open: boolean;
  onClose: () => void;
  activeProjectId: string | null;
  onSelectProject: (project: Project | null) => void;
}

export function ProjectSwitcher({ open, onClose, activeProjectId, onSelectProject }: ProjectSwitcherProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", system_instructions: "", color: DEFAULT_COLORS[0] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProjects(await fetchProjects()); }
    catch { toast({ description: "تعذّر تحميل المشاريع", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { if (open) { load(); setView("list"); } }, [open, load]);

  function startCreate() {
    setForm({ name: "", system_instructions: "", color: DEFAULT_COLORS[0] });
    setView("create");
  }

  function startEdit(p: Project) {
    setEditTarget(p);
    setForm({ name: p.name, system_instructions: p.system_instructions, color: p.color });
    setView("edit");
  }

  async function handleSave() {
    if (!form.name.trim()) { toast({ description: "أدخل اسماً للمشروع" }); return; }
    setSaving(true);
    try {
      if (view === "create") {
        const proj = await createProject({ name: form.name, system_instructions: form.system_instructions, color: form.color });
        setProjects(p => [...p, proj]);
        toast({ description: `✅ تم إنشاء المشروع "${proj.name}"` });
      } else if (view === "edit" && editTarget) {
        const proj = await updateProject(editTarget.id, { name: form.name, system_instructions: form.system_instructions, color: form.color });
        setProjects(p => p.map(x => x.id === proj.id ? proj : x));
        toast({ description: `✅ تم تحديث المشروع "${proj.name}"` });
      }
      setView("list");
    } catch (e) {
      toast({ description: e instanceof Error ? e.message : "فشل الحفظ", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleDelete(p: Project) {
    if (!confirm(`هل تريد حذف المشروع "${p.name}"؟ ستظل المحادثات موجودة.`)) return;
    try {
      await deleteProject(p.id);
      setProjects(prev => prev.filter(x => x.id !== p.id));
      if (activeProjectId === p.id) onSelectProject(null);
      toast({ description: `🗑 تم حذف "${p.name}"` });
    } catch {
      toast({ description: "فشل الحذف", variant: "destructive" });
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(135deg, rgba(6,8,20,0.99) 0%, rgba(10,12,28,0.99) 100%)",
              border: "1px solid rgba(226,18,39,0.25)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(226,18,39,0.08)",
              maxHeight: "80vh",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)" }}>
                  <FolderOpen className="w-4 h-4" style={{ color: "#e21227" }} />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">
                    {view === "list" ? "مشاريعي" : view === "create" ? "مشروع جديد" : "تعديل المشروع"}
                  </p>
                  <p className="text-[10px] text-white/40 font-mono">مساحات عمل منفصلة · Projects</p>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {view === "list" ? (
                <div className="space-y-3">
                  {/* "No project" option */}
                  <button
                    onClick={() => { onSelectProject(null); onClose(); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right ${!activeProjectId ? "ring-1 ring-white/20" : "hover:bg-white/5"}`}
                    style={{ background: !activeProjectId ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)" }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <FolderClosed className="w-4 h-4 text-white/40" />
                    </div>
                    <div className="flex-1 min-w-0 text-start">
                      <p className="text-sm font-medium text-white/80">المحادثات العامة</p>
                      <p className="text-[10px] text-white/40">بدون مشروع محدد</p>
                    </div>
                    {!activeProjectId && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  </button>

                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                    </div>
                  )}

                  {projects.map(p => (
                    <div key={p.id} className="group relative">
                      <button
                        onClick={() => { onSelectProject(p); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right ${activeProjectId === p.id ? "ring-1" : "hover:bg-white/5"}`}
                        style={{
                          background: activeProjectId === p.id ? `${p.color}14` : "rgba(255,255,255,0.02)",
                          borderColor: activeProjectId === p.id ? `${p.color}40` : "transparent",
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${p.color}20`, border: `1px solid ${p.color}40` }}
                        >
                          <FolderOpen className="w-4 h-4" style={{ color: p.color }} />
                        </div>
                        <div className="flex-1 min-w-0 text-start">
                          <p className="text-sm font-semibold truncate" style={{ color: activeProjectId === p.id ? p.color : "rgba(255,255,255,0.85)" }}>
                            {p.name}
                          </p>
                          {p.system_instructions && (
                            <p className="text-[10px] text-white/40 truncate">{p.system_instructions.slice(0, 60)}</p>
                          )}
                        </div>
                        {activeProjectId === p.id && <Check className="w-4 h-4 flex-shrink-0" style={{ color: p.color }} />}
                      </button>
                      {/* Edit/Delete buttons */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/15 text-white/50 hover:text-white transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Create button */}
                  <button
                    onClick={startCreate}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed transition-all hover:bg-white/5 text-white/40 hover:text-white/70"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-sm">إنشاء مشروع جديد</span>
                  </button>
                </div>
              ) : (
                /* Create / Edit form */
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">اسم المشروع *</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="مثال: مشروع تطوير الويب"
                      autoFocus
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-1 transition-all"
                      style={{
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">اللون</label>
                    <div className="flex gap-2 flex-wrap">
                      {DEFAULT_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setForm(f => ({ ...f, color: c }))}
                          className="w-7 h-7 rounded-lg transition-all"
                          style={{
                            background: c,
                            transform: form.color === c ? "scale(1.25)" : "scale(1)",
                            boxShadow: form.color === c ? `0 0 12px ${c}` : "none",
                            outline: form.color === c ? `2px solid white` : "none",
                            outlineOffset: "2px",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* System instructions */}
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">تعليمات النظام (اختياري)</label>
                    <textarea
                      value={form.system_instructions}
                      onChange={e => setForm(f => ({ ...f, system_instructions: e.target.value }))}
                      placeholder="ستُحقن هذه التعليمات تلقائياً في بداية كل محادثة ضمن هذا المشروع..."
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none transition-all"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setView("list")}
                      className="flex-1 py-2.5 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !form.name.trim()}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}99)` }}
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {view === "create" ? "إنشاء المشروع" : "حفظ التغييرات"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
