import { useEffect, useState, useCallback } from "react";
import { X, Link, Download, Smartphone, Copy, Check, RefreshCw, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface QRSyncModalProps {
  open: boolean;
  onClose: () => void;
}

function getDeviceId(): string {
  let id = localStorage.getItem("mr7-device-id");
  if (!id) {
    id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("mr7-device-id", id);
  }
  return id;
}

function getShareUrl(deviceId: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?sync=${encodeURIComponent(deviceId)}`;
}

function QRImage({ url }: { url: string }) {
  const encoded = encodeURIComponent(url);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}&bgcolor=0d0d0d&color=e21227&format=png&margin=10`;
  return (
    <img
      src={src}
      alt="QR Code"
      className="rounded-lg border border-[#1f1f1f]"
      style={{ width: 220, height: 220, display: "block" }}
    />
  );
}

export function QRSyncModal({ open, onClose }: QRSyncModalProps) {
  const { state } = useStore();
  const { toast } = useToast();
  const [deviceId] = useState(() => getDeviceId());
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => {
    setShareUrl(getShareUrl(deviceId));
  }, [deviceId]);

  const pushToCloud = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncStatus("idle");
    try {
      const res = await fetch(`/api/cloud-chats?deviceId=${encodeURIComponent(deviceId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chats: state.chats }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLastSynced(new Date());
      setSyncStatus("ok");
      toast({ description: "تم رفع المحادثات إلى السحابة." });
    } catch (err) {
      setSyncStatus("error");
      toast({ description: "فشل الرفع: " + (err instanceof Error ? err.message : "خطأ غير معروف"), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [syncing, deviceId, state.chats, toast]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: "تعذّر النسخ.", variant: "destructive" });
    }
  }, [shareUrl, toast]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full mx-4 rounded-[18px] border border-[#1f1f1f] bg-[#0d0d0d] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-[10px] border-b border-[#1f1f1f]">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#e21227]" />
              <span className="text-sm font-semibold text-white tracking-wide">مزامنة عبر QR</span>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {/* Info */}
            <div className="text-xs text-[#888] leading-relaxed bg-[#161616] rounded-lg p-3 border border-[#1f1f1f]">
              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-[#e21227] mt-0.5 shrink-0" />
                <span>
                  ارفع محادثاتك إلى السحابة، ثم امسح رمز QR من أي جهاز لاستيراد المحادثات تلقائياً. لا تسجيل دخول — مرتبط بهذا الجهاز فقط.
                </span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              {shareUrl ? (
                <QRImage url={shareUrl} />
              ) : (
                <div className="w-[220px] h-[220px] rounded-lg border border-[#1f1f1f] bg-[#161616] flex items-center justify-center">
                  <span className="text-[#666] text-xs">جاري التحميل...</span>
                </div>
              )}
              <p className="text-[10px] text-[#555] text-center max-w-[220px] break-all">{shareUrl}</p>
            </div>

            {/* Device ID */}
            <div className="flex items-center gap-2 bg-[#161616] border border-[#1f1f1f] rounded-lg px-3 py-2">
              <span className="text-[10px] text-[#666] shrink-0">معرّف الجهاز:</span>
              <span className="text-[10px] text-[#aaa] font-mono truncate flex-1">{deviceId}</span>
            </div>

            {/* Sync status */}
            {lastSynced && (
              <p className="text-[10px] text-[#555] text-center">
                آخر مزامنة: {lastSynced.toLocaleTimeString("ar")}
                {syncStatus === "ok" && <span className="text-emerald-400 mr-1"> — ناجحة</span>}
                {syncStatus === "error" && <span className="text-[#e21227] mr-1"> — فشلت</span>}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={pushToCloud}
                disabled={syncing}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-[#e21227] hover:bg-[#c91022] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "جاري الرفع..." : `رفع ${state.chats.length} محادثة`}
              </button>
              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-[#161616] hover:bg-[#1f1f1f] border border-[#1f1f1f] text-[#aaa] hover:text-white text-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "تم" : "نسخ"}
              </button>
            </div>

            {/* Download QR */}
            {shareUrl && (
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shareUrl)}&bgcolor=0d0d0d&color=e21227&format=png&margin=20`}
                download="mr7-sync-qr.png"
                className="flex items-center justify-center gap-2 w-full h-8 rounded-lg border border-[#1f1f1f] bg-[#161616] hover:bg-[#1a1a1a] text-[#666] hover:text-[#aaa] text-xs transition-colors"
                target="_blank"
                rel="noreferrer"
              >
                <Download className="w-3 h-3" />
                تحميل رمز QR
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useQRSyncImport() {
  const { dispatch } = useStore();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const syncId = params.get("sync");
    if (!syncId) return;

    (async () => {
      try {
        const res = await fetch(`/api/cloud-chats?deviceId=${encodeURIComponent(syncId)}`);
        if (!res.ok) throw new Error("لا يوجد داتا");
        const data = await res.json() as { chats?: unknown[] };
        if (!Array.isArray(data.chats) || data.chats.length === 0) {
          toast({ description: "لا توجد محادثات محفوظة في الرابط المرسل." });
          return;
        }
        dispatch({ type: "IMPORT_CHATS", chats: data.chats as never });
        toast({ description: `تم استيراد ${data.chats.length} محادثة من الجهاز الآخر.` });
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete("sync");
        window.history.replaceState({}, "", url.toString());
      } catch {
        toast({ description: "تعذّر تحميل المحادثات من الرابط.", variant: "destructive" });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
