import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Terminal, MessageSquare, Image, Search, Send, Loader2, Hash, Heart, AtSign, Zap } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Tab = "feed" | "messages" | "compose" | "search" | "shortcuts";

interface Post { id: string; user: string; handle: string; content: string; likes: number; comments: number; ts: string; }
interface DM { id: string; from: string; preview: string; unread: boolean; ts: string; }

const IG_PERSONA = `You are Instagram CLI — an AI assistant embedded in a terminal-based Instagram interface. You help with:
- Drafting posts, captions, and DMs with maximum engagement
- Generating hashtag strategies for any content
- Crafting reply templates and conversation starters
- Analyzing content for virality potential
- Writing bio copy and story captions
- Creating content calendars and post schedules
You communicate concisely and understand Instagram culture, trends, and algorithm dynamics.`;

const MOCK_FEED: Post[] = [
  { id: "1", user: "techcrunch", handle: "@techcrunch", content: "AI agents are no longer hype — they're production reality. The shift from chatbots to autonomous agents is happening faster than expected.", likes: 4820, comments: 312, ts: "2m" },
  { id: "2", user: "sama", handle: "@sama", content: "AGI timelines are getting shorter. Focus on building things that matter now while you still can understand them.", likes: 18200, comments: 2140, ts: "15m" },
  { id: "3", user: "yann_lecun", handle: "@ylecun", content: "\"LLMs are stochastic parrots\" is missing the point. Pattern recognition at scale IS intelligence at some level. Change my mind.", likes: 7632, comments: 891, ts: "1h" },
  { id: "4", user: "karpathy", handle: "@karpathy", content: "Neural networks are not magic. They're just very large function approximators trained on gradient descent. Beautiful, but not magic.", likes: 12400, comments: 743, ts: "3h" },
];

const MOCK_DMS: DM[] = [
  { id: "1", from: "elon_fan99", preview: "Hey! Loved your latest post about AI agents...", unread: true, ts: "5m" },
  { id: "2", from: "startup_recruiter", preview: "We're building something exciting and think you'd be a great fit", unread: true, ts: "1h" },
  { id: "3", from: "bestie_irl", preview: "Did you see that viral AI video?? 😂", unread: false, ts: "2h" },
  { id: "4", from: "collab_request", preview: "Would love to collaborate on some content!", unread: false, ts: "1d" },
];

export function InstagramCLIModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("feed");
  const [composeText, setComposeText] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [hashtags, setHashtags] = useState("");
  const [hashtagTopic, setHashtagTopic] = useState("");
  const [hashtagging, setHashtagging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [searching, setSearching] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [dmInput, setDmInput] = useState("");
  const [dmResult, setDmResult] = useState("");
  const [writingDm, setWritingDm] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  if (!open) return null;

  async function generateCaption() {
    if (!composeText.trim() || drafting) return;
    setDrafting(true);
    setAiDraft("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [{ role: "user" as const, content: `Write 3 Instagram caption variations for this idea: "${composeText}"\nMake each: engaging, authentic, and algorithm-friendly. Include relevant emojis. Label them: Option A, Option B, Option C.` }], customSystemPrompt: IG_PERSONA },
        (chunk) => setAiDraft(prev => prev + chunk),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setDrafting(false);
  }

  async function generateHashtags() {
    if (!hashtagTopic.trim() || hashtagging) return;
    setHashtagging(true);
    setHashtags("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [{ role: "user" as const, content: `Generate a strategic hashtag set for Instagram content about: "${hashtagTopic}"\nProvide:\n- 5 high-volume hashtags (#1M+ posts)\n- 10 mid-volume hashtags (#100K-1M posts)\n- 5 niche hashtags (#10K-100K posts)\nFormat as ready-to-copy hashtags with brief notes on each group's strategy.` }], customSystemPrompt: IG_PERSONA },
        (chunk) => setHashtags(prev => prev + chunk),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setHashtagging(false);
  }

  async function searchContent() {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    setSearchResult("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [{ role: "user" as const, content: `Analyze Instagram trends for: "${searchQuery}"\nProvide:\n1. Current trend status (rising/peak/declining)\n2. Top content formats working for this niche\n3. Best posting times\n4. Recommended content angles\n5. Accounts to study in this space` }], customSystemPrompt: IG_PERSONA },
        (chunk) => setSearchResult(prev => prev + chunk),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setSearching(false);
  }

  async function writeDMReply() {
    if (!dmInput.trim() || writingDm) return;
    setWritingDm(true);
    setDmResult("");
    const txt = dmInput;
    setDmInput("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [{ role: "user" as const, content: `Write 3 authentic, engaging DM reply options for this message: "${txt}"\nMake them: genuine, not salesy, conversation-continuing. Label Option A/B/C.` }], customSystemPrompt: IG_PERSONA },
        (chunk) => setDmResult(prev => prev + chunk),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setWritingDm(false);
  }

  const COL = "#e1306c";

  const tabs = [
    { id: "feed" as Tab, label: "FEED", icon: <Heart className="w-3 h-3" /> },
    { id: "messages" as Tab, label: "DMs", icon: <MessageSquare className="w-3 h-3" /> },
    { id: "compose" as Tab, label: "COMPOSE", icon: <Zap className="w-3 h-3" /> },
    { id: "search" as Tab, label: "EXPLORE", icon: <Search className="w-3 h-3" /> },
    { id: "shortcuts" as Tab, label: "SHORTCUTS", icon: <Terminal className="w-3 h-3" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl h-[90vh] flex flex-col rounded-xl border overflow-hidden"
        style={{ background: "#0a0a0a", borderColor: `${COL}30` }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: `${COL}20`, background: `${COL}08` }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: `${COL}15`, border: `1px solid ${COL}30` }}>
            📷
          </div>
          <div>
            <div className="text-[13px] font-bold" style={{ color: COL }}>Instagram CLI</div>
            <div className="text-[9px] font-mono" style={{ color: "#444" }}>TERMINAL SOCIAL MEDIA · AI CAPTIONS · HASHTAG STRATEGY · KEYBOARD CONTROL</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[9px] font-mono" style={{ color: "#555" }}>
            <Terminal className="w-3 h-3" /> TUI MODE
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-2">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-0 border-b shrink-0" style={{ borderColor: "#1f1f1f" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold font-mono transition-all border-b-2"
              style={{ color: tab === t.id ? COL : "#444", borderBottomColor: tab === t.id ? COL : "transparent", background: tab === t.id ? `${COL}08` : "transparent" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {tab === "feed" && (
              <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4 space-y-3">
                {MOCK_FEED.map(post => (
                  <div key={post.id} className="p-4 rounded-xl border" style={{ background: "#111", borderColor: "#1f1f1f" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: `${COL}20`, color: COL, border: `1px solid ${COL}30` }}>
                        {post.user[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold" style={{ color: "#ccc" }}>{post.user}</div>
                        <div className="text-[8px]" style={{ color: "#555" }}>{post.handle} · {post.ts} ago</div>
                      </div>
                    </div>
                    <div className="text-[11px] mb-3 leading-relaxed" style={{ color: "#aaa" }}>{post.content}</div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setLikedPosts(prev => { const n = new Set(prev); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                        className="flex items-center gap-1 text-[9px] transition-all"
                        style={{ color: likedPosts.has(post.id) ? COL : "#555" }}>
                        <Heart className={`w-3 h-3 ${likedPosts.has(post.id) ? "fill-current" : ""}`} />
                        {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                      </button>
                      <div className="flex items-center gap-1 text-[9px]" style={{ color: "#555" }}>
                        <MessageSquare className="w-3 h-3" /> {post.comments}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {tab === "messages" && (
              <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {MOCK_DMS.map(dm => (
                    <div key={dm.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-white/3 transition-colors"
                      style={{ background: "#111", borderColor: dm.unread ? `${COL}30` : "#1f1f1f" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ background: `${COL}15`, color: COL }}>
                        {dm.from[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold" style={{ color: dm.unread ? "#ccc" : "#888" }}>@{dm.from}</span>
                          {dm.unread && <span className="w-1.5 h-1.5 rounded-full" style={{ background: COL }} />}
                          <span className="text-[8px] ml-auto" style={{ color: "#444" }}>{dm.ts}</span>
                        </div>
                        <div className="text-[9px] truncate mt-0.5" style={{ color: "#666" }}>{dm.preview}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t" style={{ borderColor: "#1f1f1f" }}>
                  <div className="text-[9px] font-bold mb-2" style={{ color: "#555" }}>AI DM REPLY WRITER</div>
                  {dmResult && (
                    <div className="mb-2 p-2 rounded text-[10px] max-h-32 overflow-y-auto whitespace-pre-wrap" style={{ background: "#0d0d0d", color: "#aaa", border: "1px solid #1f1f1f" }}>
                      {dmResult}
                      {writingDm && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: COL }} />}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input value={dmInput} onChange={e => setDmInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), writeDMReply())}
                      placeholder="Paste DM to reply to..." className="flex-1 px-3 py-2 rounded-lg text-[10px] outline-none"
                      style={{ background: "#111", border: "1px solid #262626", color: "#ccc" }} />
                    <button onClick={writeDMReply} disabled={writingDm || !dmInput.trim()}
                      className="px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all"
                      style={{ background: `${COL}15`, border: `1px solid ${COL}30`, color: COL, opacity: writingDm ? 0.5 : 1 }}>
                      {writingDm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {tab === "compose" && (
              <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex gap-0 overflow-hidden">
                <div className="flex-1 flex flex-col p-4 gap-3 border-r" style={{ borderColor: "#1f1f1f" }}>
                  <div className="text-[10px] font-bold font-mono" style={{ color: COL }}>CAPTION GENERATOR</div>
                  <textarea value={composeText} onChange={e => setComposeText(e.target.value)} placeholder="Describe your post idea, photo content, or campaign..." rows={4}
                    className="px-3 py-2 rounded-lg text-[11px] outline-none resize-none"
                    style={{ background: "#111", border: "1px solid #262626", color: "#ccc" }} />
                  <button onClick={generateCaption} disabled={drafting || !composeText.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold transition-all"
                    style={{ background: `${COL}15`, border: `1px solid ${COL}30`, color: COL, opacity: drafting ? 0.6 : 1 }}>
                    {drafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    GENERATE 3 CAPTIONS
                  </button>
                  <div className="flex-1 overflow-y-auto rounded-lg border p-3 text-[10px] whitespace-pre-wrap"
                    style={{ background: "#0d0d0d", borderColor: "#1f1f1f", color: "#aaa" }}>
                    {aiDraft || <span style={{ color: "#333" }}>AI-generated captions will appear here...</span>}
                    {drafting && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: COL }} />}
                  </div>
                </div>
                <div className="flex-1 flex flex-col p-4 gap-3">
                  <div className="text-[10px] font-bold font-mono" style={{ color: COL }}>HASHTAG STRATEGY</div>
                  <div className="flex gap-2">
                    <input value={hashtagTopic} onChange={e => setHashtagTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generateHashtags()}
                      placeholder="Topic or niche..." className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                      style={{ background: "#111", border: "1px solid #262626", color: "#ccc" }} />
                    <button onClick={generateHashtags} disabled={hashtagging || !hashtagTopic.trim()}
                      className="px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5"
                      style={{ background: `${COL}15`, border: `1px solid ${COL}30`, color: COL, opacity: hashtagging ? 0.6 : 1 }}>
                      {hashtagging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hash className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto rounded-lg border p-3 text-[10px] whitespace-pre-wrap"
                    style={{ background: "#0d0d0d", borderColor: "#1f1f1f", color: "#aaa" }}>
                    {hashtags || <span style={{ color: "#333" }}>Hashtag strategy will appear here...</span>}
                    {hashtagging && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: COL }} />}
                  </div>
                </div>
              </motion.div>
            )}

            {tab === "search" && (
              <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col p-4 gap-3">
                <div className="flex gap-2">
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchContent()}
                    placeholder="Search trends, niches, or topics..." className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                    style={{ background: "#111", border: "1px solid #262626", color: "#ccc" }} />
                  <button onClick={searchContent} disabled={searching || !searchQuery.trim()}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2"
                    style={{ background: `${COL}15`, border: `1px solid ${COL}30`, color: COL, opacity: searching ? 0.6 : 1 }}>
                    {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    ANALYZE
                  </button>
                </div>
                <div className="flex-1 rounded-lg border overflow-y-auto p-3 text-[11px] whitespace-pre-wrap"
                  style={{ background: "#0d0d0d", borderColor: "#1f1f1f", color: "#aaa" }}>
                  {searchResult || <span style={{ color: "#333" }}>Trend analysis will appear here...</span>}
                  {searching && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: COL }} />}
                </div>
              </motion.div>
            )}

            {tab === "shortcuts" && (
              <motion.div key="shortcuts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4 overflow-y-auto">
                <div className="text-[10px] font-bold font-mono mb-4" style={{ color: COL }}>KEYBOARD SHORTCUTS · INSTAGRAM CLI</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "j / k", action: "Scroll feed up/down" },
                    { key: "l", action: "Like current post" },
                    { key: "c", action: "Comment on post" },
                    { key: "m", action: "Open DMs" },
                    { key: "n", action: "New post compose" },
                    { key: "s", action: "Story viewer" },
                    { key: "/", action: "Search / Explore" },
                    { key: "Tab", action: "Next tab" },
                    { key: "Esc", action: "Back / Close" },
                    { key: "Enter", action: "Confirm / Send" },
                    { key: "r", action: "Reply to message" },
                    { key: "f", action: "Follow/Unfollow" },
                    { key: "b", action: "Bookmark post" },
                    { key: "Ctrl+C", action: "Copy link" },
                    { key: "?", action: "Show this help" },
                    { key: "q", action: "Quit Instagram CLI" },
                  ].map(sc => (
                    <div key={sc.key} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ background: "#111", borderColor: "#1f1f1f" }}>
                      <code className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: "#0d0d0d", color: COL, border: "1px solid #1f1f1f" }}>{sc.key}</code>
                      <span className="text-[10px]" style={{ color: "#888" }}>{sc.action}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg border text-[10px]" style={{ background: "#0d0d0d", borderColor: "#1f1f1f", color: "#555" }}>
                  <div className="font-bold mb-1" style={{ color: COL }}>Install Real Instagram CLI</div>
                  <code className="block text-[9px] p-2 rounded" style={{ background: "#080808", color: "#888" }}>npm install -g @i7m/instagram-cli</code>
                  <div className="mt-1">Requires Node.js v22+ · Unofficial · Use at your own risk</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
