import { memo, useState } from "react";
import { Loader2, Copy, ThumbsUp, ThumbsDown, RotateCw, Volume2, VolumeX, Languages, Pencil, Bookmark, BookmarkCheck, MoreHorizontal, GitBranch, Trash2, Brain, Paperclip, FileText, Sheet, Presentation, CheckCircle2, XCircle, ChevronDown, ChevronUp, Wrench } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Smile } from "lucide-react";
import { renderMessageContent, CodeBlock, RichTextBlock } from "@/components/CodeBlock";
import { stripOmnixBlocks } from "@/lib/OmnixExecutor";
import { ArtifactCard, ProjectCard, extractArtifactCardBlocks, stripArtifactCardBlocks, type ProjectFile } from "@/components/ArtifactPanel";
import { ArtifactCard as ArtifactCardV3, type ArtifactLanguage } from "@/components/ArtifactPanel-v3";
import { CouncilCard } from "@/components/CouncilCard";
import { GodmodeCard } from "@/components/GodmodeCard";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { MessageCostBadge } from "@/components/MessageCostBadge";
import { AgentCommandsPanel } from "@/components/AgentCommandBlock";
import { HoloChatBubble, HoloTypingIndicator } from "@/components/chat/HoloChatBubble";
import type { ChatMsg, Chat } from "@/lib/store";
import type { AppState, AppDispatch } from "./types";
import { ActionBtn } from "./ChatHelpers";
import { exportDocx, exportXlsx, exportPptx, parseMarkdownToDocx, parseMarkdownToPptx } from "@/lib/office-export";
import type { AgentStep } from "@/lib/store";

// ── ToolStepsPanel — live multi-step tool visualization ───────────────────────
// Renders step_start / tool_call / tool_result events as they stream in.
// • Shows "جارٍ استخدام: <tool>..." while a call is in flight
// • Switches to ✓ (green) or ✗ (red) once tool_result arrives
// • Auto-opens while streaming; collapsible/dismissible after the answer finishes
// • RTL-first Arabic labels; ok:false rendered in red without breaking the stream
function ToolStepsPanel({ steps, isStreaming, t }: { steps: AgentStep[]; isStreaming: boolean; t: (key: string) => string }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasError = steps.some(s => s.status === "error");
  const allDone = steps.every(s => s.status !== "calling");

  // Auto-open while live; stays collapsible after finish
  const open = isStreaming ? true : !collapsed;

  return (
    <div
      className={`mb-2 rounded-xl border text-[11px] ${
        hasError
          ? "border-red-500/30 bg-red-500/5"
          : isStreaming
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-emerald-500/25 bg-emerald-500/5"
      }`}
      dir="rtl"
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => !isStreaming && setCollapsed(c => !c)}
        className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-right select-none ${
          hasError ? "text-red-400" : isStreaming ? "text-amber-400" : "text-emerald-400"
        } font-semibold ${!isStreaming ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
      >
        <Wrench className="w-3.5 h-3.5 shrink-0" />
        <span>{t("agent.steps")} · {steps.length}</span>
        {isStreaming && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
        {!isStreaming && allDone && (
          open
            ? <ChevronUp className="w-3.5 h-3.5 ml-auto opacity-60" />
            : <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-60" />
        )}
      </button>

      {/* Steps list */}
      {open && (
        <div className="px-3 pb-2 pt-0.5 space-y-1">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${
                s.status === "error"
                  ? "bg-red-500/10 text-red-400"
                  : s.status === "calling"
                  ? "bg-amber-500/10 text-amber-300"
                  : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {/* Status icon */}
              <span className="shrink-0 mt-0.5">
                {s.status === "calling" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : s.status === "done" ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-400" />
                )}
              </span>
              {/* Label */}
              <span className="font-semibold shrink-0 font-mono">
                {s.status === "calling"
                  ? `جارٍ استخدام: ${s.toolName}…`
                  : s.toolName}
              </span>
              {/* Result / args preview */}
              <span className="truncate opacity-70 text-[10px]">
                {s.status === "calling"
                  ? JSON.stringify(s.args).slice(0, 80)
                  : s.result
                  ? s.result.slice(0, 140)
                  : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  onOpenArtifact?: (title: string, lang: string, code: string, msgId: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function ChatMessageInner({
  msg, chat, state, streaming, editingId, speakingId, reactionPickerMsgId,
  agentOn, dispatch, holoMode = false, onRate, onEdit, onBookmark, onSpeak, onTranslate,
  onBranch, onRegenerate, onReactionPickerChange, onCopy, onOpenArtifact, t,
}: ChatMessageProps) {
  const isLast = msg.id === chat.messages[chat.messages.length - 1]?.id;

  const getDisplayContent = () => {
    let raw = msg.content;
    // Strip OMNIX/NEXUS action blocks before display
    raw = stripOmnixBlocks(raw);
    const hasThinking = raw.includes("<thinking>");
    return hasThinking
      ? raw.replace(/<thinking>[\s\S]*?(<\/thinking>|$)/, "").trim()
      : raw;
  };

  // Renders text content plus clickable Artifact cards for any create_artifact
  // tool blocks found in the message — never dumps raw generated code inline.
  const renderTextWithArtifacts = (displayContent: string, colorful: boolean) => {
    const cardBlocks = extractArtifactCardBlocks(displayContent);
    const textOnly = cardBlocks.length > 0 ? stripArtifactCardBlocks(displayContent) : displayContent;

    // Group project cards by projectId — show ONE ProjectCard per project
    // (using the last/most-complete block which has all files).
    // Single-file artifact cards (no projectId) stay as individual ArtifactCards.
    const projectMap = new Map<string, { title: string; files: ProjectFile[]; lastBlock: typeof cardBlocks[0] }>();
    const soloBlocks: typeof cardBlocks = [];

    for (const b of cardBlocks) {
      if (b.isProject && b.projectId && b.projectFiles && b.projectFiles.length > 0) {
        const existing = projectMap.get(b.projectId);
        // Keep the block with the most files (latest write wins)
        if (!existing || b.projectFiles.length >= existing.files.length) {
          projectMap.set(b.projectId, { title: b.title, files: b.projectFiles, lastBlock: b });
        }
      } else {
        soloBlocks.push(b);
      }
    }

    // Map raw lang string to ArtifactLanguage for v3 card
    const toArtifactLang = (lang: string): ArtifactLanguage | null => {
      const l = lang.toLowerCase();
      if (l === "html") return "html";
      if (l === "react" || l === "jsx") return "react";
      if (l === "javascript" || l === "js") return "javascript";
      return null;
    };

    // Extract a human-readable title from code block content
    const extractTitle = (code: string, lang: ArtifactLanguage): string => {
      if (lang === "html") {
        const titleMatch = code.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) return titleMatch[1].trim();
        const h1Match = code.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1Match) return h1Match[1].trim();
      }
      return "تطبيق تفاعلي";
    };

    return (
      <>
        {textOnly && renderMessageContent(textOnly).map((p, i) => {
          if (p.type === "code") {
            const artifactLang = toArtifactLang(p.lang ?? "");
            if (artifactLang) {
              return (
                <ArtifactCardV3
                  key={`v3-${i}`}
                  title={extractTitle(p.value, artifactLang)}
                  language={artifactLang}
                  code={p.value}
                  artifactId={`${msg.id}-code-${i}`}
                />
              );
            }
            return <CodeBlock key={`t${i}`} code={p.value} lang={p.lang ?? "text"} />;
          }
          return colorful ? (
            <RichTextBlock key={`t${i}`} text={p.value} />
          ) : (
            <p key={`t${i}`} className="whitespace-pre-wrap break-words">{p.value}</p>
          );
        })}
        {/* Solo (single-file) artifact cards */}
        {soloBlocks.map((b, i) => (
          <ArtifactCard
            key={`a${i}`}
            title={b.title}
            lang={b.lang}
            onOpen={() => onOpenArtifact?.(b.title, b.lang, b.code, msg.id)}
          />
        ))}
        {/* One ProjectCard per project group */}
        {[...projectMap.entries()].map(([projectId, proj]) => (
          <ProjectCard
            key={`proj-${projectId}`}
            title={proj.title}
            fileCount={proj.files.length}
            onOpen={() => onOpenArtifact?.(
              proj.title,
              "project",
              JSON.stringify({ projectId, files: proj.files }),
              msg.id,
            )}
          />
        ))}
      </>
    );
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
    const colorful = state.settings.colorfulChatText ?? true;
    return renderTextWithArtifacts(displayContent, colorful);
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
                <ToolStepsPanel steps={msg.agentSteps} isStreaming={streaming && isLast} t={t} />
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
          /* ── Classic Mode: futuristic 3D colorful bubble ─────────────────── */
          <div className={`relative px-3 py-2.5 rounded-xl text-[var(--chat-font-size,14px)] leading-relaxed ${
            msg.role === "user"
              ? "msg-bubble-user rounded-tr-sm max-w-[78%]"
              : "msg-bubble-ai w-full"
          }`}
          style={msg.role === "assistant" ? {
            background: "linear-gradient(135deg, rgba(6,8,20,0.97) 0%, rgba(10,12,28,0.97) 50%, rgba(4,6,18,0.97) 100%)",
            border: "1px solid rgba(0,229,255,0.12)",
            boxShadow: "0 0 24px rgba(0,229,255,0.04), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          } : {
            background: "linear-gradient(135deg, rgba(226,18,39,0.18) 0%, rgba(160,10,30,0.22) 100%)",
            border: "1px solid rgba(226,18,39,0.28)",
            boxShadow: "0 0 18px rgba(226,18,39,0.08), 0 2px 6px rgba(0,0,0,0.4)",
          }}
          >
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
              <ToolStepsPanel steps={msg.agentSteps} isStreaming={streaming && isLast} t={t} />
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
                const colorfulClassic = state.settings.colorfulChatText ?? true;
                return renderTextWithArtifacts(displayContent, colorfulClassic);
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
              <DropdownMenuContent align="end" className="w-52 bg-card border-border">
                <DropdownMenuItem onSelect={() => onBranch(msg.id)}><GitBranch className="w-4 h-4" /> Branch from here</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onCopy(msg.content)}><Copy className="w-4 h-4" /> Copy text</DropdownMenuItem>
                {msg.role === "assistant" && (
                  <>
                    <DropdownMenuItem onSelect={() => { dispatch({ type: "ADD_MEMORY", entry: msg.content.slice(0, 280) }); }}>
                      <Brain className="w-4 h-4" /> Save to memory
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={async () => { try { await exportDocx(parseMarkdownToDocx(msg.content, "Document")); } catch (e) { alert(e instanceof Error ? e.message : "Export failed"); } }}>
                      <FileText className="w-4 h-4 text-blue-400" /> تصدير Word
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={async () => { try { const rows = msg.content.split("\n").filter(l => l.trim()).map(l => [l.trim()]); await exportXlsx({ filename: "data", sheets: [{ name: "Sheet1", headers: ["Content"], rows }] }); } catch (e) { alert(e instanceof Error ? e.message : "Export failed"); } }}>
                      <Sheet className="w-4 h-4 text-green-400" /> تصدير Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={async () => { try { await exportPptx(parseMarkdownToPptx(msg.content)); } catch (e) { alert(e instanceof Error ? e.message : "Export failed"); } }}>
                      <Presentation className="w-4 h-4 text-orange-400" /> تصدير PowerPoint
                    </DropdownMenuItem>
                  </>
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

export const ChatMessage = memo(ChatMessageInner, (prev, next) => {
  if (prev.msg.id !== next.msg.id) return false;
  if (prev.streaming !== next.streaming) return false;
  if (prev.streaming && next.streaming && prev.msg.content !== next.msg.content) return false;
  if (!prev.streaming && !next.streaming && prev.msg.content !== next.msg.content) return false;
  if (prev.editingId !== next.editingId) {
    const relevant = prev.msg.id === prev.editingId || prev.msg.id === next.editingId;
    if (relevant) return false;
  }
  if (prev.speakingId !== next.speakingId) {
    const relevant = prev.msg.id === prev.speakingId || prev.msg.id === next.speakingId;
    if (relevant) return false;
  }
  if (prev.reactionPickerMsgId !== next.reactionPickerMsgId) {
    const relevant = prev.msg.id === prev.reactionPickerMsgId || prev.msg.id === next.reactionPickerMsgId;
    if (relevant) return false;
  }
  if (prev.msg.rating !== next.msg.rating) return false;
  if (prev.msg.bookmarked !== next.msg.bookmarked) return false;
  return true;
});
