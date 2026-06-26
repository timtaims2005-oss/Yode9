/**
 * AmbientAudioController — تحكم في الصوت المحيطي
 * يبدأ الصوت بعد أول تفاعل للمستخدم
 */
import { useEffect, useRef, useState } from "react";
import { ambientAudio } from "../lib/ambient-audio";

export function AmbientAudioController() {
  const [muted, setMuted]     = useState(false);
  const [started, setStarted] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    const start = () => {
      if (initRef.current) return;
      initRef.current = true;
      ambientAudio.resume().then(() => {
        ambientAudio.init();
        setStarted(true);
      });
    };
    window.addEventListener("click",     start, { once: true });
    window.addEventListener("keydown",   start, { once: true });
    window.addEventListener("touchstart",start, { once: true });
    return () => {
      window.removeEventListener("click",     start);
      window.removeEventListener("keydown",   start);
      window.removeEventListener("touchstart",start);
    };
  }, []);

  const toggle = () => {
    if (muted) { ambientAudio.unmute(); setMuted(false); }
    else        { ambientAudio.mute();  setMuted(true);  }
  };

  if (!started) return null;

  return (
    <button
      onClick={toggle}
      title={muted ? "تشغيل الصوت" : "كتم الصوت"}
      className="fixed bottom-6 left-6 z-50 w-9 h-9 flex items-center justify-center
                 rounded-full border border-cyan-500/40 bg-black/70 text-cyan-400
                 hover:bg-cyan-500/20 transition-all duration-200 backdrop-blur-sm text-sm"
      aria-label="Toggle ambient audio"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
