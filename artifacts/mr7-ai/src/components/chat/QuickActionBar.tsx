import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, Terminal, Globe, Eye,
  Code2, Biohazard, Network, Database, FileText, Flame,
} from "lucide-react";

interface QuickAction {
  tag: string;
  label: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  prompt: string;
}

const ACTIONS: QuickAction[] = [
  {
    tag: "VULN",
    label: "تحليل ثغرة",
    icon: Shield,
    color: "#e21227",
    glow: "rgba(226,18,39,0.55)",
    prompt:
      "قم بتحليل هذه الثغرة الأمنية بشكل تفصيلي: اشرح آلية عملها، درجة الخطورة (CVSS)، المتجهات المحتملة للاستغلال، التأثير على الأنظمة، وخطوات المعالجة والتخفيف. الثغرة: ",
  },
  {
    tag: "PAYLOAD",
    label: "توليد Payload",
    icon: Zap,
    color: "#f97316",
    glow: "rgba(249,115,22,0.55)",
    prompt:
      "قم بتوليد payload احترافي لاختبار الاختراق مع شرح مفصّل لكل مكوّن. حدد نوع الـ payload، بيئة التشغيل المستهدفة، وتقنيات التمويه المقترحة. الهدف: ",
  },
  {
    tag: "SCRIPT",
    label: "سكريبت Bash",
    icon: Terminal,
    color: "#22c55e",
    glow: "rgba(34,197,94,0.55)",
    prompt:
      "اكتب سكريبت Bash احترافي وقابل للتنفيذ مع معالجة كاملة للأخطاء، تعليقات توضيحية بالعربية، وخيارات سطر الأوامر. المهمة: ",
  },
  {
    tag: "OSINT",
    label: "بحث OSINT",
    icon: Globe,
    color: "#00e5ff",
    glow: "rgba(0,229,255,0.55)",
    prompt:
      "أجرِ بحثاً شاملاً باستخدام أساليب OSINT المتقدمة على الهدف التالي. حدد مصادر المعلومات، الأدوات المناسبة (Shodan, Maltego, theHarvester, إلخ)، والبيانات القابلة للاستخراج. الهدف: ",
  },
  {
    tag: "RECON",
    label: "Red Team Plan",
    icon: Eye,
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.55)",
    prompt:
      "ضع خطة استطلاع Red Team كاملة ومرحلية تشمل: الاستطلاع السلبي والنشط، رسم خريطة الشبكة، تحديد نقاط الدخول، وأدوات العمل لكل مرحلة. البيئة المستهدفة: ",
  },
  {
    tag: "AUDIT",
    label: "فحص الكود",
    icon: Code2,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.55)",
    prompt:
      "أجرِ مراجعة أمنية شاملة للكود التالي. ابحث عن الثغرات الأمنية (OWASP Top 10)، الكود الضعيف، المدخلات غير المحققة، وقدّم توصيات التحسين مع مقتطفات الكود المُصلَح:\n\n",
  },
  {
    tag: "MALWARE",
    label: "تحليل Malware",
    icon: Biohazard,
    color: "#ec4899",
    glow: "rgba(236,72,153,0.55)",
    prompt:
      "حلّل هذا الكود المشبوه أو العيّنة البرمجية: حدد نوع البرمجية الخبيثة، آلية العمل، التقنيات المستخدمة (persistence, evasion, C2)، IOCs، ومقترحات التعامل معها. العيّنة: ",
  },
  {
    tag: "SHELL",
    label: "Reverse Shell",
    icon: Network,
    color: "#84cc16",
    glow: "rgba(132,204,22,0.55)",
    prompt:
      "أنشئ أوامر Reverse Shell لبيئات متعددة (Linux, Windows, Python, PHP, PowerShell) مع شرح كيفية الاستخدام وتقنيات تجاوز الـ Firewall وAntivirus. IP المستمع: ",
  },
  {
    tag: "SQLi",
    label: "SQL Injection",
    icon: Database,
    color: "#6366f1",
    glow: "rgba(99,102,241,0.55)",
    prompt:
      "اشرح واستعرض تقنيات SQL Injection المتقدمة (Error-based, Blind, Time-based, Out-of-band) مع payloads قابلة للتجربة وكيفية استخراج البيانات. نقطة الضعف: ",
  },
  {
    tag: "REPORT",
    label: "تقرير أمني",
    icon: FileText,
    color: "#0ea5e9",
    glow: "rgba(14,165,233,0.55)",
    prompt:
      "أنشئ تقريراً أمنياً احترافياً ومفصّلاً يشمل: ملخص تنفيذي، نطاق الاختبار، المنهجية، النتائج مصنّفةً حسب الخطورة، التوصيات، وخطة المعالجة. بيانات الاختبار: ",
  },
  {
    tag: "EXPLOIT",
    label: "استغلال CVE",
    icon: Flame,
    color: "#dc2626",
    glow: "rgba(220,38,38,0.55)",
    prompt:
      "حلّل هذا الـ CVE بعمق: اشرح آلية الثغرة، كود الاستغلال (PoC)، الأنظمة المتأثرة، CVSS Score، وخطوات الاستغلال خطوة بخطوة في بيئة اختبار. CVE: ",
  },
];

interface Props {
  onInsert: (text: string) => void;
}

export function QuickActionBar({ onInsert }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [shimmerIdx, setShimmerIdx] = useState<number | null>(null);
  const shimmerTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  function handleEnter(i: number) {
    setHoveredIdx(i);
    if (!shimmerTimers.current.has(i)) {
      const t = setTimeout(() => {
        shimmerTimers.current.delete(i);
      }, 600);
      shimmerTimers.current.set(i, t);
      setShimmerIdx(i);
    }
  }

  function handleLeave() {
    setHoveredIdx(null);
    setShimmerIdx(null);
  }

  function handleClick(action: QuickAction) {
    onInsert(action.prompt);
    setShimmerIdx(null);
  }

  return (
    <div className="relative w-full px-2 pb-1 select-none">
      {/* fade left */}
      <div
        className="pointer-events-none absolute left-2 top-0 bottom-1 w-10 z-10"
        style={{
          background: "linear-gradient(to right, #080808 0%, transparent 100%)",
        }}
      />
      {/* fade right */}
      <div
        className="pointer-events-none absolute right-2 top-0 bottom-1 w-10 z-10"
        style={{
          background: "linear-gradient(to left, #080808 0%, transparent 100%)",
        }}
      />

      {/* scrollable row */}
      <div
        className="flex gap-2 overflow-x-auto scrollbar-none py-1 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {ACTIONS.map((action, i) => {
          const Icon = action.icon;
          const isHovered = hoveredIdx === i;

          return (
            <motion.button
              key={action.tag}
              onMouseEnter={() => handleEnter(i)}
              onMouseLeave={handleLeave}
              onClick={() => handleClick(action)}
              animate={{
                y: isHovered ? -3 : 0,
                boxShadow: isHovered
                  ? `0 4px 20px ${action.glow}, 0 0 0 1px ${action.color}`
                  : `0 0 0 1px ${action.color}44`,
              }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative flex-shrink-0 flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-md cursor-pointer overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${action.color}14 0%, #16161699 100%)`,
                border: `1px solid ${action.color}66`,
                minWidth: "max-content",
              }}
            >
              {/* shimmer sweep */}
              <AnimatePresence>
                {shimmerIdx === i && (
                  <motion.span
                    key="shimmer"
                    className="pointer-events-none absolute inset-0 z-10"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: "easeInOut" }}
                    style={{
                      background: `linear-gradient(105deg, transparent 30%, ${action.color}55 50%, transparent 70%)`,
                    }}
                  />
                )}
              </AnimatePresence>

              {/* colored tag badge */}
              <span
                className="flex-shrink-0 flex items-center justify-center h-5 px-1.5 rounded text-[9px] font-black tracking-widest z-20"
                style={{
                  background: action.color,
                  color: "#fff",
                  fontFamily: "ui-monospace, monospace",
                  letterSpacing: "0.08em",
                }}
              >
                {action.tag}
              </span>

              {/* icon */}
              {React.createElement(Icon as React.FC<React.SVGProps<SVGSVGElement>>, { className: "flex-shrink-0 z-20", style: { color: action.color, width: 13, height: 13 }, strokeWidth: 2.2 })}

              {/* arabic label */}
              <span
                className="flex-shrink-0 text-[12px] font-semibold z-20 whitespace-nowrap"
                style={{ color: "#e5e5e5", fontFamily: "system-ui, sans-serif" }}
              >
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
