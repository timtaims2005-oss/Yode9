import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, ArrowLeft, Send, Github, Mail, MessageSquare, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", email: "", type: "general", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
  };

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

      <div className="max-w-5xl mx-auto px-4 pt-28 pb-20">
        <div className="text-center mb-14">
          <div className="text-xs font-mono text-[#FF3C00] mb-2">SUPPORT / CONTACT</div>
          <h1 className="text-4xl font-bold text-white mb-3">تواصل معنا</h1>
          <p className="text-white/40">فريقنا جاهز للرد على استفساراتك خلال 24 ساعة</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
              <Mail className="w-5 h-5 text-[#FF3C00] mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">البريد الإلكتروني</h3>
              <p className="text-xs text-white/40">support@mr7.ai</p>
              <p className="text-xs text-white/30 mt-1">الرد خلال 24 ساعة</p>
            </div>
            <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
              <Github className="w-5 h-5 text-[#FF3C00] mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">GitHub Issues</h3>
              <p className="text-xs text-white/40">للإبلاغ عن أخطاء تقنية</p>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-xs text-[#FF3C00] hover:underline mt-1 block">فتح Issue →</a>
            </div>
            <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
              <MessageSquare className="w-5 h-5 text-[#FF3C00] mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">مجتمع Discord</h3>
              <p className="text-xs text-white/40">تواصل مع مجتمع المطورين</p>
              <a href="#" className="text-xs text-[#FF3C00] hover:underline mt-1 block">انضم للسيرفر →</a>
            </div>

            <div className="p-4 rounded-xl border border-[#FF3C00]/20 bg-[#FF3C00]/5 text-xs text-white/50">
              <strong className="text-[#FF3C00] block mb-1">تنبيه أمني:</strong>
              للإبلاغ عن ثغرات أمنية في المنصة، تواصل معنا عبر: security@mr7.ai — نقدّر الإفصاح المسؤول.
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">تم إرسال رسالتك!</h3>
                <p className="text-white/40 text-sm mb-6">سنتواصل معك خلال 24 ساعة على البريد الإلكتروني المذكور.</p>
                <button
                  onClick={() => { setSent(false); setForm({ name: "", email: "", type: "general", message: "" }); }}
                  className="text-sm text-[#FF3C00] hover:underline"
                >
                  إرسال رسالة أخرى
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-medium">الاسم *</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="اسمك الكامل"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#FF3C00]/40 focus:bg-white/[0.05] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-medium">البريد الإلكتروني *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#FF3C00]/40 focus:bg-white/[0.05] transition-all"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-medium">نوع الاستفسار</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-[#111] text-white text-sm focus:outline-none focus:border-[#FF3C00]/40 transition-all"
                  >
                    <option value="general">استفسار عام</option>
                    <option value="bug">الإبلاغ عن خطأ (Bug Report)</option>
                    <option value="feature">اقتراح ميزة جديدة</option>
                    <option value="billing">مشكلة في الاشتراك والدفع</option>
                    <option value="partnership">طلب شراكة أو تعاون</option>
                    <option value="security">الإبلاغ عن ثغرة أمنية</option>
                    <option value="api">API والتكاملات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-medium">الرسالة *</label>
                  <textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="اشرح استفسارك أو مشكلتك بالتفصيل..."
                    rows={6}
                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#FF3C00]/40 focus:bg-white/[0.05] transition-all resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#FF3C00] hover:bg-[#e63600] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all"
                >
                  {sending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sending ? "جاري الإرسال..." : "إرسال الرسالة"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-white/20">
        © 2025 mr7.ai / KaliGPT
      </footer>
    </div>
  );
}
