import { useLocation } from "wouter";
import { Shield, ArrowLeft, AlertTriangle } from "lucide-react";

export default function TermsPage() {
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
        <div className="mb-10">
          <div className="text-xs font-mono text-[#FF3C00] mb-2">LEGAL / TERMS</div>
          <h1 className="text-4xl font-bold text-white mb-3">شروط الخدمة</h1>
          <p className="text-white/40 text-sm">آخر تحديث: يناير 2025</p>
        </div>

        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 mb-10">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200/70">
            <strong className="text-yellow-400">تحذير هام:</strong> KaliGPT مخصص للاستخدام القانوني فقط في بيئات اختبار مرخصة. أي استخدام لأغراض هجومية غير مرخصة يُعدّ انتهاكاً صريحاً لهذه الشروط وقد يُعرّضك للمسؤولية القانونية.
          </p>
        </div>

        <div className="space-y-8 text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. قبول الشروط</h2>
            <p className="text-sm">
              باستخدامك لمنصة KaliGPT (mr7.ai)، فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق على أي بند من هذه الشروط، يرجى التوقف عن استخدام الخدمة فوراً.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. نطاق الخدمة</h2>
            <p className="text-sm mb-3">KaliGPT هي منصة ذكاء اصطناعي متخصصة في الأمن السيبراني تُقدَّم للفئات التالية:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>باحثو الأمن السيبراني المرخصون.</li>
              <li>مختبرو الاختراق (Penetration Testers) بموجب عقود رسمية.</li>
              <li>طلاب وأكاديميو الأمن المعلوماتي لأغراض تعليمية.</li>
              <li>فرق Red Team & Blue Team في بيئاتهم الخاصة.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. الاستخدام المحظور</h2>
            <p className="text-sm mb-3">يُحظر صراحةً استخدام KaliGPT في:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>شنّ هجمات إلكترونية على أنظمة دون إذن صريح من أصحابها.</li>
              <li>التنصت أو التجسس غير القانوني على الاتصالات والبيانات.</li>
              <li>إنشاء أو نشر برمجيات خبيثة بنية الإضرار بالآخرين.</li>
              <li>انتهاك قوانين الخصوصية وحماية البيانات المعمول بها.</li>
              <li>أي نشاط يخالف القوانين المحلية والدولية.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. مسؤولية المستخدم</h2>
            <p className="text-sm mb-3">
              أنت المسؤول الوحيد عن أي إجراء تتخذه بناءً على مخرجات KaliGPT. تُقرّ بأن:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>لديك الصلاحية القانونية اللازمة لأي اختبار أمني تُجريه.</li>
              <li>أنت ملزم بالحصول على إذن كتابي قبل اختبار أي نظام لا تملكه.</li>
              <li>mr7.ai غير مسؤولة عن أي أضرار ناتجة عن سوء استخدام الخدمة.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. الملكية الفكرية</h2>
            <p className="text-sm">
              جميع حقوق الملكية الفكرية لمنصة KaliGPT، بما يشمل الكود المصدري، النماذج المخصصة، وقواعد المعرفة الأمنية، محفوظة لـ mr7.ai. يُمنح المستخدمون ترخيصاً محدوداً غير قابل للتحويل لاستخدام الخدمة.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. إخلاء المسؤولية</h2>
            <p className="text-sm">
              تُقدَّم الخدمة "كما هي" دون ضمانات صريحة أو ضمنية. لا تتحمل mr7.ai المسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام أو عدم القدرة على استخدام الخدمة.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. تعليق الخدمة وإنهاؤها</h2>
            <p className="text-sm">
              نحتفظ بحق تعليق أو إنهاء وصول أي مستخدم يخالف هذه الشروط دون إشعار مسبق، مع الاحتفاظ بالحق في اتخاذ الإجراءات القانونية المناسبة.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. التعديلات</h2>
            <p className="text-sm">
              نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين المسجلين بأي تغييرات جوهرية عبر البريد الإلكتروني.
            </p>
          </section>
        </div>
      </div>

      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-white/20">
        © 2025 mr7.ai / KaliGPT · <button onClick={() => navigate("/privacy")} className="hover:text-white/40">سياسة الخصوصية</button>
      </footer>
    </div>
  );
}
