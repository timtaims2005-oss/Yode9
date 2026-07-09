import { useLocation } from "wouter";
import { Shield, ArrowLeft, CheckCircle2, Clock, Rocket, Sparkles } from "lucide-react";

const phases = [
  {
    phase: "المرحلة الأولى",
    label: "مكتمل ✓",
    color: "text-green-400",
    borderColor: "border-green-500/20",
    bgColor: "bg-green-500/5",
    dotColor: "bg-green-400",
    items: [
      { title: "واجهة الدردشة الأساسية", desc: "Chat Interface مع دعم تعدد المحادثات وحفظ السجل" },
      { title: "نماذج متعددة", desc: "دعم CHAT-GPT Fast, Thinking, Coder, Writer والمزيد" },
      { title: "نظام الاشتراكات", desc: "خطط Free, Starter, Pro, Elite مع نظام الرموز (Tokens)" },
      { title: "ترمينال تفاعلي", desc: "WebSocket Terminal مدمج في المتصفح" },
      { title: "Arsenal Hub v1", desc: "أول 20 وحدة متخصصة شاملة JARVIS وParseltongue" },
      { title: "دعم اللغة العربية", desc: "واجهة ثنائية اللغة عربي/إنجليزي مع دعم RTL" },
      { title: "وضع Council", desc: "6 نماذج متوازية تعمل على نفس المهمة" },
      { title: "وضع GodMode", desc: "نمط متقدم بدون قيود لمختبري الاختراق" },
    ],
  },
  {
    phase: "المرحلة الثانية",
    label: "قيد التطوير",
    color: "text-[#FF3C00]",
    borderColor: "border-[#FF3C00]/20",
    bgColor: "bg-[#FF3C00]/5",
    dotColor: "bg-[#FF3C00]",
    items: [
      { title: "نظام تسجيل الدخول", desc: "حسابات مستخدمين مع حفظ سجل المحادثات في السحابة", eta: "Q1 2025" },
      { title: "Arsenal Hub v2 — +50 وحدة", desc: "وحدات جديدة: BugHunter، HyperResearch، AIFactory", eta: "Q1 2025" },
      { title: "NEXUS Autonomous Agent", desc: "وكيل ذكاء اصطناعي مستقل يُنجز مهام متعددة الخطوات", eta: "Q2 2025" },
      { title: "توثيق API للمطورين", desc: "REST API كامل مع SDK لدمج KaliGPT في أدوات خارجية", eta: "Q2 2025" },
      { title: "قاعدة معرفة RAG مخصصة", desc: "رفع ملفات PDF وقواعد بيانات الثغرات لتحسين الردود", eta: "Q2 2025" },
      { title: "تحليل الشيفرة البرمجية", desc: "فحص الكود البرمجي تلقائياً عن الثغرات الأمنية", eta: "Q2 2025" },
    ],
  },
  {
    phase: "المرحلة الثالثة",
    label: "مخطط",
    color: "text-blue-400",
    borderColor: "border-blue-500/20",
    bgColor: "bg-blue-500/5",
    dotColor: "bg-blue-400",
    items: [
      { title: "تطبيق الجوال", desc: "تطبيق iOS وAndroid مع نفس قدرات الويب", eta: "Q3 2025" },
      { title: "نموذج KaliGPT المخصص", desc: "نموذج لغوي مدرّب خصيصاً على بيانات الأمن السيبراني", eta: "Q3 2025" },
      { title: "تكامل مع أدوات Kali Linux", desc: "استدعاء Nmap, Metasploit, Burp Suite مباشرة من الواجهة", eta: "Q4 2025" },
      { title: "فضاء الفريق (Team Workspace)", desc: "مساحة عمل مشتركة للفرق الأمنية مع صلاحيات متدرجة", eta: "Q4 2025" },
      { title: "تقارير تلقائية", desc: "توليد تقارير اختبار الاختراق PDF بشكل احترافي تلقائياً", eta: "Q4 2025" },
      { title: "Marketplace للوحدات", desc: "متجر لوحدات مجتمعية يمكن للمطورين نشرها ومشاركتها", eta: "2026" },
    ],
  },
];

const stats = [
  { label: "وحدة Arsenal", value: "70+" },
  { label: "نموذج AI", value: "20+" },
  { label: "مستخدم نشط", value: "5K+" },
  { label: "استعلام يومي", value: "50K+" },
];

export default function RoadmapPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Inter',sans-serif]">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> الرئيسية
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#FF3C00] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold">KaliGPT</span>
          </div>
          <button
            onClick={() => navigate("/app")}
            className="px-4 py-1.5 rounded-lg bg-[#FF3C00] hover:bg-[#e63600] text-white text-sm font-medium transition-colors"
          >
            Launch App
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-28 pb-20">
        <div className="text-center mb-14">
          <div className="text-xs font-mono text-[#FF3C00] mb-2">PRODUCT / ROADMAP</div>
          <h1 className="text-4xl font-bold text-white mb-3">خريطة الطريق</h1>
          <p className="text-white/40 max-w-lg mx-auto">رؤيتنا لبناء أقوى منصة ذكاء اصطناعي للأمن السيبراني في العالم العربي</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
          {stats.map((s) => (
            <div key={s.label} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center">
              <div className="text-2xl font-bold text-[#FF3C00] mb-1">{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Phases */}
        <div className="space-y-10">
          {phases.map((phase) => (
            <div key={phase.phase} className={`rounded-2xl border ${phase.borderColor} ${phase.bgColor} p-6`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-2.5 h-2.5 rounded-full ${phase.dotColor}`} />
                <h2 className="text-lg font-bold text-white">{phase.phase}</h2>
                <span className={`text-xs font-mono font-bold ${phase.color}`}>{phase.label}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {phase.items.map((item) => (
                  <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-black/20">
                    {phase.label.includes("✓") ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    ) : phase.label.includes("قيد") ? (
                      <Clock className="w-4 h-4 text-[#FF3C00] shrink-0 mt-0.5" />
                    ) : (
                      <Rocket className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{item.title}</span>
                        {"eta" in item && item.eta && (
                          <span className="text-xs text-white/30 font-mono">{item.eta}</span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Suggest Feature */}
        <div className="mt-12 p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
          <Sparkles className="w-8 h-8 text-[#FF3C00] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">اقترح ميزة جديدة</h3>
          <p className="text-white/40 text-sm mb-4">لديك فكرة لتحسين KaliGPT؟ نريد أن نسمعها</p>
          <button
            onClick={() => navigate("/contact")}
            className="px-6 py-2.5 rounded-lg bg-[#FF3C00] hover:bg-[#e63600] text-white text-sm font-medium transition-colors"
          >
            إرسال مقترح
          </button>
        </div>
      </div>

      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-white/20">
        © 2025 mr7.ai / KaliGPT · الخريطة قابلة للتغيير بناءً على أولويات التطوير
      </footer>
    </div>
  );
}
