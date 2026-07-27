import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, MessageCircle, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";

interface SearchResult {
  chatId:     string;
  title:      string;
  snippet:    string;
  similarity: number;
}

interface Props {
  open:           boolean;
  onOpenChange:   (v: boolean) => void;
  onNavigateChat: (chatId: string) => void;
}

export function ChatSearchModal({ open, onOpenChange, onNavigateChat }: Props) {
  const { state } = useStore();
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status,  setStatus]  = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setStatus("idle"); return; }
    setStatus("loading");
    try {
      const deviceId = (state as Record<string, unknown>).deviceId as string ?? "local";
      const resp = await fetch("/api/chats/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, deviceId, limit: 8 }),
      });
      const data = await resp.json() as { results?: SearchResult[]; message?: string; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results ?? []);
      setMessage(data.message ?? "");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "فشل البحث");
    }
  }, [state]);

  const handleChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 450);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onOpenChange(false)}
      >
        <motion.div
          className="relative w-full max-w-xl mx-4 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-[#1f1f1f]">
            <Search size={18} className="text-[#e21227]" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-white placeholder-[#555] outline-none text-sm"
              placeholder="ابحث في محادثاتك بالمعنى..."
              value={query}
              onChange={(e) => handleChange(e.target.value)}
            />
            {status === "loading" && <Loader2 size={16} className="text-[#e21227] animate-spin" />}
            <button onClick={() => onOpenChange(false)} className="text-[#666] hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {status === "idle" && (
              <div className="p-8 text-center text-[#444] text-sm">
                ابدأ الكتابة للبحث الدلالي في جميع محادثاتك
              </div>
            )}
            {status === "error" && (
              <div className="p-6 text-center text-red-400 text-sm">{message}</div>
            )}
            {status === "done" && results.length === 0 && (
              <div className="p-8 text-center text-[#444] text-sm">
                {message || "لا توجد نتائج مطابقة"}
              </div>
            )}
            {results.map((r) => (
              <button
                key={r.chatId}
                className="w-full text-left px-4 py-3 hover:bg-[#161616] border-b border-[#111] transition-colors"
                onClick={() => { onNavigateChat(r.chatId); onOpenChange(false); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageCircle size={14} className="text-[#e21227] shrink-0 mt-0.5" />
                    <span className="text-white text-sm font-medium truncate">{r.title || "محادثة بدون عنوان"}</span>
                  </div>
                  <span className="text-[#444] text-xs shrink-0">{Math.round(r.similarity * 100)}%</span>
                </div>
                <p className="text-[#666] text-xs mt-1 ml-5 line-clamp-2">{r.snippet}</p>
              </button>
            ))}
          </div>

          <div className="p-2 text-center text-[#333] text-xs border-t border-[#111]">
            بحث دلالي — مدعوم بـ pgvector
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
