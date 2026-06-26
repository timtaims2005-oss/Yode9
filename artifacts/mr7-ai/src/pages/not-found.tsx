import { useLocation } from "wouter";
import { Shield, Terminal, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Inter',sans-serif] flex flex-col items-center justify-center px-4">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#FF3C00]/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative text-center max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-[#FF3C00] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">KaliGPT</span>
        </div>

        {/* Terminal card */}
        <div className="rounded-[18px] border border-white/8 bg-[#111] overflow-hidden mb-8 text-left shadow-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-[#0d0d0d]">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-white/30 font-mono">kaligpt@mr7 ~ $</span>
          </div>
          <div className="p-5 font-mono text-sm space-y-2">
            <p><span className="text-[#FF3C00]">root@kali</span><span className="text-white/30">:~#</span> <span className="text-white/70">GET {typeof window !== "undefined" ? window.location.pathname : "/unknown"}</span></p>
            <p className="text-red-400/80">[✗] Error 404: Target not found</p>
            <p className="text-white/40">[*] Scanning available routes...</p>
            <p className="text-yellow-400/70">[!] Route does not exist in the registry</p>
            <p className="text-white/30 flex items-center gap-1">█<span className="animate-pulse">_</span></p>
          </div>
        </div>

        <div className="mb-3">
          <span className="text-[120px] font-black text-white/5 leading-none block">404</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 -mt-8">الصفحة غير موجودة</h1>
        <p className="text-white/40 text-sm mb-8">
          الرابط الذي تبحث عنه غير موجود أو تم نقله. تحقق من الرابط أو عد للصفحة الرئيسية.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF3C00] hover:bg-[#e63600] text-white text-sm font-medium transition-all hover:scale-105"
          >
            <Home className="w-4 h-4" /> الصفحة الرئيسية
          </button>
          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-sm transition-all"
          >
            <Terminal className="w-4 h-4" /> فتح التطبيق
          </button>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/5 hover:border-white/10 text-white/40 hover:text-white/60 text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> رجوع
          </button>
        </div>
      </div>
    </div>
  );
}
