import { useLocation } from "wouter";
import { Shield, Terminal, Zap, Eye, Brain, Lock, ChevronRight, Github, Twitter, Globe, Server, Code2, Crosshair } from "lucide-react";

const features = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "ذكاء اصطناعي متخصص",
    desc: "نماذج مدرّبة خصيصاً على الأمن السيبراني — اختبار الاختراق، تحليل الثغرات، والأوامر الهجومية.",
  },
  {
    icon: <Terminal className="w-6 h-6" />,
    title: "ترمينال تفاعلي",
    desc: "طرفية أوامر مدمجة في المتصفح تتيح تنفيذ أوامر Shell بشكل مباشر داخل جلسة الذكاء الاصطناعي.",
  },
  {
    icon: <Eye className="w-6 h-6" />,
    title: "وحدة OSINT المتقدمة",
    desc: "جمع المعلومات مفتوحة المصدر، تحليل المواقع، وتتبع البصمة الرقمية بدقة عالية.",
  },
  {
    icon: <Crosshair className="w-6 h-6" />,
    title: "أسلوب Red Team",
    desc: "محاكاة هجمات حقيقية، تقييم الدفاعات، وتحليل نقاط الضعف من منظور المهاجم.",
  },
  {
    icon: <Server className="w-6 h-6" />,
    title: "وضع المجلس — Council Mode",
    desc: "6 عقول متخصصة تعمل في آنٍ واحد على مسألة واحدة: مخترق، محلل، مطور، محقق جنائي، وأكثر.",
  },
  {
    icon: <Code2 className="w-6 h-6" />,
    title: "ترسانة Arsenal",
    desc: "+70 أداة متخصصة: JARVIS، Parseltongue، RAGFlow، NexusAI، وأدوات هجومية ودفاعية متكاملة.",
  },
];

const models = [
  { name: "CHAT-GPT Fast", tag: "سريع", color: "text-blue-400" },
  { name: "CHAT-GPT Thinking", tag: "تفكير عميق", color: "text-purple-400" },
  { name: "CHAT-GPT Coder", tag: "برمجة", color: "text-green-400" },
  { name: "CHAT-GPT Researcher", tag: "بحث", color: "text-yellow-400" },
  { name: "KaliGPT Red Team", tag: "هجومي", color: "text-red-400" },
  { name: "GodMode", tag: "لا حدود", color: "text-orange-400" },
];

const faqs = [
  { q: "هل يمكن استخدام KaliGPT للأغراض التعليمية فقط؟", a: "نعم. KaliGPT مصمم للباحثين الأمنيين والمختبرين المرخصين وطلاب الأمن السيبراني في بيئات اختبار قانونية فقط." },
  { q: "ما الفرق بين KaliGPT وChatGPT العادي؟", a: "KaliGPT مخصص 100% للأمن السيبراني ويمتلك قاعدة معرفية بالأدوات الهجومية والدفاعية، بينما ChatGPT نموذج عام متحفظ." },
  { q: "هل بياناتي محفوظة أم تُعالج محلياً؟", a: "تُرسل المحادثات إلى الخادم لمعالجتها عبر نموذج اللغة. لا نحتفظ بمحتوى المحادثات بعد انتهاء الجلسة." },
];

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Inter',sans-serif] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FF3C00] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">KaliGPT</span>
            <span className="text-xs text-white/30 font-mono ml-1">mr7.ai</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/50">
            <button onClick={() => navigate("/roadmap")} className="hover:text-white transition-colors">Roadmap</button>
            <button onClick={() => navigate("/faq")} className="hover:text-white transition-colors">FAQ</button>
            <button onClick={() => navigate("/contact")} className="hover:text-white transition-colors">Contact</button>
          </div>
          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#FF3C00] hover:bg-[#e63600] text-white text-sm font-medium transition-colors"
          >
            Launch App <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#FF3C00]/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-[#FF3C00]/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#FF3C00]/30 bg-[#FF3C00]/10 text-[#FF3C00] text-xs font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3C00] animate-pulse" />
          v2.0 — Arsenal Mode Active
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
          <span className="text-white">Kali</span>
          <span className="text-[#FF3C00]">GPT</span>
        </h1>
        <p className="text-xl md:text-2xl text-white/60 font-light mb-3 max-w-2xl mx-auto">
          مساعدك الذكي المتقدم في اختبارات الاختراق وتحليل الثغرات
        </p>
        <p className="text-sm text-white/30 font-mono mb-10 max-w-xl mx-auto">
          Offensive AI · Red Team · OSINT · Arsenal · Council Mode
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF3C00] hover:bg-[#e63600] text-white font-semibold text-base transition-all hover:scale-105 shadow-lg shadow-[#FF3C00]/25"
          >
            <Terminal className="w-5 h-5" />
            ابدأ الآن — مجاناً
          </button>
          <button
            onClick={() => navigate("/roadmap")}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium text-base transition-all"
          >
            خريطة الطريق
          </button>
        </div>

        {/* Terminal preview */}
        <div className="mt-16 max-w-2xl mx-auto rounded-xl border border-white/8 bg-[#111] overflow-hidden text-left shadow-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-[#0d0d0d]">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-white/30 font-mono">kaligpt@mr7 ~ $</span>
          </div>
          <div className="p-5 font-mono text-sm space-y-2">
            <p><span className="text-[#FF3C00]">user@kali</span><span className="text-white/40">:~$</span> <span className="text-white/80">scan --target example.com --mode recon</span></p>
            <p className="text-green-400/80">[✓] Initializing KaliGPT Red Team module...</p>
            <p className="text-white/50">[*] Running OSINT sweep on target...</p>
            <p className="text-blue-400/80">{'[>]'} Found 3 subdomains, 12 open ports, 2 critical CVEs</p>
            <p className="text-yellow-400/80">[!] CVE-2024-1234 — CVSS 9.8 — Remote Code Execution</p>
            <p className="text-white/30 flex items-center gap-1">█<span className="animate-pulse">_</span></p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">لماذا KaliGPT؟</h2>
            <p className="text-white/40 max-w-xl mx-auto">بُنيَ من الصفر للمختصين الأمنيين — ليس ChatGPT معدَّلاً</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#FF3C00]/20 transition-all">
                <div className="w-10 h-10 rounded-lg bg-[#FF3C00]/10 text-[#FF3C00] flex items-center justify-center mb-4 group-hover:bg-[#FF3C00]/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">نماذج متخصصة لكل مهمة</h2>
          <p className="text-white/40 mb-10">اختر النموذج المناسب أو شغّل عدة نماذج في آنٍ واحد</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {models.map((m, i) => (
              <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-left">
                <div className={`text-xs font-mono font-bold mb-1 ${m.color}`}>{m.tag}</div>
                <div className="text-sm text-white/80 font-medium">{m.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">ابدأ مجاناً</h2>
          <p className="text-white/40 mb-10">خطط مرنة للأفراد والفرق الأمنية</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Free", price: "$0", features: ["50k رمز/يوم", "النماذج الأساسية", "ترمينال محدود"] },
              { name: "Pro", price: "$19", features: ["500k رمز/يوم", "كل النماذج", "Arsenal كامل", "OSINT متقدم"], highlight: true },
              { name: "Elite", price: "$49", features: ["نقاط غير محدودة", "Council Mode", "API Access", "أولوية الدعم"] },
            ].map((plan, i) => (
              <div key={i} className={`p-6 rounded-xl border ${plan.highlight ? "border-[#FF3C00]/40 bg-[#FF3C00]/5" : "border-white/5 bg-white/[0.02]"}`}>
                <div className="text-sm text-white/40 mb-1">{plan.name}</div>
                <div className="text-3xl font-bold text-white mb-4">{plan.price}<span className="text-sm font-normal text-white/30">/شهر</span></div>
                <ul className="space-y-2 text-sm text-white/50">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2"><span className="text-[#FF3C00]">✓</span>{f}</li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/app")}
                  className={`mt-6 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${plan.highlight ? "bg-[#FF3C00] hover:bg-[#e63600] text-white" : "border border-white/10 hover:border-white/20 text-white/70 hover:text-white"}`}
                >
                  ابدأ الآن
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ preview */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">أسئلة شائعة</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item, i) => (
              <div key={i} className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                <h3 className="text-white font-medium mb-2">{item.q}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <button onClick={() => navigate("/faq")} className="text-sm text-[#FF3C00] hover:underline">عرض كل الأسئلة ←</button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-white/5 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#FF3C00]/10 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-[#FF3C00]" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">جاهز للانطلاق؟</h2>
          <p className="text-white/40 mb-8">انضم لآلاف الباحثين الأمنيين الذين يستخدمون KaliGPT يومياً</p>
          <button
            onClick={() => navigate("/app")}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-[#FF3C00] hover:bg-[#e63600] text-white font-semibold text-lg transition-all hover:scale-105 shadow-xl shadow-[#FF3C00]/20"
          >
            <Terminal className="w-5 h-5" />
            افتح KaliGPT
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#FF3C00] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm text-white/50 font-mono">mr7.ai / KaliGPT</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-white/30">
            <button onClick={() => navigate("/privacy")} className="hover:text-white/60 transition-colors">سياسة الخصوصية</button>
            <button onClick={() => navigate("/terms")} className="hover:text-white/60 transition-colors">شروط الخدمة</button>
            <button onClick={() => navigate("/faq")} className="hover:text-white/60 transition-colors">FAQ</button>
            <button onClick={() => navigate("/roadmap")} className="hover:text-white/60 transition-colors">Roadmap</button>
            <button onClick={() => navigate("/contact")} className="hover:text-white/60 transition-colors">تواصل معنا</button>
          </div>
          <p className="text-xs text-white/20">© 2025 mr7.ai · For authorized security research only</p>
        </div>
      </footer>
    </div>
  );
}
