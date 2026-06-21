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
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function ChatScrollArea({
  scrollRef, chat, streaming, isEmpty, showScrollBtn,
  editingId, speakingId, reactionPickerMsgId, agentOn,
  state, dispatch, onFile, onRate, onEdit, onBookmark, onSpeak,
  onTranslate, onBranch, onRegenerate, onReactionPickerChange,
  onSetInput, onScrollToBottom, onCopy, t,
}: ChatScrollAreaProps) {
  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
      >
        {isEmpty && (
          <ChatEmptyState
            modelName={state.activeModel}
            memoryCount={state.memory.length}
            emptyText={t("chat.empty")}
            onPrompt={onSetInput}
          />
        )}

        {chat?.messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            chat={chat}
            state={state}
            streaming={streaming}
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
            t={t}
          />
        ))}
      </div>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={onScrollToBottom}
            className="absolute bottom-44 right-4 w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-lg text-muted-foreground hover:text-foreground hover:bg-accent z-10"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
