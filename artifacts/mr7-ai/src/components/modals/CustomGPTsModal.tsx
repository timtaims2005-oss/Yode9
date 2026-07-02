import { useState, useEffect, useCallback } from "react";
import { X, Plus, Bot, Trash2, Edit3, Play, Copy, Globe, Lock, Zap, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface CustomGPT {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  is_public: boolean;
  category: string;
  use_count: number;
  starter_prompts: string[];
  avatar_url: string;
  owner_id: string;
}

const CATEGORIES = ["general", "coding", "writing", "research", "security", "data", "education", "creative", "business", "arabic"];
const CATEGORY_LABELS: Record<string, string> = {
  general: "عام", coding: "برمجة", writing: "كتابة", research: "بحث",
  security: "أمن", data: "بيانات", education: "تعليم", creative: "إبداعي",
  business: "أعمال", arabic: "عربي",
};

const PRESET_GPTS = [
  { name: "مدرس برمجة Python", category: "coding", system_prompt: "أنت مدرس Python خبير. تشرح المفاهيم بأمثلة عملية، تصحح الأخطاء، وتقدم أفضل الممارسات. دائماً تضيف تعليقات للكود وتشرح كل سطر.", model: "gpt-4o", temperature: 0.5 },
  { name: "محرر المحتوى العربي", category: "arabic", system_prompt: "أنت محرر محتوى محترف متخصص في اللغة العربية الفصحى. تحسن الأسلوب، تصحح الأخطاء النحوية والإملائية، وتجعل النص أكثر احترافية مع الحفاظ على المعنى الأصلي.", model: "gpt-4o", temperature: 0.7 },
  { name: "محلل الأمن السيبراني", category: "security", system_prompt: "أنت محلل أمن سيبراني متخصص. تحلل الثغرات، CVEs، وهجمات APT. تقدم تقارير تقنية مفصلة مع التوصيات. تستخدم إطار MITRE ATT&CK في تحليلاتك.", model: "gpt-4o", temperature: 0.3 },
  { name: "Data Scientist", category: "data", system_prompt: "You are an expert data scientist. Help with data analysis, visualization, statistical modeling, and machine learning. Provide Python code examples with pandas, numpy, and sklearn. Explain results clearly.", model: "gpt-4o", temperature: 0.5 },
  { name: "كاتب قصص إبداعية", category: "creative", system_prompt: "أنت كاتب إبداعي موهوب. تكتب قصصاً مشوقة، شخصيات حية، وحوارات طبيعية. تبني عوالم خيالية تفصيلية وتستخدم أساليب سردية متنوعة.", model: "gpt-4o", temperature: 0.9 },
  { name: "مستشار الأعمال", category: "business", system_prompt: "أنت مستشار أعمال استراتيجي. تحلل الأسواق، تضع خطط الأعمال، تقيّم الفرص والمخاطر، وتقدم توصيات قابلة للتنفيذ بناءً على بيانات حقيقية.", model: "gpt-4o", temperature: 0.6 },
];

const OWNER_ID = typeof window !== "undefined" ? (localStorage.getItem("mr7_device_id") || "local-user") : "local-user";

export function CustomGPTsModal({ open, onClose }: Props) {
  const [view, setView] = useState<"browse" | "create" | "edit" | "chat">("browse");
  const [gpts, setGpts] = useState<CustomGPT[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [selected, setSelected] = useState<CustomGPT | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatOutput, setChatOutput] = useState("");
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", description: "", system_prompt: "", model: "gpt-4o",
    temperature: 0.7, is_public: false, category: "general",
    avatar_url: "", starter_prompts: [""],
  });

  useEffect(() => {
    if (open) loadGPTs();
  }, [open]);

  const loadGPTs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/custom-gpts?owner_id=${encodeURIComponent(OWNER_ID)}`);
      const data = await res.json() as { gpts: CustomGPT[] };
      setGpts(data.gpts ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const saveGPT = async () => {
    if (!form.name || !form.system_prompt) { toast({ description: "الاسم ونص النظام مطلوبان", variant: "destructive" }); return; }
    try {
      const method = (view === "edit" && selected) ? "PUT" : "POST";
      const url = (view === "edit" && selected) ? `/api/custom-gpts/${selected.id}` : "/api/custom-gpts";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, owner_id: OWNER_ID, starter_prompts: form.starter_prompts.filter(Boolean) }),
      });
      if (res.ok) {
        toast({ description: view === "edit" ? "تم التحديث" : "تم الإنشاء" });
        setView("browse");
        loadGPTs();
      }
    } catch { toast({ description: "فشل الحفظ", variant: "destructive" }); }
  };

  const deleteGPT = async (id: string) => {
    if (!confirm("هل أنت متأكد؟")) return;
    await fetch(`/api/custom-gpts/${id}?owner_id=${OWNER_ID}`, { method: "DELETE" });
    loadGPTs();
  };

  const cloneGPT = async (id: string) => {
    const res = await fetch(`/api/custom-gpts/${id}/clone`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: OWNER_ID }),
    });
    if (res.ok) { toast({ description: "تم الاستنساخ" }); loadGPTs(); }
  };

  const startChat = (gpt: CustomGPT) => {
    setSelected(gpt);
    setChatMessages([]);
    setChatOutput("");
    setChatInput("");
    setView("chat");
  };

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatStreaming || !selected) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(newMessages);
    setChatStreaming(true);
    setChatOutput("");

    try {
      const res = await fetch(`/api/custom-gpts/${selected.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6)) as { content?: string; done?: boolean };
            if (d.content) { full += d.content; setChatOutput(prev => prev + d.content!); }
            if (d.done) break;
          } catch { /* skip */ }
        }
      }
      setChatMessages(prev => [...prev, { role: "assistant", content: full }]);
      setChatOutput("");
    } catch { toast({ description: "فشل الاتصال", variant: "destructive" }); }
    finally { setChatStreaming(false); }
  }, [chatInput, chatMessages, chatStreaming, selected, toast]);

  const usePreset = (preset: typeof PRESET_GPTS[0]) => {
    setForm({ ...form, name: preset.name, description: "", system_prompt: preset.system_prompt, model: preset.model, temperature: preset.temperature, category: preset.category, is_public: false, avatar_url: "", starter_prompts: [""] });
    setView("create");
  };

  const filtered = gpts.filter(g =>
    (filterCat === "all" || g.category === filterCat) &&
    (!searchQ || g.name.toLowerCase().includes(searchQ.toLowerCase()) || g.description.toLowerCase().includes(searchQ.toLowerCase()))
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-[#e21227]" />
            <span className="font-bold text-white">ذكاء اصطناعي مخصص</span>
            <span className="text-xs text-muted-foreground">Custom GPTs</span>
            {view !== "browse" && (
              <button onClick={() => setView("browse")} className="text-xs text-[#e21227] hover:underline">← العودة</button>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Browse View */}
        {view === "browse" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f1f]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="ابحث..." className="w-full bg-[#161616] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none" />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="all">كل الفئات</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
              <Button size="sm" onClick={() => { setForm({ name: "", description: "", system_prompt: "", model: "gpt-4o", temperature: 0.7, is_public: false, category: "general", avatar_url: "", starter_prompts: [""] }); setSelected(null); setView("create"); }} className="bg-[#e21227] hover:bg-[#b5000f] text-white gap-1 text-xs">
                <Plus className="w-3 h-3" /> إنشاء
              </Button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-4">
              {/* Presets */}
              {!searchQ && filterCat === "all" && gpts.length === 0 && (
                <div className="mb-6">
                  <p className="text-xs text-muted-foreground mb-3 font-medium">قوالب جاهزة:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PRESET_GPTS.map(p => (
                      <div key={p.name} className="bg-[#161616] border border-[#262626] rounded-lg p-3 hover:border-[#e21227]/40 cursor-pointer group" onClick={() => usePreset(p)}>
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-medium text-white">{p.name}</p>
                          <span className="text-xs px-1.5 py-0.5 bg-[#1f1f1f] rounded text-muted-foreground">{CATEGORY_LABELS[p.category] ?? p.category}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.system_prompt.slice(0, 80)}...</p>
                        <p className="text-xs text-[#e21227] mt-2 group-hover:underline">استخدام كقالب</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">جاري التحميل...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <Bot className="w-12 h-12 opacity-20" />
                  <p>لا يوجد ذكاء اصطناعي مخصص بعد</p>
                  <Button size="sm" variant="outline" onClick={() => setView("create")} className="border-[#262626] text-xs">إنشاء أول GPT</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filtered.map(g => (
                    <div key={g.id} className="bg-[#161616] border border-[#262626] rounded-lg p-3 hover:border-[#e21227]/30 group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e21227] to-[#7c0d1a] flex items-center justify-center text-white font-bold text-xs">{g.name[0]}</div>
                          <div>
                            <p className="text-sm font-medium text-white leading-tight">{g.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs px-1 py-0.5 bg-[#1f1f1f] rounded text-muted-foreground">{CATEGORY_LABELS[g.category] ?? g.category}</span>
                              {g.is_public ? <Globe className="w-3 h-3 text-green-500" /> : <Lock className="w-3 h-3 text-muted-foreground" />}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="w-3 h-3" />{g.use_count}
                        </div>
                      </div>
                      {g.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{g.description}</p>}
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => startChat(g)} className="flex-1 bg-[#e21227]/20 hover:bg-[#e21227]/30 text-[#e21227] border border-[#e21227]/20 text-xs h-7 gap-1">
                          <Play className="w-3 h-3" /> محادثة
                        </Button>
                        {g.owner_id === OWNER_ID && (
                          <>
                            <button onClick={() => { setSelected(g); setForm({ name: g.name, description: g.description, system_prompt: g.system_prompt, model: g.model, temperature: g.temperature, is_public: g.is_public, category: g.category, avatar_url: g.avatar_url, starter_prompts: g.starter_prompts.length ? g.starter_prompts : [""] }); setView("edit"); }} className="p-1.5 rounded border border-[#262626] text-muted-foreground hover:text-white hover:border-[#e21227]/40 transition-colors"><Edit3 className="w-3 h-3" /></button>
                            <button onClick={() => deleteGPT(g.id)} className="p-1.5 rounded border border-[#262626] text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-colors"><Trash2 className="w-3 h-3" /></button>
                          </>
                        )}
                        {g.owner_id !== OWNER_ID && g.is_public && (
                          <button onClick={() => cloneGPT(g.id)} className="p-1.5 rounded border border-[#262626] text-muted-foreground hover:text-blue-400 transition-colors"><Copy className="w-3 h-3" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        {(view === "create" || view === "edit") && (
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الاسم *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e21227]/40" placeholder="اسم الـ GPT" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الفئة</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الوصف</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e21227]/40" placeholder="وصف مختصر" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">نص النظام (System Prompt) *</label>
              <textarea value={form.system_prompt} onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))} rows={8} className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none font-mono resize-none focus:border-[#e21227]/40" placeholder="أنت ذكاء اصطناعي متخصص في..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">النموذج</label>
                <select value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none">
                  {["gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-3.5-turbo", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">درجة الإبداع ({form.temperature})</label>
                <input type="range" min="0" max="1" step="0.1" value={form.temperature} onChange={e => setForm(f => ({ ...f, temperature: parseFloat(e.target.value) }))} className="w-full" />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} className="w-4 h-4 rounded border-[#262626]" />
                  <span className="text-sm text-muted-foreground">عام</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={saveGPT} className="bg-[#e21227] hover:bg-[#b5000f] text-white gap-1.5"><Zap className="w-4 h-4" />{view === "edit" ? "تحديث" : "إنشاء"}</Button>
              <Button variant="outline" onClick={() => setView("browse")} className="border-[#262626] text-muted-foreground">إلغاء</Button>
            </div>
          </div>
        )}

        {/* Chat View */}
        {view === "chat" && selected && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-[#1f1f1f] bg-[#080808] flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e21227] to-[#7c0d1a] flex items-center justify-center text-white font-bold text-xs">{selected.name[0]}</div>
              <div>
                <p className="text-sm font-medium text-white">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.model}</p>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {selected.starter_prompts?.filter(Boolean).length > 0 && chatMessages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.starter_prompts.filter(Boolean).map((p, i) => (
                    <button key={i} onClick={() => { setChatInput(p); }} className="text-xs px-3 py-1.5 bg-[#161616] border border-[#262626] rounded-full text-muted-foreground hover:text-white hover:border-[#e21227]/40 transition-colors">{p}</button>
                  ))}
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${m.role === "user" ? "bg-[#e21227]/20 text-white border border-[#e21227]/20" : "bg-[#161616] text-gray-300 border border-[#262626]"}`}>
                    <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
                  </div>
                </div>
              ))}
              {chatStreaming && chatOutput && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] px-3 py-2 rounded-lg text-sm bg-[#161616] text-gray-300 border border-[#262626]">
                    <pre className="whitespace-pre-wrap font-sans">{chatOutput}<span className="animate-pulse">▌</span></pre>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[#1f1f1f] flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="اكتب رسالتك..." className="flex-1 bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e21227]/40" />
              <Button size="sm" onClick={sendChat} disabled={chatStreaming} className="bg-[#e21227] hover:bg-[#b5000f] text-white px-4">إرسال</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
