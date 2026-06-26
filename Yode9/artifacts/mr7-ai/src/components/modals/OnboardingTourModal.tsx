import React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MessageSquare, Code2, Globe, Brain, Shield, Zap,
  Users, Cpu, ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";

const TOUR_STORAGE_KEY = "mr7-tour-dismissed-v2";

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  accentColor: string;
  badgeLabel?: string;
  badgeColor?: string;
  description: string;
  features: { icon: React.ElementType; label: string }[];
  premium?: boolean;
}

const SLIDES: Slide[] = [
  {
    id: "chat",
    title: "Chat Mode",
    subtitle: "محادثة ذكاء اصطناعي متقدمة",
    icon: MessageSquare,
    iconBg: "#1e1e1e",
    accentColor: "#6b7280",
    description: "تحدث مع نماذج ذكاء اصطناعي متقدمة. اطرح الأسئلة، احصل على شروحات، واستكشف أي موضوع.",
    features: [
      { icon: Cpu, label: "نماذج AI متعددة للاختيار" },
      { icon: Brain, label: "ردود مدركة للسياق" },
      { icon: Code2, label: "دعم المرفقات والملفات" },
      { icon: Zap, label: "Markdown وتمييز الكود" },
    ],
  },
  {
    id: "agent-ide",
    title: "Agent IDE",
    subtitle: "بيئة تطوير مدعومة بالذكاء الاصطناعي",
    icon: Code2,
    iconBg: "#2a1010",
    accentColor: "#e21227",
    badgeLabel: "Premium",
    badgeColor: "#e21227",
    description: "أنشئ وصحح وراجع الكود ببيئة التطوير المدعومة بالذكاء الاصطناعي. مثالية لباحثي الأمن والمطورين.",
    features: [
      { icon: Zap, label: "توليد كود بالذكاء الاصطناعي" },
      { icon: Zap, label: "تصحيح تلقائي" },
      { icon: Zap, label: "مراجعة وتحسين الكود" },
      { icon: Zap, label: "أدوات إخفاء الكود" },
    ],
    premium: true,
  },
  {
    id: "dark-web",
    title: "Dark Web Search",
    subtitle: "استخبارات مخفية عميقة",
    icon: Globe,
    iconBg: "#1a1030",
    accentColor: "#8b5cf6",
    badgeLabel: "Premium",
    badgeColor: "#8b5cf6",
    description: "ابحث في قواعد البيانات المسربة، مواقع .onion، والخدمات المخفية. وصول للاستخبارات غير المتاحة في محركات البحث العادية.",
    features: [
      { icon: Zap, label: "البحث في قواعد البيانات المسربة" },
      { icon: Zap, label: "الوصول لمواقع .onion" },
      { icon: Zap, label: "اكتشاف الخدمات المخفية" },
      { icon: Zap, label: "استخبارات الويب العميق" },
    ],
    premium: true,
  },
  {
    id: "council",
    title: "Council of 105 Brains",
    subtitle: "عقل جماعي متعدد الأبعاد",
    icon: Users,
    iconBg: "#0d1a2a",
    accentColor: "#3b82f6",
    badgeLabel: "Elite",
    badgeColor: "#3b82f6",
    description: "105 عقل ذكاء اصطناعي متخصص يعمل بالتوازي. كل عقل له شخصية وخبرة مختلفة، تُجمَع نتائجهم في تقرير موحد.",
    features: [
      { icon: Brain, label: "105 متخصص في وقت واحد" },
      { icon: Zap, label: "تركيب FUSION النهائي" },
      { icon: Shield, label: "وضع Red Team" },
      { icon: Cpu, label: "تحليل متعدد الزوايا" },
    ],
    premium: true,
  },
  {
    id: "arsenal",
    title: "Arsenal Hub",
    subtitle: "مركز إطلاق الأدوات",
    icon: Shield,
    iconBg: "#1a0808",
    accentColor: "#e21227",
    description: "18+ وحدة ذكاء اصطناعي متخصصة في مكان واحد. من JARVIS إلى RAGFlow إلى Parseltongue — أدوات للكل.",
    features: [
      { icon: Zap, label: "KaliAgent — وكيل استقصاء مستقل" },
      { icon: Cpu, label: "NEXUS Agent — 5 طبقات ذكاء" },
      { icon: Brain, label: "JARVIS — واجهة HUD متقدمة" },
      { icon: Code2, label: "18+ وحدة متخصصة" },
    ],
  },
  {
    id: "godmode",
    title: "Godmode",
    subtitle: "وضع القوة الكاملة",
    icon: Zap,
    iconBg: "#1a0808",
    accentColor: "#e21227",
    badgeLabel: "Elite",
    badgeColor: "#e21227",
    description: "14 وضع متقدم من Classic إلى Ultraplinian إلى Mythos. استدلال على أعلى مستوى بلا قيود.",
    features: [
      { icon: Brain, label: "Ultraplinian — 55 بطل بـ 5 مستويات" },
      { icon: Zap, label: "JIO REASON — o3-pro محسّن" },
      { icon: Shield, label: "Mythos — تحليل zero-day" },
      { icon: Cpu, label: "MAX OVERDRIVE — أقصى سياق" },
    ],
    premium: true,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingTourModal({ open, onClose }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [direction, setDirection] = useState(1);

  const slide = SLIDES[currentSlide];
  const SlideIcon = slide.icon;
  const total = SLIDES.length;

  function goTo(idx: number, dir: number) {
    setDirection(dir);
    setCurrentSlide(idx);
  }

  function handleClose() {
    if (dontShow) localStorage.setItem(TOUR_STORAGE_KEY, "1");
    onClose();
  }

  function handleNext() {
    if (currentSlide < total - 1) goTo(currentSlide + 1, 1);
    else handleClose();
  }

  function handlePrev() {
    if (currentSlide > 0) goTo(currentSlide - 1, -1);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: direction > 0 ? 30 : -30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction > 0 ? -30 : 30, scale: 0.97 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "#111", border: `1px solid ${slide.accentColor}30` }}
          >
            {/* Header with accent */}
            <div
              className="relative px-6 pt-8 pb-6 text-center"
              style={{
                background: `linear-gradient(180deg, ${slide.accentColor}18 0%, transparent 100%)`,
                borderBottom: `1px solid ${slide.accentColor}20`,
              }}
            >
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: slide.iconBg,
                  border: `2px solid ${slide.accentColor}40`,
                  boxShadow: `0 0 24px ${slide.accentColor}20`,
                }}
              >
                {(SlideIcon ? React.createElement(SlideIcon, { className: "w-8 h-8", style: { color: slide.accentColor } }) : null)}
              </div>

              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white">{slide.title}</h2>
                {slide.badgeLabel && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: `${slide.badgeColor}25`,
                      color: slide.badgeColor,
                      border: `1px solid ${slide.badgeColor}40`,
                    }}
                  >
                    {slide.badgeLabel}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{slide.description}</p>
            </div>

            {/* Features */}
            <div className="px-6 py-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">المميزات</p>
              <div className="grid grid-cols-2 gap-2">
                {slide.features.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ background: `${slide.accentColor}08`, border: `1px solid ${slide.accentColor}15` }}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: `${slide.accentColor}20` }}
                    >
                      <Zap className="w-3 h-3" style={{ color: slide.accentColor }} />
                    </div>
                    <span className="text-[12px] text-gray-300 leading-tight">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 pb-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > currentSlide ? 1 : -1)}
                  className="transition-all duration-200 rounded-full"
                  style={{
                    width: i === currentSlide ? 24 : 8,
                    height: 8,
                    background: i === currentSlide ? slide.accentColor : "#333",
                  }}
                />
              ))}
            </div>

            {/* Don't show again */}
            <div className="flex items-center justify-center gap-2 pb-3">
              <button
                onClick={() => setDontShow(!dontShow)}
                className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                <div
                  className="w-3.5 h-3.5 rounded border flex items-center justify-center"
                  style={{ borderColor: dontShow ? slide.accentColor : "#444", background: dontShow ? slide.accentColor : "transparent" }}
                >
                  {dontShow && <div className="w-2 h-2 rounded-sm bg-white" />}
                </div>
                Don't show this again
              </button>
            </div>

            {/* Navigation */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: "1px solid #1f1f1f" }}
            >
              <button
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {/* Trash — skip tour */}
              <button
                onClick={handleClose}
                className="p-2.5 rounded-xl text-gray-700 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{
                  background: currentSlide === total - 1 ? "#16a34a" : slide.accentColor,
                  boxShadow: `0 0 16px ${slide.accentColor}30`,
                }}
              >
                {currentSlide === total - 1 ? "Get Started" : "Next"}
                {currentSlide < total - 1 && <ChevronRight className="w-4 h-4" />}
                {currentSlide === total - 1 && <Zap className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useTourShouldShow() {
  return !localStorage.getItem(TOUR_STORAGE_KEY);
}
