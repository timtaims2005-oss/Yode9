import { useState, useEffect } from "react";
import { X, Plus, Clock, Play, Pause, Trash2, Calendar, Zap, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  prompt: string;
  model: string;
  cron_expr: string;
  is_enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  error_count: number;
  created_at: string;
}

interface Run {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "done" | "error";
  output: string;
  error: string;
  tokens_used: number;
}

const CRON_PRESETS = [
  { label: "كل دقيقة",         value: "* * * * *" },
  { label: "كل 5 دقائق",       value: "*/5 * * * *" },
  { label: "كل ساعة",          value: "0 * * * *" },
  { label: "يومياً الساعة 9",  value: "0 9 * * *" },
  { label: "يومياً الساعة 18", value: "0 18 * * *" },
  { label: "أسبوعياً الاثنين", value: "0 9 * * 1" },
  { label: "شهرياً الأول",     value: "0 9 1 * *" },
];

const EXAMPLE_PROMPTS = [
  "اذكرني بمراجعة الأهداف اليومية وتقييم التقدم",
  "قم بتلخيص آخر التطورات في مجال الذكاء الاصطناعي",
  "أنشئ تقريراً عن أبرز CVEs الجديدة من هذا الأسبوع",
  "اقترح 3 أفكار إبداعية للمشروع",
];

const OWNER_ID = typeof window !== "undefined" ? (localStorage.getItem("mr7_device_id") || "local-user") : "local-user";

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 0) {
    const f = -diff;
    if (f < 60000) return `بعد ${Math.round(f / 1000)} ث`;
    if (f < 3600000) return `بعد ${Math.round(f / 60000)} د`;
    if (f < 86400000) return `بعد ${Math.round(f / 3600000)} س`;
    return `بعد ${Math.round(f / 86400000)} يوم`;
  }
  if (diff < 60000) return `منذ ${Math.round(diff / 1000)} ث`;
  if (diff < 3600000) return `منذ ${Math.round(diff / 60000)} د`;
  if (diff < 86400000) return `منذ ${Math.round(diff / 3600000)} س`;
  return d.toLocaleDateString("ar");
}

export function ScheduledTasksModal({ open, onClose }: Props) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [taskRuns, setTaskRuns] = useState<Record<string, Run[]>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", description: "", prompt: "",
    model: "gpt-4o", cron_expr: "0 9 * * *",
  });

  useEffect(() => {
    if (open) loadTasks();
  }, [open]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scheduled?owner_id=${encodeURIComponent(OWNER_ID)}`);
      const data = await res.json() as { tasks: ScheduledTask[] };
      setTasks(data.tasks ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const createTask = async () => {
    if (!form.name || !form.prompt) { toast({ description: "الاسم والمهمة مطلوبان", variant: "destructive" }); return; }
    const res = await fetch("/api/scheduled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, owner_id: OWNER_ID }),
    });
    if (res.ok) {
      toast({ description: "تم إنشاء المهمة" });
      setShowCreate(false);
      setForm({ name: "", description: "", prompt: "", model: "gpt-4o", cron_expr: "0 9 * * *" });
      loadTasks();
    }
  };

  const toggleTask = async (id: string) => {
    const res = await fetch(`/api/scheduled/${id}/toggle`, { method: "POST" });
    if (res.ok) loadTasks();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("هل أنت متأكد؟")) return;
    await fetch(`/api/scheduled/${id}`, { method: "DELETE" });
    loadTasks();
  };

  const runNow = async (id: string) => {
    setRunning(r => ({ ...r, [id]: true }));
    try {
      const res = await fetch(`/api/scheduled/${id}/run`, { method: "POST" });
      const data = await res.json() as { ok: boolean; output?: string; error?: string };
      if (data.ok) {
        toast({ description: "تم التنفيذ" });
        loadTasks();
        // Reload runs if expanded
        if (expanded === id) loadRuns(id);
      } else {
        toast({ description: data.error ?? "فشل التنفيذ", variant: "destructive" });
      }
    } catch { toast({ description: "فشل الاتصال", variant: "destructive" }); }
    finally { setRunning(r => ({ ...r, [id]: false })); }
  };

  const loadRuns = async (id: string) => {
    try {
      const res = await fetch(`/api/scheduled/${id}`);
      const data = await res.json() as { runs: Run[] };
      setTaskRuns(r => ({ ...r, [id]: data.runs ?? [] }));
    } catch { /* ignore */ }
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); }
    else { setExpanded(id); loadRuns(id); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl h-[85vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#e21227]" />
            <span className="font-bold text-white">المهام المجدولة</span>
            <span className="text-xs text-muted-foreground">Scheduled Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="bg-[#e21227] hover:bg-[#b5000f] text-white gap-1 text-xs h-7">
              <Plus className="w-3 h-3" /> مهمة جديدة
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="border-b border-[#1f1f1f] p-4 space-y-3 bg-[#080808]">
            <p className="text-sm font-medium text-white">إنشاء مهمة جديدة</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الاسم *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none" placeholder="اسم المهمة" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">جدول Cron</label>
                <div className="flex gap-1">
                  <input value={form.cron_expr} onChange={e => setForm(f => ({ ...f, cron_expr: e.target.value }))} className="flex-1 bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none font-mono" placeholder="0 9 * * *" />
                  <select onChange={e => setForm(f => ({ ...f, cron_expr: e.target.value }))} className="bg-[#161616] border border-[#262626] rounded-lg px-2 py-2 text-xs text-muted-foreground outline-none">
                    <option value="">قوالب</option>
                    {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المهمة (Prompt) *</label>
              <textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} rows={3} className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none resize-none" placeholder="ما الذي تريد من الذكاء الاصطناعي فعله؟" />
              <div className="flex flex-wrap gap-1 mt-1">
                {EXAMPLE_PROMPTS.map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, prompt: p }))} className="text-xs px-2 py-0.5 bg-[#1f1f1f] rounded text-muted-foreground hover:text-white transition-colors">{p.slice(0, 30)}...</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="sm" onClick={createTask} className="bg-[#e21227] hover:bg-[#b5000f] text-white gap-1"><Zap className="w-3 h-3" />إنشاء</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} className="border-[#262626] text-muted-foreground text-xs">إلغاء</Button>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">جاري التحميل...</div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Calendar className="w-14 h-14 opacity-20" />
              <p>لا توجد مهام مجدولة</p>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="border-[#262626] text-xs">إنشاء أول مهمة</Button>
            </div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="bg-[#161616] border border-[#262626] rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <button onClick={() => toggleExpand(task.id)} className="text-muted-foreground hover:text-white transition-colors">
                    {expanded === task.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{task.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${task.is_enabled ? "bg-green-500/20 text-green-400" : "bg-[#262626] text-muted-foreground"}`}>
                        {task.is_enabled ? "مفعّل" : "متوقف"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">{task.cron_expr}</span>
                      <span>آخر تشغيل: {formatRelative(task.last_run_at)}</span>
                      <span>التالي: {formatRelative(task.next_run_at)}</span>
                      <span className="text-green-400">{task.run_count} تشغيل</span>
                      {task.error_count > 0 && <span className="text-red-400">{task.error_count} خطأ</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => runNow(task.id)} disabled={running[task.id]} title="تشغيل الآن" className="p-1.5 rounded border border-[#262626] text-muted-foreground hover:text-[#e21227] hover:border-[#e21227]/40 transition-colors disabled:opacity-50">
                      {running[task.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    </button>
                    <button onClick={() => toggleTask(task.id)} title={task.is_enabled ? "إيقاف" : "تفعيل"} className="p-1.5 rounded border border-[#262626] text-muted-foreground hover:text-white transition-colors">
                      <Pause className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteTask(task.id)} title="حذف" className="p-1.5 rounded border border-[#262626] text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {expanded === task.id && (
                  <div className="border-t border-[#1f1f1f] p-3 bg-[#0d0d0d]">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">المهمة:</p>
                    <p className="text-xs text-gray-400 bg-[#161616] rounded p-2 mb-3">{task.prompt}</p>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">آخر تشغيلات:</p>
                    {(taskRuns[task.id] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground/50">لا يوجد سجل تشغيل</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {(taskRuns[task.id] ?? []).map(run => (
                          <div key={run.id} className="text-xs bg-[#161616] rounded p-2">
                            <div className="flex items-center gap-2 mb-1">
                              {run.status === "done" ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                              <span className="text-muted-foreground">{new Date(run.started_at).toLocaleString("ar")}</span>
                              {run.tokens_used > 0 && <span className="text-muted-foreground/60">{run.tokens_used} token</span>}
                            </div>
                            {run.output && <pre className="text-gray-400 whitespace-pre-wrap line-clamp-3">{run.output.slice(0, 200)}</pre>}
                            {run.error && <p className="text-red-400">{run.error}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
