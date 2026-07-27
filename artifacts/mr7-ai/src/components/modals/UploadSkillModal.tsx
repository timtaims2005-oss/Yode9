import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FolderOpen, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { saveSkill, parseSkillMarkdown, type UserSkillSource } from "@/lib/skillsEngine";
import { createFile } from "@/lib/filesEngine";
import JSZip from "jszip";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (name: string) => void;
}

const COL = "#e21227";

export function UploadSkillModal({ open, onClose, onSaved }: Props) {
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function processFile(file: File) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const ext = file.name.toLowerCase();
      if (ext.endsWith(".md")) {
        const text = await file.text();
        const parsed = parseSkillMarkdown(text);
        saveSkill({
          name: parsed.name ?? file.name.replace(".md", ""),
          description: parsed.description ?? "",
          triggers: parsed.triggers ?? [],
          instructions: parsed.instructions ?? text,
          source: "uploaded" as UserSkillSource,
          isCustom: true,
          linkedFileIds: [],
        });
        setSuccess(parsed.name ?? file.name);
        setTimeout(() => { onSaved(parsed.name ?? file.name); onClose(); }, 1200);

      } else if (ext.endsWith(".zip") || ext.endsWith(".skill")) {
        const buf = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buf);
        // Search for SKILL.md inside the zip
        const skillFile = Object.values(zip.files).find((f) =>
          f.name.toLowerCase().endsWith("skill.md") && !f.dir,
        );
        if (!skillFile) throw new Error("لم يتم العثور على SKILL.md داخل الملف المضغوط.");
        const mdText = await skillFile.async("string");
        const parsed = parseSkillMarkdown(mdText);
        const linkedFileIds: string[] = [];
        // Save additional files
        for (const [path, entry] of Object.entries(zip.files)) {
          if (entry.dir || path.toLowerCase().endsWith("skill.md")) continue;
          const content = await entry.async("string");
          const name = path.split("/").pop() || path;
          const wf = createFile(name, content, path, []);
          linkedFileIds.push(wf.id);
        }
        saveSkill({
          name: parsed.name ?? file.name,
          description: parsed.description ?? "",
          triggers: parsed.triggers ?? [],
          instructions: parsed.instructions ?? mdText,
          source: "uploaded" as UserSkillSource,
          isCustom: true,
          linkedFileIds,
        });
        setSuccess(parsed.name ?? file.name);
        setTimeout(() => { onSaved(parsed.name ?? file.name); onClose(); }, 1200);
      } else {
        throw new Error("نوع الملف غير مدعوم. يُرجى رفع ملف .md أو .zip أو .skill");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل معالجة الملف.");
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  if (!open) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-[480px] max-w-[95vw] rounded-2xl border shadow-2xl"
          style={{ background: "#0a0a0a", borderColor: "#1f1f1f" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1f1f1f" }}>
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" style={{ color: COL }} />
              <span className="text-[13px] font-bold text-white">Upload a Skill</span>
            </div>
            <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Drop zone */}
            <div
              ref={dropRef}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all py-10"
              style={{
                borderColor: dragging ? COL : "#2a2a2a",
                background: dragging ? `${COL}08` : "#0f0f0f",
              }}
            >
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: COL }} />
              ) : success ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <FolderOpen className="w-8 h-8" style={{ color: "#333" }} />
              )}
              <div className="text-center">
                <div className="text-[12px] font-semibold text-white">
                  {loading ? "جارٍ المعالجة…" : success ? `تم حفظ: ${success}` : "Drag and drop or click to upload"}
                </div>
                {!loading && !success && (
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>
                    .md · .zip · .skill
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".md,.zip,.skill"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
              />
            </div>

            {/* Format notes */}
            <div className="space-y-1.5 text-[10px]" style={{ color: "#555" }}>
              <div className="flex items-start gap-1.5">
                <span style={{ color: COL }}>•</span>
                <span><span className="text-white/60">.md file</span> must contain skill name and description formatted in YAML</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span style={{ color: COL }}>•</span>
                <span><span className="text-white/60">.zip or .skill file</span> must include a SKILL.md file</span>
              </div>
            </div>

            {/* YAML example */}
            <div className="rounded-lg p-3 text-[9px] font-mono leading-relaxed" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", color: "#555" }}>
              <div style={{ color: "#444" }}>{"# SKILL.md example"}</div>
              <div style={{ color: COL + "99" }}>---</div>
              <div><span style={{ color: "#888" }}>name:</span> My Custom Skill</div>
              <div><span style={{ color: "#888" }}>description:</span> What this skill does</div>
              <div><span style={{ color: "#888" }}>triggers:</span> keyword1, keyword2</div>
              <div style={{ color: COL + "99" }}>---</div>
              <div style={{ color: "#555" }}>Full system prompt instructions here…</div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-[11px] text-red-400 rounded-lg p-2" style={{ background: "#ff000010", border: "1px solid #ff000030" }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
