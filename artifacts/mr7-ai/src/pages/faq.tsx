import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, ArrowLeft, ChevronDown } from "lucide-react";

const faqData = [
  {
    category: "عام",
    items: [
      {
        q: "ما هو KaliGPT؟",
        a: "KaliGPT هو مساعد ذكاء اصطناعي متخصص في الأمن السيبراني، مبني فوق نماذج OpenAI مع قاعدة معرفية مخصصة تشمل تقنيات الهجوم والدفاع، أدوات OSINT، وتحليل الثغرات.",
      },
      {
        q: "هل KaliGPT مجاني؟",
        a: "نعم، يوجد خطة مجانية تتيح 50,000 رمز يومياً مع الوصول للنماذج الأساسية. للوصول الكامل لترسانة Arsenal وNexus وCouncil Mode، تتوفر خطط Pro وElite.",
      },
      {
        q: "هل يعمل KaliGPT على الهاتف؟",
        a: "نعم، الواجهة متجاوبة بالكامل وتعمل على جميع الأجهزة. يتوفر تطبيق جوال مخطط له في الإصدارات القادمة.",
      },
      {
        q: "ما اللغات التي يدعمها KaliGPT؟",
        a: "يدعم KaliGPT العربية والإنجليزية بشكل أساسي مع قدرة على التعامل مع أي لغة يدعمها النموذج اللغوي.",
      },
    ],
  },
  {
    category: "تقني",
    items: [
      {
        q: "ما الفرق بين KaliGPT وChatGPT؟",
        a: "ChatGPT نموذج عام يتحفظ في الإجابة على الأسئلة الأمنية. KaliGPT مخصص للمختصين الأمنيين ويمتلك قاعدة معرفية بالأدوات الهجومية والدفاعية، وأوضاع متخصصة كـ Red Team وCouncil وGodMode.",
      },
      {
        q: "ما هو Arsenal Hub؟",
        a: "Arsenal Hub هو مجموعة من +70 أداة وحدة متخصصة مدمجة في KaliGPT، تشمل JARVIS (مساعد ذكي)، Parseltongue (أداة الغموض)، RAGFlow (قاعدة معرفة)، NEXUS (وكيل مستقل)، وأدوات OSINT متقدمة.",
      },
      {
        q: "ما هو Council Mode؟",
        a: "Council Mode يُشغّل 6 نماذج ذكاء اصطناعي متخصصة بالتوازي على نفس المسألة: مخترق، محقق جنائي رقمي، مطور، محلل، مدافع، ومنسّق — ثم يجمع إجاباتهم في تحليل شامل.",
      },
      {
        q: "هل يمكن توصيل KaliGPT بـ API الخاص بي؟",
        a: "نعم، يوجد في خطة Elite إمكانية الوصول عبر API مع توثيق تقني كامل. يمكنك دمج KaliGPT في أدواتك الأمنية الحالية.",
      },
      {
        q: "هل الترمينال التفاعلي آمن؟",
        a: "الترمينال يعمل في بيئة معزولة (Sandbox) على خوادمنا. لا يمكنه الوصول لنظامك المحلي. هو مخصص لتجربة الأوامر والأكواد في بيئة آمنة.",
      },
    ],
  },
  {
    category: "أمان وقانوني",
    items: [
      {
        q: "هل استخدام KaliGPT قانوني؟",
        a: "KaliGPT قانوني عند استخدامه لأغراض بحثية وتعليمية وفي بيئات اختبار مرخصة. يحظر استخدامه لمهاجمة أنظمة دون إذن مسبق من أصحابها.",
      },
      {
        q: "هل بياناتي وأسئلتي تُحفظ؟",
        a: "المحادثات تُعالَج في الوقت الفعلي ولا تُخزَّن بشكل دائم. إحصائيات الاستخدام مجهولة الهوية تُحفظ لتحسين الخدمة. راجع سياسة الخصوصية للمزيد.",
      },
      {
        q: "ماذا يحدث إذا أسأت استخدام الخدمة؟",
        a: "يتم تعليق الحساب فوراً وحظره نهائياً عند اكتشاف أي استخدام ضار. نتعاون مع الجهات القانونية عند الضرورة.",
      },
    ],
  },
  {
    category: "الاشتراكات",
    items: [
      {
        q: "ما الفرق بين الخطط المختلفة؟",
        a: "Free: 50k رمز يومياً + نماذج أساسية. Pro ($19/شهر): 500k رمز + Arsenal كامل + OSINT متقدم. Elite ($49/شهر): رموز غير محدودة + Council Mode + API Access + دعم أولوية.",
      },
      {
        q: "كيف يمكنني ترقية اشتراكي؟",
        a: 'اضغط على "Upgrade" في التطبيق أو زر قسم Pricing. تُقبل جميع بطاقات الائتمان وPayPal.',
      },
      {
        q: "هل يمكن إلغاء الاشتراك في أي وقت؟",
        a: "نعم، يمكنك إلغاء الاشتراك في أي وقت دون رسوم إضافية. ستبقى الميزات المدفوعة متاحة حتى نهاية فترة الاشتراك الحالية.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-white/5 rounded-xl overflow-hidden transition-all ${open ? "bg-white/[0.03]" : "bg-white/[0.01] hover:bg-white/[0.02]"}`}>
      <button
        className="w-full flex items-center justify-between p-5 text-left gap-4"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-white/80 text-sm">{q}</span>
        <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-white/50 leading-relaxed border-t border-white/5 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Inter',sans-serif]">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> الرئيسية
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#FF3C00] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold">KaliGPT</span>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <div className="text-center mb-14">
          <div className="text-xs font-mono text-[#FF3C00] mb-2">SUPPORT / FAQ</div>
          <h1 className="text-4xl font-bold text-white mb-3">الأسئلة الشائعة</h1>
          <p className="text-white/40">كل ما تحتاج معرفته عن KaliGPT</p>
        </div>

        <div className="space-y-10">
          {faqData.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono font-bold text-[#FF3C00] uppercase tracking-widest">{section.category}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
          <p className="text-white/50 text-sm mb-3">لم تجد إجابة لسؤالك؟</p>
          <button
            onClick={() => navigate("/contact")}
            className="px-6 py-2.5 rounded-lg bg-[#FF3C00] hover:bg-[#e63600] text-white text-sm font-medium transition-colors"
          >
            تواصل مع فريق الدعم
          </button>
        </div>
      </div>

      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-white/20">
        © 2025 mr7.ai / KaliGPT
      </footer>
    </div>
  );
}
