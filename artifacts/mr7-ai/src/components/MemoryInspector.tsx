// ─────────────────────────────────────────────────────────────────────────────
//  MEMORY INSPECTOR — Multi-Layer Memory UI (System 4 UI)
//  يعرض STM + LTM في لوحة قابلة للطي بتصميم يتوافق مع ثيم المشروع
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة فقط.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, Zap, Clock, Star, Trash2, Plus,
  ChevronDown, ChevronUp, Activity, BookOpen, Settings,
} from "lucide-react";
import { STM, LTM, type LTMUserFact, type LTMSystemMessage } from "@/lib/agentMemory";

type TabId = "stm" | "ltm-tools" | "ltm-facts" | "ltm-msgs";

function TabBtn({ id, active, onClick, children }: {
  id: TabId; active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
        active
          ? "bg-primary/15 text-primary border border-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
      }`}
    >
      {children}
    </button>
  );
}

// ── STM View ──────────────────────────────────────────────────────────────────
function STMView() {
  const [stmState, setStmState] = useState(STM.getState());

  useEffect(() => {
    const interval = setInterval(() => setStmState(STM.getState()), 1000);
    return () => clearInterval(interval);
  }, []);

  const tools = stmState.toolHistory.slice(-15).reverse();
  const nav = stmState.navigationHistory.slice(-5).reverse();

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Tools run", value: stmState.toolHistory.length, icon: Activity },
          { label: "Messages", value: stmState.messageCount, icon: BookOpen },
          { label: "Nav steps", value: stmState.navigationHistory.length, icon: Settings },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg bg-card/60 border border-border/50 p-2 text-center">
            <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
            <div className="text-sm font-bold text-foreground">{value}</div>
            <div className="text-[9px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent tools */}
      {tools.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
            Recent Executions
          </p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {tools.map((e, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-md bg-background/40 border border-border/30">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.ok ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className="text-[10px] font-mono text-muted-foreground flex-1 truncate">{e.toolId}</span>
                <span className="text-[9px] text-muted-foreground/50 shrink-0">
                  {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active context */}
      {Object.keys(stmState.activeContext).length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
            Active Context
          </p>
          <div className="space-y-1">
            {Object.entries(stmState.activeContext).map(([k, v]) => (
              <div key={k} className="flex gap-2 px-2 py-1 rounded-md bg-background/40 border border-border/30">
                <span className="text-[10px] font-semibold text-primary shrink-0">{k}:</span>
                <span className="text-[10px] text-muted-foreground truncate">{JSON.stringify(v).slice(0, 60)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tools.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center py-4 italic">
          No tool executions yet in this session.
        </p>
      )}
    </div>
  );
}

// ── LTM Tools View ────────────────────────────────────────────────────────────
function LTMToolsView() {
  const topTools = LTM.getMostUsedTools(10);

  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
        Most Used Tools (Long-Term)
      </p>
      {topTools.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-4 italic">
          No tool history yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {topTools.map((t) => (
            <div key={t.toolId} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/40 border border-border/30">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono font-semibold text-foreground truncate">{t.toolId}</p>
                <div className="h-1 bg-border/40 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                    style={{ width: `${Math.round(t.successRate * 100)}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-bold text-foreground">{t.count}×</p>
                <p className="text-[9px] text-muted-foreground">{Math.round(t.successRate * 100)}%</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LTM Facts View ────────────────────────────────────────────────────────────
function LTMFactsView() {
  const [facts, setFacts] = useState<LTMUserFact[]>(LTM.getUserFacts(0.4));
  const [newFact, setNewFact] = useState("");
  const [adding, setAdding] = useState(false);

  const refresh = () => setFacts(LTM.getUserFacts(0.4));

  const handleAdd = () => {
    if (!newFact.trim()) return;
    LTM.addUserFact(newFact.trim(), 0.9, "explicit");
    setNewFact("");
    setAdding(false);
    refresh();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
          User Facts
        </p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {adding && (
        <div className="flex gap-1">
          <input
            autoFocus
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Enter a user fact…"
            className="flex-1 text-[11px] bg-background/60 border border-border rounded-md px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <button onClick={handleAdd} className="px-2 py-1 rounded-md bg-primary/15 border border-primary/30 text-primary text-[10px] font-semibold hover:bg-primary/25">Save</button>
        </div>
      )}

      {facts.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-3 italic">
          No user facts stored yet.
        </p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {facts.map((f) => (
            <div key={f.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-background/40 border border-border/30 group">
              <Star className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-[10px] text-foreground flex-1 leading-snug">{f.fact}</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] text-muted-foreground">{Math.round(f.confidence * 100)}%</span>
                <button
                  onClick={() => { LTM.deleteUserFact(f.id); refresh(); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LTM System Messages View ──────────────────────────────────────────────────
function LTMMessagesView() {
  const [msgs, setMsgs] = useState<LTMSystemMessage[]>(LTM.getSystemMessages());
  const refresh = () => setMsgs(LTM.getSystemMessages());

  return (
    <div className="space-y-2">
      <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
        Saved System Messages
      </p>
      {msgs.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-3 italic">
          No system messages saved yet.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {msgs.map((m) => (
            <div key={m.id} className="px-2 py-2 rounded-md bg-background/40 border border-border/30 group">
              <div className="flex items-start gap-2">
                <BookOpen className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-foreground flex-1 leading-snug line-clamp-2">{m.content}</p>
                <button
                  onClick={() => { LTM.deleteSystemMessage(m.id); refresh(); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              {m.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {m.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
                <span className="text-[8px] text-muted-foreground/50">{new Date(m.createdAt).toLocaleDateString()}</span>
                {m.usageCount > 0 && (
                  <span className="text-[8px] text-muted-foreground/50">· Used {m.usageCount}×</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── الكومبوننت الرئيسي ─────────────────────────────────────────────────────────
export function MemoryInspector({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<TabId>("stm");
  const [stmCount, setStmCount] = useState(0);

  const refreshCount = useCallback(() => {
    setStmCount(STM.getState().toolHistory.length);
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 2000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  return (
    <div className="fixed bottom-[140px] right-[375px] z-[9985] w-[300px] max-w-[calc(100vw-2rem)]">
      {/* Toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border text-[11px] font-semibold transition-all shadow-lg ${
          open
            ? "bg-violet-500/10 border-violet-500/40 text-violet-300"
            : "bg-card/80 border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <Database className={`w-3.5 h-3.5 ${open ? "text-violet-400" : ""}`} />
        Memory
        {stmCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-bold">
            {stmCount}
          </span>
        )}
        <Zap className="w-3 h-3 text-muted-foreground/50" />
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mt-2 rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-2xl overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex items-center gap-1 p-2 border-b border-border/40 overflow-x-auto no-scrollbar">
              <TabBtn id="stm" active={tab === "stm"} onClick={() => setTab("stm")}>
                ⚡ STM
              </TabBtn>
              <TabBtn id="ltm-tools" active={tab === "ltm-tools"} onClick={() => setTab("ltm-tools")}>
                🔧 LTM Tools
              </TabBtn>
              <TabBtn id="ltm-facts" active={tab === "ltm-facts"} onClick={() => setTab("ltm-facts")}>
                ⭐ Facts
              </TabBtn>
              <TabBtn id="ltm-msgs" active={tab === "ltm-msgs"} onClick={() => setTab("ltm-msgs")}>
                📋 Prompts
              </TabBtn>
            </div>

            {/* Content */}
            <div className="p-3 max-h-80 overflow-y-auto">
              {tab === "stm" && <STMView />}
              {tab === "ltm-tools" && <LTMToolsView />}
              {tab === "ltm-facts" && <LTMFactsView />}
              {tab === "ltm-msgs" && <LTMMessagesView />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
