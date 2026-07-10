/**
 * StreamTPSBadge — live tokens-per-second badge shown during AI streaming.
 * Appears bottom-right of the streaming message, disappears when done.
 */
import { useEffect, useState } from "react";
import { tokenStreamCounter, type StreamSession } from "@/lib/token-stream-counter";

interface Props {
  sessionId: string;
  visible: boolean;
}

export function StreamTPSBadge({ sessionId, visible }: Props) {
  const [session, setSession] = useState<StreamSession | null>(null);

  useEffect(() => {
    if (!visible || !sessionId) return;
    const unsub = tokenStreamCounter.onSession(sessionId, setSession);
    return unsub;
  }, [sessionId, visible]);

  if (!visible || !session) return null;

  const tpsColor =
    session.tps >= 20 ? "#00ff88" :
    session.tps >= 8  ? "#fbbf24" :
    session.tps > 0   ? "#f97316" : "#555";

  const elapsedSec = (session.elapsed / 1000).toFixed(1);

  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "2px 8px", borderRadius: 4, marginTop: 4,
        background: "rgba(0,0,0,0.5)", border: "1px solid #262626",
        fontSize: 10, fontFamily: "monospace", color: "#555",
        userSelect: "none",
      }}
    >
      <span style={{ color: tpsColor, fontWeight: 700 }}>
        {session.tps > 0 ? `${session.tps} TPS` : "···"}
      </span>
      <span>·</span>
      <span>{session.tokens} tok</span>
      <span>·</span>
      <span>{elapsedSec}s</span>
      {session.cps > 0 && (
        <>
          <span>·</span>
          <span>{session.cps} c/s</span>
        </>
      )}
    </div>
  );
}
