import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface InlineApiKeyPromptInfo {
  providerId: string;
  label: string;
  color: string;
  baseURL?: string;
  needsURL?: boolean;
  keyPlaceholder?: string;
}

interface InlineApiKeyPromptProps {
  info: InlineApiKeyPromptInfo;
  onSave: (key: string, baseURL?: string) => void;
  onDismiss: () => void;
}

export function InlineApiKeyPrompt({ info, onSave, onDismiss }: InlineApiKeyPromptProps) {
  const [key, setKey] = useState("");
  const [url, setUrl] = useState(info.baseURL ?? "");
  const [show, setShow] = useState(false);
  const { color } = info;

  const canSave = key.trim().length > 3;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        className="mx-3 mb-2 rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${color}14, rgba(8,8,8,0.97))`,
          border: `1px solid ${color}45`,
          boxShadow: `0 0 30px ${color}18`,
        }}
        dir="rtl"
      >
        <div className="flex items-center gap-2 px-3.5 pt-3">
          <div className="w-2 h-2 rounded-full flex-shrink-0 pulse-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="text-[11px] font-black text-white">مفتاح API مطلوب — {info.label}</span>
          <button
            onClick={onDismiss}
            className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md"
            style={{ color: "rgba(255,255,255,0.4)" }}
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>
        <div className="px-3.5 pt-1.5 pb-3">
          <p className="text-[10px] mb-2.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            لم نتمكن من إرسال طلبك لأن مزوّد "{info.label}" لا يملك مفتاح API صالح. أدخل المفتاح هنا وسيتم حفظه وإعادة إرسال رسالتك تلقائياً — بدون الحاجة للذهاب لإعدادات الشريط الجانبي.
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={info.keyPlaceholder ?? "مفتاح API"}
                className="w-full px-3 py-2 text-[11px] font-mono rounded-lg outline-none"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  border: `1px solid ${color}30`,
                  color: "rgba(255,255,255,0.9)",
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && canSave) onSave(key.trim(), url.trim() || undefined); }}
                autoFocus
              />
              <button
                onClick={() => setShow((s) => !s)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px]"
                style={{ color: "rgba(255,255,255,0.35)" }}
                type="button"
              >
                {show ? "إخفاء" : "إظهار"}
              </button>
            </div>
            <motion.button
              onClick={() => onSave(key.trim(), url.trim() || undefined)}
              disabled={!canSave}
              whileHover={canSave ? { scale: 1.04 } : {}}
              whileTap={canSave ? { scale: 0.96 } : {}}
              className="px-4 py-2 rounded-lg text-[11px] font-black flex-shrink-0"
              style={{
                background: canSave ? color : "rgba(255,255,255,0.06)",
                color: canSave ? "#050505" : "rgba(255,255,255,0.3)",
                cursor: canSave ? "pointer" : "not-allowed",
              }}
            >
              حفظ وإعادة الإرسال
            </motion.button>
          </div>
          {info.needsURL && (
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="رابط API المخصص (Base URL) — اختياري"
              className="w-full mt-2 px-3 py-1.5 text-[10px] font-mono rounded-lg outline-none"
              style={{
                background: "rgba(0,0,0,0.35)",
                border: `1px solid ${color}20`,
                color: "rgba(255,255,255,0.65)",
              }}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
