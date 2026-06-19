import type React from "react";
import { motion } from "framer-motion";
import {
  Shield, Code2, Search, Zap, Bug, Network, Eye, Lock, Database, Globe, Terminal,
} from "lucide-react";

export const QUICK_PROMPTS: { icon: React.ElementType; label: string; prompt: string; color: string; tag: string }[] = [
  {
    icon: Shield, label: "تحليل ثغرة", color: "#e21227", tag: "VULN",
    prompt: "حلّل الثغرة الأمنية التالية وأعطني: نوعها، مستوى خطورتها (CVSS)، طرق الاستغلال، وكيفية المعالجة:",
  },
  {
    icon: Code2, label: "توليد Payload", color: "#f59e0b", tag: "PAYLOAD",
    prompt: "اكتب payload احترافي لاختبار اختراق تطبيق ويب، مع شرح كيفية عمله وسيناريو الاستخدام:",
  },
  {
    icon: Terminal, label: "سكريبت Bash", color: "#10b981", tag: "SCRIPT",
    prompt: "اكتب سكريبت Bash احترافي لعملية مسح الشبكة واكتشاف الأجهزة المتصلة مع تقرير مفصل:",
  },
  {
    icon: Search, label: "OSINT بحث", color: "#3b82f6", tag: "OSINT",
    prompt: "قم بعملية OSINT كاملة للهدف التالي واجمع كل المعلومات المتاحة من المصادر المفتوحة:",
  },
  {
    icon: Network, label: "Red Team Plan", color: "#a78bfa", tag: "RECON",
    prompt: "ضع خطة Red Team شاملة لاختبار أمان بنية تحتية، تشمل مراحل الاستطلاع والاستغلال والتقرير النهائي:",
  },
  {
    icon: Bug, label: "فحص الكود", color: "#f97316", tag: "AUDIT",
    prompt: "راجع الكود البرمجي التالي وحدد الثغرات الأمنية مع توصيات الإصلاح ومستوى الخطورة لكل ثغرة:",
  },
  {
    icon: Eye, label: "تحليل Malware", color: "#ec4899", tag: "MALWARE",
    prompt: "حلّل السلوك المشبوه التالي وحدد نوع البرمجية الخبيثة، وآليات الانتشار، وطرق الاكتشاف والتحييد:",
  },
  {
    icon: Lock, label: "Reverse Shell", color: "#06b6d4", tag: "SHELL",
    prompt: "اشرح تقنيات Reverse Shell المستخدمة في اختبارات الاختراق مع أمثلة عملية للبيئات المختلفة:",
  },
  {
    icon: Database, label: "SQL Injection", color: "#84cc16", tag: "SQLi",
    prompt: "اشرح تقنيات SQL Injection المتقدمة مع أمثلة عملية لاختبار الاختراق وطرق الوقاية منها:",
  },
  {
    icon: Globe, label: "تقرير أمني", color: "#8b5cf6", tag: "REPORT",
    prompt: "اكتب تقرير اختبار اختراق احترافي شامل يتضمن الملخص التنفيذي، النتائج، ومستويات الخطورة، والتوصيات:",
  },
  {
    icon: Zap, label: "استغلال CVE", color: "#fbbf24", tag: "EXPLOIT",
    prompt: "اشرح ثغرة CVE بالتفصيل مع كيفية عمل الاستغلال، الأنظمة المتأثرة، وخطوات المعالجة:",
  },
];

export function QuickPrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="w-full overflow-x-auto pb-1" style={{ maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)" }}>
      <div className="flex gap-2 min-w-min px-1">
        {QUICK_PROMPTS.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.button
              key={p.label}
              onClick={() => onPick(p.prompt)}
              className="flex-shrink-0 relative inline-flex items-center gap-2 rounded-xl overflow-hidden group"
              style={{
                padding: "7px 12px 7px 10px",
                background: `linear-gradient(135deg, ${p.color}14 0%, ${p.color}06 100%)`,
                border: `1px solid ${p.color}30`,
                boxShadow: `0 0 12px ${p.color}10, inset 0 1px 0 rgba(255,255,255,0.04)`,
                color: "rgba(255,255,255,0.75)",
              }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3, type: "spring", stiffness: 400, damping: 30 }}
              whileHover={{
                scale: 1.04, y: -1.5,
                boxShadow: `0 6px 20px ${p.color}25, 0 0 16px ${p.color}20`,
                borderColor: `${p.color}55`,
                color: "#fff",
              }}
              whileTap={{ scale: 0.96, y: 0 }}
            >
              {/* Shimmer sweep */}
              <motion.span
                className="absolute inset-y-0 pointer-events-none"
                style={{ width: 30, background: `linear-gradient(90deg,transparent,${p.color}20,transparent)` }}
                initial={{ x: "-100%" }}
                whileHover={{ x: "300%" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
              {/* Corner brackets */}
              <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l pointer-events-none" style={{ borderColor: `${p.color}50` }} />
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r pointer-events-none" style={{ borderColor: `${p.color}30` }} />

              {/* Tag badge */}
              <span className="text-[7px] font-black tracking-[0.15em] px-1 py-0.5 rounded font-mono flex-shrink-0"
                style={{ background: `${p.color}20`, color: p.color, border: `1px solid ${p.color}35` }}>
                {p.tag}
              </span>

              <Icon className="w-3 h-3 flex-shrink-0" style={{ color: p.color, filter: `drop-shadow(0 0 3px ${p.color}80)` }} />
              <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">{p.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
