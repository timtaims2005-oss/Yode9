import { useLocation } from "wouter";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
          <div className="text-xs font-mono text-[#FF3C00] mb-2">LEGAL / PRIVACY</div>
          <h1 className="text-4xl font-bold text-white mb-3">سياسة الخصوصية</h1>
          <p className="text-white/40 text-sm">آخر تحديث: يناير 2025</p>
        </div>

        <div className="space-y-8 text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. المعلومات التي نجمعها</h2>
            <p className="mb-3">عند استخدامك لـ KaliGPT، قد نجمع الأنواع التالية من البيانات:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong className="text-white/80">بيانات الجلسة:</strong> محتوى المحادثات يُرسل إلى خوادمنا لمعالجته عبر نموذج الذكاء الاصطناعي ولا يُخزَّن بعد انتهاء الجلسة.</li>
              <li><strong className="text-white/80">بيانات الاستخدام:</strong> إحصائيات مجهولة الهوية (عدد الطلبات، نوع النموذج المستخدم) لتحسين الخدمة.</li>
              <li><strong className="text-white/80">بيانات الحساب:</strong> عند إنشاء حساب: البريد الإلكتروني وبيانات الاشتراك فقط.</li>
              <li><strong className="text-white/80">بيانات تقنية:</strong> عنوان IP، نوع المتصفح، نظام التشغيل لأغراض الأمان ومنع الاحتيال.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. كيف نستخدم بياناتك</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>تشغيل الخدمة وتقديم الردود الذكية.</li>
              <li>تحسين نماذج الذكاء الاصطناعي وجودة الإجابات.</li>
              <li>منع الاستخدام المسيء والأنشطة غير القانونية.</li>
              <li>التواصل معك بشأن الحساب والاشتراك.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. تخزين البيانات وحمايتها</h2>
            <p className="text-sm mb-3">
              تُعالَج المحادثات في الوقت الفعلي ولا تُحفظ بشكل دائم على خوادمنا. يتم تشفير كل البيانات المنقولة بين متصفحك وخوادمنا باستخدام TLS 1.3.
            </p>
            <p className="text-sm">
              بيانات الحساب مشفرة في قاعدة البيانات باستخدام معايير التشفير الحديثة AES-256.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. مشاركة البيانات مع أطراف ثالثة</h2>
            <p className="text-sm mb-3">لا نبيع أو نؤجر بياناتك لأي طرف ثالث. نشارك البيانات فقط في الحالات التالية:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong className="text-white/80">OpenAI API:</strong> تُرسل رسائلك إلى OpenAI لمعالجتها وفق سياسة الخصوصية الخاصة بهم.</li>
              <li><strong className="text-white/80">الالتزامات القانونية:</strong> إذا طُلب منا قانونياً الكشف عن البيانات.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. حقوقك</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>حق الوصول: طلب نسخة من بياناتك الشخصية.</li>
              <li>حق التصحيح: تعديل البيانات غير الدقيقة.</li>
              <li>حق الحذف: طلب حذف حسابك وبياناتك.</li>
              <li>حق الاعتراض: الاعتراض على معالجة بياناتك لأغراض التسويق.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. ملفات تعريف الارتباط (Cookies)</h2>
            <p className="text-sm">
              نستخدم ملفات تعريف الارتباط الأساسية فقط لحفظ جلسة تسجيل الدخول وتفضيلات واجهة المستخدم. لا نستخدم ملفات تعريف الارتباط التتبعية أو الإعلانية.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. التواصل معنا</h2>
            <p className="text-sm">
              لأي استفسار حول سياسة الخصوصية، تواصل معنا عبر{" "}
              <button onClick={() => navigate("/contact")} className="text-[#FF3C00] hover:underline">صفحة التواصل</button>.
            </p>
          </section>
        </div>
      </div>

      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-white/20">
        © 2025 mr7.ai / KaliGPT · <button onClick={() => navigate("/terms")} className="hover:text-white/40">شروط الخدمة</button>
      </footer>
    </div>
  );
}
