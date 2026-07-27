import { Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NeuralActivityMonitor3D } from "@/components/NeuralActivityMonitor3D";

interface ChatTypingIndicatorProps {
  streaming: boolean;
  liveTps: number;
  liveTokens: number;
  onStop: () => void;
}

export function ChatTypingIndicator({ streaming, liveTps, liveTokens, onStop }: ChatTypingIndicatorProps) {
  return (
    <>
      <NeuralActivityMonitor3D streaming={streaming} tps={liveTps} tokenCount={liveTokens} />

      <AnimatePresence>
        {streaming && (
          <motion.div
            className="absolute bottom-44 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
            initial={{ opacity: 0, y: 16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="relative flex items-center justify-center mb-1.5">
              <motion.div
                className="absolute rounded-full border border-primary/20"
                animate={{ width: [40, 70], height: [40, 70], opacity: [0.6, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="absolute rounded-full border border-primary/15"
                animate={{ width: [40, 90], height: [40, 90], opacity: [0.4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
              />
              <motion.button
                onClick={onStop}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #e21227 0%, #7a0010 100%)",
                  boxShadow: "0 0 20px rgba(226,18,39,0.6), 0 0 50px rgba(226,18,39,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
                aria-label="Stop generating"
              >
                <Square className="w-4 h-4 fill-white text-white" />
              </motion.button>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest"
              style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(226,18,39,0.3)", color: "rgba(226,18,39,0.9)", backdropFilter: "blur(8px)" }}
            >
              <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>■</motion.span>
              ABORT · ESC
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
