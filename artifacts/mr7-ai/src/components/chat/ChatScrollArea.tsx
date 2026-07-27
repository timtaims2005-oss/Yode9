import { memo, useCallback, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatEmptyState } from "@/components/ChatEmptyState";
import { ChatMessage } from "./ChatMessage";
import type { Chat } from "@/lib/store";
import type { AppState, AppDispatch } from "./types";

interface ChatScrollAreaProps {
  scrollRef: React.RefObject<HTMLDivElement>;
  chat: Chat | null | undefined;
  streaming: boolean;
  isEmpty: boolean;
  showScrollBtn: boolean;
  editingId: string | null;
  speakingId: string | null;
  reactionPickerMsgId: string | null;
  agentOn: boolean;
  state: AppState;
  dispatch: AppDispatch;
  onFile: (file: File) => void;
  onRate: (id: string, rating: "up" | "down") => void;
  onEdit: (msg: { id: string; content: string }) => void;
  onBookmark: (id: string) => void;
  onSpeak: (id: string, text: string) => void;
  onTranslate: (id: string, text: string) => void;
  onBranch: (id: string) => void;
  onRegenerate: () => void;
  onReactionPickerChange: (id: string | null) => void;
  onSetInput: (text: string) => void;
  onScrollToBottom: () => void;
  onCopy: (text: string) => void;
  onOpenArtifact?: (title: string, lang: string, code: string, msgId: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const SCROLL_BTN_VARIANTS = {
  initial: { opacity: 0, y: 10, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.9 },
};

const SCROLL_BTN_TRANSITION = { duration: 0.15, ease: "easeOut" } as const satisfies import("framer-motion").Transition;

export const ChatScrollArea = memo(function ChatScrollArea({
  scrollRef, chat, streaming, isEmpty, showScrollBtn,
  editingId, speakingId, reactionPickerMsgId, agentOn,
  state, dispatch, onFile, onRate, onEdit, onBookmark, onSpeak,
  onTranslate, onBranch, onRegenerate, onReactionPickerChange,
  onSetInput, onScrollToBottom, onCopy, onOpenArtifact, t,
}: ChatScrollAreaProps) {
  const dragOverRef = useRef(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragOverRef.current = true;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragOverRef.current = false;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  const messages = chat?.messages;

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-6 chat-messages-container"
        style={{
          scrollBehavior: "auto",
          overscrollBehavior: "contain",
          /* Extra bottom clearance on mobile so the last message is never
             hidden behind the fixed nav bar or the chat-input area. */
          paddingBottom: "var(--scroll-area-pb, 1.5rem)",
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isEmpty && (
          <ChatEmptyState
            modelName={state.activeModel}
            memoryCount={state.memory.length}
            emptyText={t("chat.empty")}
            onPrompt={onSetInput}
          />
        )}

        {messages?.map((msg, index) => {
          const isLast = index === messages.length - 1;
          const isStreamingThis = streaming && isLast && msg.role === "assistant";
          return (
            <div key={msg.id} className="chat-message-item">
              <ChatMessage
                msg={msg}
                chat={chat!}
                state={state}
                streaming={isStreamingThis}
                editingId={editingId}
                speakingId={speakingId}
                reactionPickerMsgId={reactionPickerMsgId}
                agentOn={agentOn}
                dispatch={dispatch}
                onRate={onRate}
                onEdit={onEdit}
                onBookmark={onBookmark}
                onSpeak={onSpeak}
                onTranslate={onTranslate}
                onBranch={onBranch}
                onRegenerate={onRegenerate}
                onReactionPickerChange={onReactionPickerChange}
                onCopy={onCopy}
                onOpenArtifact={onOpenArtifact}
                t={t}
              />
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            variants={SCROLL_BTN_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SCROLL_BTN_TRANSITION}
            onClick={onScrollToBottom}
            className="absolute right-4 w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-lg text-muted-foreground hover:text-foreground hover:bg-accent z-10"
            style={{ bottom: "var(--scroll-btn-bottom, 11rem)" }}
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
});
