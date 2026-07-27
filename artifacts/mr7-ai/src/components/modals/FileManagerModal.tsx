import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, FolderOpen, FilePlus, Save, Trash2, Link as LinkIcon,
  File, Search, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
  listFiles, createFile, updateFile, deleteFile, type WorkspaceFile,
} from "@/lib/filesEngine";
import { getAllSkills, type UserSkill } from "@/lib/skillsEngine";
// getUserSkill imported if needed for future use

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const COL = "#e21227";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("ar-EG", { month: "short", day: "numeric", year: "numeric" });
}

export function FileManagerModal({ open, onOpenChange }: Props) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [selected, setSelected] = useState<WorkspaceFile | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editPath, setEditPath] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPath, setNewPath] = useState("");
  const [newContent, setNewContent] = useState("");
  const [search, setSearch] = useState("");
  const [linkedSkillId, setLinkedSkillId] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [panel, setPanel] = useState<"list" | "new">("list");
  const textRef = useRef<HTMLTextAreaElement>(null);

  function refresh() {
    setFiles(listFiles());
    setSkills(getAllSkills());
  }

  useEffect(() => { if (open) refresh(); }, [open]);

  function selectFile(f: WorkspaceFile) {
    setSelected(f);
    setEditContent(f.content);
    setEditPath(f.path);
    setLinkedSkillId(f.linkedSkillId || "");
    setIsNew(false);
    setPanel("list");
  }

  function handleSave() {
    if (!selected) return;
    updateFile(selected.id, {
      content: editContent,
      path: editPath,
      name: editPath.split("/").pop() || editPath,
      linkedSkillId: linkedSkillId || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    refresh();
    setSelected((s) => s ? { ...s, content: editContent, path: editPath } : s);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    const f = createFile(newName.trim(), newContent, newPath || newName.trim(), []);
    if (linkedSkillId) updateFile(f.id, { linkedSkillId });
    refresh();
    setPanel("list");
    setNewName(""); setNewPath(""); setNewContent(""); setLinkedSkillId("");
    selectFile({ ...f, linkedSkillId: linkedSkillId || undefined });
  }

  function handleDelete(id: string) {
    deleteFile(id);
    if (selected?.id === id) { setSelected(null); setEditContent(""); }
    setDeleteConfirm(null);
    refresh();
  }

  const filtered = files.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.path.toLowerCase().includes(search.toLowerCase()),
  );

  if (!open) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="relative flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
          style={{ width: 860, maxWidth: "96vw", height: 580, maxHeight: "90vh", background: "#0a0a0a", borderColor: "#1f1f1f" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0" style={{ borderColor: "#1f1f1f" }}>
            <FolderOpen className="w-4 h-4" style={{ color: COL }} />
            <span className="text-[13px] font-bold text-white">Workspace Files</span>
            <div className="flex-1" />
            <button
              onClick={() => { setPanel("new"); setSelected(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{ background: `${COL}15`, border: `1px solid ${COL}30`, color: COL }}
            >
              <FilePlus className="w-3.5 h-3.5" />
              + ملف جديد
            </button>
            <button onClick={() => onOpenChange(false)} className="text-[#444] hover:text-white ml-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left: file list */}
            <div className="w-56 shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: "#1a1a1a" }}>
              <div className="p-2 border-b" style={{ borderColor: "#1a1a1a" }}>
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: "#111" }}>
                  <Search className="w-3 h-3 text-[#444]" />
                  <input
                    className="flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-[#333]"
                    placeholder="بحث في الملفات…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-[10px]" style={{ color: "#333" }}>
                    <File className="w-6 h-6" />
                    لا توجد ملفات
                  </div>
                )}
                {filtered.map((f) => (
                  <div key={f.id} className="group relative">
                    <button
                      onClick={() => selectFile(f)}
                      className="w-full text-left px-3 py-2 border-b flex items-start gap-2 transition-colors hover:bg-white/3"
                      style={{ borderColor: "#111", background: selected?.id === f.id ? `${COL}08` : "transparent" }}
                    >
                      <File className="w-3 h-3 mt-0.5 shrink-0" style={{ color: selected?.id === f.id ? COL : "#444" }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-semibold truncate" style={{ color: selected?.id === f.id ? COL : "#bbb" }}>{f.name}</div>
                        <div className="text-[8px] truncate mt-0.5" style={{ color: "#444" }}>{f.path}</div>
                        <div className="text-[8px] mt-0.5" style={{ color: "#333" }}>{formatDate(f.updatedAt)}</div>
                      </div>
                    </button>
                    {deleteConfirm === f.id ? (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 z-10" style={{ background: "#0a0a0aee" }}>
                        <button onClick={() => handleDelete(f.id)} className="text-[9px] px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400">حذف</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">إلغاء</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(f.id); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[#333] hover:text-red-400"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: editor / new file form */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {panel === "new" ? (
                <div className="flex flex-col gap-4 p-5 overflow-y-auto">
                  <div className="text-[11px] font-bold text-white">ملف جديد</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[9px] text-[#555] mb-1">الاسم *</div>
                      <input
                        className="w-full rounded-lg px-3 py-2 text-[11px] text-white outline-none"
                        style={{ background: "#111", border: "1px solid #222" }}
                        placeholder="example.md"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-[9px] text-[#555] mb-1">المسار</div>
                      <input
                        className="w-full rounded-lg px-3 py-2 text-[11px] text-white outline-none"
                        style={{ background: "#111", border: "1px solid #222" }}
                        placeholder="/docs/example.md"
                        value={newPath}
                        onChange={(e) => setNewPath(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#555] mb-1">ربط بـ Skill</div>
                    <select
                      className="w-full rounded-lg px-3 py-2 text-[11px] text-white outline-none"
                      style={{ background: "#111", border: "1px solid #222" }}
                      value={linkedSkillId}
                      onChange={(e) => setLinkedSkillId(e.target.value)}
                    >
                      <option value="">— بدون ربط —</option>
                      {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] text-[#555] mb-1">المحتوى</div>
                    <textarea
                      className="w-full rounded-lg px-3 py-2 text-[11px] text-white outline-none font-mono resize-none"
                      style={{ background: "#111", border: "1px solid #222", minHeight: 200 }}
                      placeholder="محتوى الملف…"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setPanel("list")} className="px-4 py-2 rounded-lg text-[10px] text-[#555] hover:text-white transition-colors">إلغاء</button>
                    <button
                      onClick={handleCreate}
                      disabled={!newName.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40"
                      style={{ background: COL, color: "white" }}
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      إنشاء
                    </button>
                  </div>
                </div>
              ) : !selected ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: "#2a2a2a" }}>
                  <FolderOpen className="w-12 h-12" />
                  <div className="text-[11px]">اختر ملفاً للتعديل أو أنشئ ملفاً جديداً</div>
                </div>
              ) : (
                <div className="flex flex-col h-full overflow-hidden">
                  {/* File header */}
                  <div className="px-4 py-2.5 border-b shrink-0 flex items-center gap-3" style={{ borderColor: "#1a1a1a" }}>
                    <File className="w-3.5 h-3.5 shrink-0" style={{ color: COL }} />
                    <input
                      className="flex-1 bg-transparent text-[11px] font-semibold text-white outline-none"
                      value={editPath}
                      onChange={(e) => setEditPath(e.target.value)}
                    />
                    <div className="flex items-center gap-1.5">
                      <LinkIcon className="w-3 h-3" style={{ color: "#444" }} />
                      <select
                        className="bg-transparent text-[9px] outline-none"
                        style={{ color: "#555" }}
                        value={linkedSkillId}
                        onChange={(e) => setLinkedSkillId(e.target.value)}
                      >
                        <option value="">بدون ربط</option>
                        {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
                      style={{ background: saved ? "#22c55e15" : `${COL}15`, border: `1px solid ${saved ? "#22c55e40" : COL + "30"}`, color: saved ? "#22c55e" : COL }}
                    >
                      {saved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                      {saved ? "محفوظ" : "حفظ"}
                    </button>
                    <button onClick={() => setDeleteConfirm(selected.id)} className="text-[#333] hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Editor */}
                  <div className="flex-1 overflow-hidden">
                    <textarea
                      ref={textRef}
                      className="w-full h-full px-4 py-3 text-[11px] font-mono text-white/80 outline-none resize-none"
                      style={{ background: "transparent", lineHeight: "1.7" }}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      spellCheck={false}
                    />
                  </div>
                  {deleteConfirm === selected.id && (
                    <div className="px-4 py-2.5 border-t flex items-center gap-3" style={{ borderColor: "#1a1a1a", background: "#0f0f0f" }}>
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-[10px] text-red-400 flex-1">هل تريد حذف هذا الملف؟</span>
                      <button onClick={() => handleDelete(selected.id)} className="text-[9px] px-3 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-400">حذف</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-[9px] px-3 py-1 rounded bg-white/5 border border-white/10 text-white/50">إلغاء</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
