import { Loader2, Copy, ThumbsUp, ThumbsDown, RotateCw, Volume2, VolumeX, Languages, Pencil, Bookmark, BookmarkCheck, MoreHorizontal, GitBranch, Trash2, Brain, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Smile } from "lucide-react";
import { renderMessageContent, CodeBlock, RichTextBlock } from "@/components/CodeBlock";
import { CouncilCard } from "@/components/CouncilCard";
import { GodmodeCard } from "@/components/GodmodeCard";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { MessageCostBadge } from "@/components/MessageCostBadge";
import { AgentCommandsPanel } from "@/components/AgentCommandBlock";
import { HoloChatBubble, HoloTypingIndicator } from "@/components/chat/HoloChatBubble";
import type { ChatMsg, Chat } from "@/lib/store";
import type { AppState, AppDispatch } from "./types";
import { ActionBtn } from "./ChatHelpers";

interface ChatMessageProps {
  msg: ChatMsg;
  chat: Chat;
  state: AppState;
  streaming: boolean;
  editingId: string | null;
  speakingId: string | null;
  reactionPickerMsgId: string | null;
  agentOn: boolean;
  dispatch: AppDispatch;
  holoMode?: boolean;
  onRate: (id: string, rating: "up" | "down") => void;
  onEdit: (msg: { id: string; content: string }) => void;
  onBookmark: (id: string) => void;
  onSpeak: (id: string, text: string) => void;
  onTranslate: (id: string, text: string) => void;
  onBranch: (id: string) => void;
  onRegenerate: () => void;
  onReactionPickerChange: (id: string | null) => void;
  onCopy: (text: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function ChatMessage({
  msg, chat, state, streaming, editingId, speakingId, reactionPickerMsgId,
  agentOn, dispatch, holoMode = false, onRate, onEdit, onBookmark, onSpeak, onTranslate,
  onBranch, onRegenerate, onReactionPickerChange, onCopy, t,
}: ChatMessageProps) {
  const isLast = msg.id === chat.messages[chat.messages.length - 1]?.id;

  const getDisplayContent = () => {
    const raw = msg.content;
    const hasThinking = raw.includes("<thinking>");
    return hasThinking
      ? raw.replace(/<thinking>[\s\S]*?(<\/thinking>|$)/, "").trim()
      : raw;
  };

  const renderBubbleContent = () => {
    if (msg.council) return <CouncilCard council={msg.council} />;
    if (msg.godmode) return <GodmodeCard godmode={msg.godmode} />;
    if (msg.content.length === 0 && streaming && isLast) {
      return holoMode
        ? <HoloTypingIndicator />
        : <ThinkingIndicator agentMode={agentOn} />;
    }
    const displayContent = getDisplayContent();
    return renderMessageContent(displayContent).map((p, i) =>
      p.type === "code" ? (
        <CodeBlock key={i} code={p.value} lang={p.lang ?? "text"} />
      ) : (
        <p key={i} className="whitespace-pre-wrap break-words">{p.value}</p>
      ),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      key={msg.id}
      className={`flex gap-3 max-w-3xl mx-auto w-full ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} ${editingId === msg.id ? "opacity-50" : ""}`}
    >
      {/* Avatar — always shown regardless of holoMode */}
      {!holoMode && (
        msg.role === "assistant" ? (
          <div
            className="avatar-3d w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
            style={{
              background: "radial-gradient(circle at 35% 35%, rgba(226,18,39,0.25), rgba(8,8,12,0.95))",
              border: "1px solid rgba(226,18,39,0.3)",
              boxShadow: "0 0 16px rgba(226,18,39,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: "#e21227", filter: "drop-shadow(0 0 5px rgba(226,18,39,0.7))" }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        ) : (
          <div
            className="avatar-3d w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-xs"
            style={{
              background: "linear-gradient(135deg, #e21227, #7a0010)",
              boxShadow: "0 0 16px rgba(226,18,39,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            A
          </div>
        )
      )}

      <div className={`flex-1 min-w-0 ${msg.role === "user" ? "flex flex-col items-end" : ""}`}>

        {/* ── Holo Mode: use HoloChatBubble wrapper ─────────────────────────── */}
        {holoMode ? (
          <AnimatePresence>
            <HoloChatBubble
              content={getDisplayContent()}
              isUser={msg.role === "user"}
              timestamp={msg.id ? new Date() : undefined}
            >
              {/* Inject all rich content (agent steps, council, etc.) as children */}
              {msg.bookmarked && (
                <BookmarkCheck className="absolute -top-1 -left-1 w-4 h-4 text-amber-400 fill-amber-400/30" />
              )}
              {msg.isContextSummary && (
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg px-2.5 py-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
                  {t("context.compressed")}
                </div>
              )}
              {msg.attachment && (
                <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground bg-card/60 border border-border rounded-lg px-2.5 py-1.5">
                  {msg.attachment.preview ? (
                    <img src={msg.attachment.preview} alt={msg.attachment.name} className="w-12 h-12 object-cover rounded-md border border-border" />
                  ) : (
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate font-medium">{msg.attachment.name}</span>
                  <span className="opacity-50">{msg.attachment.type}</span>
                </div>
              )}
              {msg.agentSteps && msg.agentSteps.length > 0 && (
                <details className="mb-2 rounded-xl border border-amber-500/30 bg-amber-500/5 text-[11px]" open>
                  <summary className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-amber-400 font-semibold select-none list-none">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                    </svg>
                    {t("agent.steps")} · {msg.agentSteps.length}
                  </summary>
                  <div className="px-3 pb-2 pt-1 space-y-1">
                    {msg.agentSteps.map((s, i) => (
                      <div key={i} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${s.status === "error" ? "bg-red-500/10 text-red-400" : s.status === "calling" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        <span className="shrink-0 font-mono opacity-60">{s.step}.</span>
                        <span className="font-semibold shrink-0">{s.toolName}</span>
                        {s.status === "calling" && <Loader2 className="w-3 h-3 animate-spin shrink-0 mt-0.5" />}
                        <span className="truncate opacity-70">{s.result ? s.result.slice(0, 120) : JSON.stringify(s.args).slice(0, 80)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {msg.orchCmds && msg.orchCmds.length > 0 && (
                <AgentCommandsPanel cmds={msg.orchCmds} />
              )}
              {msg.role === "assistant" && (() => {
                const raw = msg.content;
                const thinkMatch = raw.match(/<thinking>([\s\S]*?)(<\/thinking>|$)/);
                if (!thinkMatch) return null;
                const thinkContent = thinkMatch[1].trim();
                if (!thinkContent) return null;
                return (
                  <details className="mb-2 rounded-xl border border-violet-500/30 bg-violet-500/5 text-[11px]">
                    <summary className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-violet-400 font-semibold select-none list-none">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path d="M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0" /><path d="M12 8v4l3 3" />
                      </svg>
                      {t("reason.thinking")}
                    </summary>
                    <div className="px-3 pb-2 pt-1 text-violet-300/80 whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed max-h-60 overflow-y-auto">
                      {thinkContent}
                    </div>
                  </details>
                );
              })()}
              {renderBubbleContent()}
              {msg.autoTune && (
                <div className="mt-2 flex items-center gap-1.5 text-[9.5px] font-mono text-muted-foreground/60 border-t border-border/30 pt-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 text-cyan-500/60 shrink-0"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                  <span className="text-cyan-500/70">{msg.autoTune.contextType}</span>
                  <span className="opacity-30">·</span>
                  <span title={msg.autoTune.rationale} className="opacity-60 truncate max-w-[260px]">{msg.autoTune.rationale}</span>
                </div>
              )}
            </HoloChatBubble>
          </AnimatePresence>
        ) : (
          /* ── Classic Mode: original bubble ───────────────────────────────── */
          <div className={`relative px-4 py-3 rounded-2xl text-[var(--chat-font-size,15px)] leading-relaxed ${
            msg.role === "user"
              ? "msg-bubble-user text-foreground rounded-tr-sm max-w-[80%]"
              : "msg-bubble-ai text-foreground/95 w-full"
          }`}>
            {msg.bookmarked && (
              <BookmarkCheck className="absolute -top-1 -left-1 w-4 h-4 text-amber-400 fill-amber-400/30" />
            )}

            {msg.isContextSummary && (
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg px-2.5 py-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
                {t("context.compressed")}
              </div>
            )}

            {msg.attachment && (
              <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground bg-card/60 border border-border rounded-lg px-2.5 py-1.5">
                {msg.attachment.preview ? (
                  <img src={msg.attachment.preview} alt={msg.attachment.name} className="w-12 h-12 object-cover rounded-md border border-border" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate font-medium">{msg.attachment.name}</span>
                <span className="opacity-50">{msg.attachment.type}</span>
              </div>
            )}

            {msg.agentSteps && msg.agentSteps.length > 0 && (
              <details className="mb-2 rounded-xl border border-amber-500/30 bg-amber-500/5 text-[11px]" open>
                <summary className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-amber-400 font-semibold select-none list-none">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                  </svg>
                  {t("agent.steps")} · {msg.agentSteps.length}
                </summary>
                <div className="px-3 pb-2 pt-1 space-y-1">
                  {msg.agentSteps.map((s, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${s.status === "error" ? "bg-red-500/10 text-red-400" : s.status === "calling" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                      <span className="shrink-0 font-mono opacity-60">{s.step}.</span>
                      <span className="font-semibold shrink-0">{s.toolName}</span>
                      {s.status === "calling" && <Loader2 className="w-3 h-3 animate-spin shrink-0 mt-0.5" />}
                      <span className="truncate opacity-70">{s.result ? s.result.slice(0, 120) : JSON.stringify(s.args).slice(0, 80)}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {msg.orchCmds && msg.orchCmds.length > 0 && (
              <AgentCommandsPanel cmds={msg.orchCmds} />
            )}

            {msg.role === "assistant" && (() => {
              const raw = msg.content;
              const thinkMatch = raw.match(/<thinking>([\s\S]*?)(<\/thinking>|$)/);
              if (!thinkMatch) return null;
              const thinkContent = thinkMatch[1].trim();
              if (!thinkContent) return null;
              return (
                <details className="mb-2 rounded-xl border border-violet-500/30 bg-violet-500/5 text-[11px]">
                  <summary className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-violet-400 font-semibold select-none list-none">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0" /><path d="M12 8v4l3 3" />
                    </svg>
                    {t("reason.thinking")}
                  </summary>
                  <div className="px-3 pb-2 pt-1 text-violet-300/80 whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed max-h-60 overflow-y-auto">
                    {thinkContent}
                  </div>
                </details>
              );
            })()}

            {msg.council ? (
              <CouncilCard council={msg.council} />
            ) : msg.godmode ? (
              <GodmodeCard godmode={msg.godmode} />
            ) : msg.content.length === 0 && streaming && isLast ? (
              <ThinkingIndicator agentMode={agentOn} />
            ) : (
              (() => {
                const raw = msg.content;
                const hasThinking = raw.includes("<thinking>");
                const displayContent = hasThinking
                  ? raw.replace(/<thinking>[\s\S]*?(<\/thinking>|$)/, "").trim()
                  : raw;
                return renderMessageContent(displayContent).map((p, i) =>
                  p.type === "code" ? (
                    <CodeBlock key={i} code={p.value} lang={p.lang ?? "text"} />
                  ) : (
                    <p key={i} className="whitespace-pre-wrap break-words">{p.value}</p>
                  ),
                );
              })()
            )}

            {msg.autoTune && (
              <div className="mt-2 flex items-center gap-1.5 text-[9.5px] font-mono text-muted-foreground/60 border-t border-border/30 pt-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 text-cyan-500/60 shrink-0"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                <span className="text-cyan-500/70">{msg.autoTune.contextType}</span>
                <span className="opacity-30">·</span>
                <span title={msg.autoTune.rationale} className="opacity-60 truncate max-w-[260px]">{msg.autoTune.rationale}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Reactions — always shown ───────────────────────────────────────── */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${msg.role === "user" ? "justify-end mr-1" : "ml-1"}`}>
            {Object.entries(msg.reactions).map(([emoji, users]) => {
              const isMine = users.includes("me");
              return (
                <button
                  key={emoji}
                  onClick={() => dispatch({ type: "REACT_MSG", chatId: chat.id, msgId: msg.id, emoji, userId: "me" })}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-all ${
                    isMine
                      ? "bg-primary/20 border border-primary/40 text-primary"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-mono text-[9px]">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Cost badge — always shown ──────────────────────────────────────── */}
        {msg.role === "assistant" && msg.content.length > 0 && !msg.council && !msg.godmode && !(streaming && isLast) && (
          <div className="ml-1 mt-1.5">
            <MessageCostBadge
              inputText={chat.messages.slice(0, chat.messages.indexOf(msg)).map(m => m.content).join(" ") ?? ""}
              outputText={msg.content}
              modelId={state.activeModel}
              providerModel={state.activeProviderModel}
              isLocal={state.settings.useLocalModel}
            />
          </div>
        )}

        {/* ── Action buttons — always shown ──────────────────────────────────── */}
        {msg.content.length > 0 && !(streaming && isLast) && (
          <div className={`flex items-center gap-0.5 mt-1.5 ${msg.role === "user" ? "mr-1" : "ml-1"}`}>
            <ActionBtn label="Copy" onClick={() => onCopy(msg.content)}>
              <Copy className="w-3.5 h-3.5" />
            </ActionBtn>
            {msg.role === "assistant" && (
              <>
                <ActionBtn label="Good" onClick={() => onRate(msg.id, "up")} active={msg.rating === "up" ? "good" : undefined}>
                  <ThumbsUp className="w-3.5 h-3.5" />
                </ActionBtn>
                <ActionBtn label="Bad" onClick={() => onRate(msg.id, "down")} active={msg.rating === "down" ? "bad" : undefined}>
                  <ThumbsDown className="w-3.5 h-3.5" />
                </ActionBtn>
                <ActionBtn label="Regenerate" onClick={onRegenerate}>
                  <RotateCw className="w-3.5 h-3.5" />
                </ActionBtn>
                <ActionBtn label={speakingId === msg.id ? "Stop speaking" : "Speak"} onClick={() => onSpeak(msg.id, msg.content)} active={speakingId === msg.id ? "good" : undefined}>
                  {speakingId === msg.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </ActionBtn>
                <ActionBtn label="Translate" onClick={() => onTranslate(msg.id, msg.content)}>
                  <Languages className="w-3.5 h-3.5" />
                </ActionBtn>
              </>
            )}
            {msg.role === "user" && (
              <ActionBtn label="Edit" onClick={() => onEdit(msg)}>
                <Pencil className="w-3.5 h-3.5" />
              </ActionBtn>
            )}
            <ActionBtn label={msg.bookmarked ? "Unbookmark" : "Bookmark"} onClick={() => onBookmark(msg.id)} active={msg.bookmarked ? "good" : undefined}>
              <Bookmark className={`w-3.5 h-3.5 ${msg.bookmarked ? "fill-current" : ""}`} />
            </ActionBtn>

            <Popover open={reactionPickerMsgId === msg.id} onOpenChange={(v) => onReactionPickerChange(v ? msg.id : null)}>
              <PopoverTrigger asChild>
                <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-yellow-400 transition-colors" aria-label="React">
                  <Smile className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="center" className="p-2 w-auto bg-card border-border">
                <div className="flex gap-1 flex-wrap max-w-[200px]">
                  {["👍","❤️","🔥","⚡","💀","🎯","🤯","😂","🚀","💯","✅","👀","🛡️","💻","🔓"].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        dispatch({ type: "REACT_MSG", chatId: chat.id, msgId: msg.id, emoji, userId: "me" });
                        onReactionPickerChange(null);
                      }}
                      className="text-lg hover:scale-125 transition-transform p-0.5 rounded hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground" aria-label="More">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-card border-border">
                <DropdownMenuItem onSelect={() => onBranch(msg.id)}><GitBranch className="w-4 h-4" /> Branch from here</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onCopy(msg.content)}><Copy className="w-4 h-4" /> Copy text</DropdownMenuItem>
                {msg.role === "assistant" && (
                  <DropdownMenuItem onSelect={() => { dispatch({ type: "ADD_MEMORY", entry: msg.content.slice(0, 280) }); }}>
                    <Brain className="w-4 h-4" /> Save to memory
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => dispatch({ type: "DELETE_MSG", chatId: chat.id, msgId: msg.id })}>
                  <Trash2 className="w-4 h-4" /> Delete message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </motion.div>
  );
}
